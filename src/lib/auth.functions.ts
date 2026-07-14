import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const sessionConfig = () => ({
  password: process.env.SESSION_SECRET!,
  name: "repairflow-session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
});

type SessionData = { tecnicoId?: string };

export type TecnicoSession = {
  id: string;
  username: string;
  nombre: string;
} | null;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const LoginInput = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

const RegisterInput = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Usuario inválido"),
  nombre: z.string().trim().min(1).max(100),
  password: z.string().min(6).max(200),
});

export const registerTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RegisterInput.parse(d))
  .handler(async ({ data }): Promise<TecnicoSession> => {
    const admin = await getAdmin();
    const username = data.username.toLowerCase();
    const { data: existing } = await admin
      .from("tecnicos")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("Ese usuario ya está en uso");

    const password_hash = await bcrypt.hash(data.password, 10);
    const { data: created, error } = await admin
      .from("tecnicos")
      .insert({ username, nombre: data.nombre, password_hash })
      .select("id, username, nombre")
      .single();
    if (error || !created) throw new Error(error?.message ?? "No se pudo crear el técnico");

    const session = await useSession<SessionData>(sessionConfig());
    await session.update({ tecnicoId: created.id });
    return { id: created.id, username: created.username, nombre: created.nombre };
  });

export const loginTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }): Promise<TecnicoSession> => {
    const admin = await getAdmin();
    const { data: tec } = await admin
      .from("tecnicos")
      .select("id, username, nombre, password_hash")
      .eq("username", data.username.trim().toLowerCase())
      .maybeSingle();
    if (!tec) throw new Error("Usuario o contraseña incorrectos");

    const ok = await bcrypt.compare(data.password, tec.password_hash);
    if (!ok) throw new Error("Usuario o contraseña incorrectos");

    const session = await useSession<SessionData>(sessionConfig());
    await session.update({ tecnicoId: tec.id });
    return { id: tec.id, username: tec.username, nombre: tec.nombre };
  });

export const logoutTecnico = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const getCurrentTecnico = createServerFn({ method: "GET" }).handler(
  async (): Promise<TecnicoSession> => {
    const session = await useSession<SessionData>(sessionConfig());
    const id = session.data.tecnicoId;
    if (!id) return null;
    const admin = await getAdmin();
    const { data: tec } = await admin
      .from("tecnicos")
      .select("id, username, nombre")
      .eq("id", id)
      .maybeSingle();
    return tec ?? null;
  },
);
