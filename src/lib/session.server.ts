// Server-only: session helper for the custom técnico login.
import { useSession } from "@tanstack/react-start/server";

type SessionData = { tecnicoId?: string };

const sessionConfig = () => ({
  password: process.env.SESSION_SECRET!,
  name: "repairflow-session",
  maxAge: 60 * 60 * 24 * 30,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
});

export async function requireTecnico() {
  const session = await useSession<SessionData>(sessionConfig());
  const id = session.data.tecnicoId;
  if (!id) throw new Error("No autenticado");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tecnicos")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Sesión inválida");

  return { admin: supabaseAdmin, tecnicoId: data.id, tecnicoNombre: data.nombre };
}
