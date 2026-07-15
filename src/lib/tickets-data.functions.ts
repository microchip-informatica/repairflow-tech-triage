import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "ticket-photos";

// --------- Schemas ---------

const CreateTicketInput = z.object({
  cliente: z.string().trim().min(1).max(120),
  telefono: z.string().trim().max(40).optional().nullable(),
  descripcion: z.string().trim().min(1).max(4000),
  detalleTecnico: z.string().trim().max(4000).optional().nullable(),
  fotoBase64: z.string().max(15_000_000).optional().nullable(),
  fotoExt: z.string().max(8).optional().nullable(),
  fotoMime: z.string().max(80).optional().nullable(),
  withAi: z.boolean().default(false),
});

const UpdateTicketInput = z.object({
  id: z.string().uuid(),
  estado: z.enum(["pendiente", "en curso", "terminado"]).optional(),
  notas: z.string().max(4000).nullable().optional(),
  descripcion: z.string().trim().min(1).max(4000).optional(),
  detalleTecnico: z.string().trim().max(4000).nullable().optional(),
  urgencia: z.enum(["Alta", "Media", "Baja"]).nullable().optional(),
});

const RegenerateInput = z.object({
  id: z.string().uuid(),
  descripcion: z.string().trim().min(1).max(4000),
  detalleTecnico: z.string().trim().max(4000).nullable().optional(),
});

const PhotoInput = z.object({ path: z.string().min(1).max(500) });

// --------- Ticket row shape returned to the client ---------

export type TicketRow = {
  id: string;
  cliente: string;
  telefono: string | null;
  descripcion: string;
  foto_url: string | null;
  categoria: string | null;
  urgencia: string | null;
  titulo: string | null;
  causas: string[] | null;
  recomendacion: string | null;
  coste_estimado: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  tecnico_id: string | null;
  tecnico_nombre: string | null;
};

function toTicketRow(row: Record<string, unknown>): TicketRow {
  return {
    ...(row as unknown as TicketRow),
    causas: Array.isArray(row.causas) ? (row.causas as string[]) : null,
  };
}


// --------- Helpers ---------

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// --------- Server functions ---------

export const listTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { requireTecnico } = await import("./session.server");
  const { admin } = await requireTecnico();
  const { data, error } = await admin
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los tickets");
  return (data ?? []) as TicketRow[];
});

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateTicketInput.parse(d))
  .handler(async ({ data }): Promise<{ ticket: TicketRow }> => {
    const { requireTecnico } = await import("./session.server");
    const { admin, tecnicoId, tecnicoNombre } = await requireTecnico();

    // Upload photo if provided.
    let fotoPath: string | null = null;
    if (data.fotoBase64) {
      const bytes = decodeBase64(data.fotoBase64);
      const ext = (data.fotoExt || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "jpg";
      fotoPath = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(fotoPath, bytes, {
          contentType: data.fotoMime || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw new Error("No se pudo subir la foto");
    }

    // Optional AI diagnosis.
    let diag = null as null | Awaited<ReturnType<typeof import("./ai.server").runAiDiagnostico>>;
    if (data.withAi) {
      const { runAiDiagnostico } = await import("./ai.server");
      diag = await runAiDiagnostico(data.descripcion);
    }

    const { data: inserted, error } = await admin
      .from("tickets")
      .insert({
        cliente: data.cliente,
        telefono: data.telefono || null,
        descripcion: data.descripcion,
        foto_url: fotoPath,
        categoria: diag?.categoria ?? null,
        urgencia: diag?.urgencia ?? null,
        titulo: diag?.titulo ?? null,
        causas: diag?.causas ?? null,
        recomendacion: diag?.recomendacion ?? null,
        coste_estimado: diag?.coste_estimado ?? null,
        estado: "pendiente",
        tecnico_id: tecnicoId,
        tecnico_nombre: tecnicoNombre,
      })
      .select("*")
      .single();
    if (error || !inserted) throw new Error("No se pudo crear el ticket");
    return { ticket: inserted as TicketRow };
  });

export const updateTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateTicketInput.parse(d))
  .handler(async ({ data }): Promise<TicketRow> => {
    const { requireTecnico } = await import("./session.server");
    const { admin, tecnicoId, tecnicoNombre } = await requireTecnico();

    const patch: {
      estado?: string;
      notas?: string | null;
      descripcion?: string;
      urgencia?: string | null;
      tecnico_id: string;
      tecnico_nombre: string;
    } = {
      tecnico_id: tecnicoId,
      tecnico_nombre: tecnicoNombre,
    };
    if (data.estado !== undefined) patch.estado = data.estado;
    if (data.notas !== undefined) patch.notas = data.notas || null;
    if (data.descripcion !== undefined) patch.descripcion = data.descripcion;
    if (data.urgencia !== undefined) patch.urgencia = data.urgencia;


    const { data: updated, error } = await admin
      .from("tickets")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error || !updated) throw new Error("No se pudo guardar el ticket");
    return updated as TicketRow;
  });

export const regenerateDiagnostico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RegenerateInput.parse(d))
  .handler(async ({ data }): Promise<TicketRow> => {
    const { requireTecnico } = await import("./session.server");
    const { admin, tecnicoId, tecnicoNombre } = await requireTecnico();
    const { runAiDiagnostico } = await import("./ai.server");

    const diag = await runAiDiagnostico(data.descripcion);
    const { data: updated, error } = await admin
      .from("tickets")
      .update({
        categoria: diag.categoria,
        urgencia: diag.urgencia,
        titulo: diag.titulo,
        causas: diag.causas,
        recomendacion: diag.recomendacion,
        coste_estimado: diag.coste_estimado,
        descripcion: data.descripcion,
        tecnico_id: tecnicoId,
        tecnico_nombre: tecnicoNombre,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error || !updated) throw new Error("No se pudo generar el diagnóstico");
    return updated as TicketRow;
  });

export const getTicketPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PhotoInput.parse(d))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { requireTecnico } = await import("./session.server");
    const { admin } = await requireTecnico();
    const { data: signed, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);
    if (error) return { url: null };
    return { url: signed?.signedUrl ?? null };
  });
