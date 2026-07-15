// Server-only helper that runs the AI diagnostic. Never import from client code.

export type Diagnostico = {
  categoria: string;
  urgencia: "Alta" | "Media" | "Baja";
  titulo: string;
  causas: string[];
  recomendacion: string;
  coste_estimado: string;
};

const SYSTEM_PROMPT = `Eres un técnico informático senior. Analiza el problema del cliente y responde ÚNICAMENTE con JSON válido con esta estructura: {categoria: 'Hardware'|'Software'|'Red'|'Periféricos'|'Mantenimiento', urgencia: 'Alta'|'Media'|'Baja', titulo: string máx 60 caracteres, causas: array de 2-4 strings, recomendacion: string máx 200 caracteres, coste_estimado: string formato 'XX-XX€' realista para España}. Urgencia Alta = no arranca, posible pérdida de datos o riesgo de daño mayor. Media = funciona con fallos. Baja = estético o preventivo.`;

function parseDiagnostico(raw: string): Diagnostico {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  const parsed = JSON.parse(text);
  return {
    categoria: String(parsed.categoria ?? "Software"),
    urgencia: (["Alta", "Media", "Baja"].includes(parsed.urgencia) ? parsed.urgencia : "Media") as Diagnostico["urgencia"],
    titulo: String(parsed.titulo ?? "Incidencia técnica").slice(0, 60),
    causas: Array.isArray(parsed.causas) ? parsed.causas.map(String) : [],
    recomendacion: String(parsed.recomendacion ?? "").slice(0, 200),
    coste_estimado: String(parsed.coste_estimado ?? "—"),
  };
}

export async function runAiDiagnostico(
  descripcion: string,
  detalleTecnico?: string | null,
): Promise<Diagnostico> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Falta LOVABLE_API_KEY");

  const userContent = detalleTecnico && detalleTecnico.trim()
    ? `Descripción del problema (cliente):\n${descripcion}\n\nDetalle técnico (observaciones del técnico):\n${detalleTecnico}`
    : descripcion;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Demasiadas solicitudes, prueba de nuevo en un momento.");
  if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Error IA (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";

  try {
    return parseDiagnostico(content);
  } catch {
    return {
      categoria: "Software",
      urgencia: "Media",
      titulo: descripcion.slice(0, 60),
      causas: ["No se pudo analizar automáticamente"],
      recomendacion: "Revisar manualmente por un técnico.",
      coste_estimado: "30-80€",
    };
  }
}
