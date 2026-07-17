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
    sameSite: "none" as const,
    path: "/",
  },
});

type SessionData = { tecnicoId?: string };

export type TecnicoSession = {
  id: string;
  username: string;
  nombre: string;
  is_admin: boolean;
} | null;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requireAdmin() {
  const session = await useSession<SessionData>(sessionConfig());
  const id = session.data.tecnicoId;
  if (!id) throw new Error("No autenticado");
  const admin = await getAdmin();
  const { data: tec } = await admin
    .from("tecnicos")
    .select("id, is_admin, approved")
    .eq("id", id)
    .maybeSingle();
  if (!tec || !tec.approved || !tec.is_admin) throw new Error("No autorizado");
  return admin;
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
  .handler(async ({ data }): Promise<{ pending: true }> => {
    const admin = await getAdmin();
    const username = data.username.toLowerCase();
    const { data: existing } = await admin
      .from("tecnicos")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("Ese usuario ya está en uso");

    const password_hash = await bcrypt.hash(data.password, 10);
    const { error } = await admin
      .from("tecnicos")
      .insert({ username, nombre: data.nombre, password_hash, approved: false, is_admin: false });
    if (error) throw new Error(error.message ?? "No se pudo crear el técnico");

    // No session on register: must wait for admin approval.
    return { pending: true };
  });

export const loginTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }): Promise<TecnicoSession> => {
    const admin = await getAdmin();
    const { data: tec } = await admin
      .from("tecnicos")
      .select("id, username, nombre, password_hash, approved, is_admin")
      .eq("username", data.username.trim().toLowerCase())
      .maybeSingle();
    if (!tec) throw new Error("Usuario o contraseña incorrectos");

    const ok = await bcrypt.compare(data.password, tec.password_hash);
    if (!ok) throw new Error("Usuario o contraseña incorrectos");

    if (!tec.approved) {
      throw new Error("Tu cuenta está pendiente de aprobación por un administrador");
    }

    const session = await useSession<SessionData>(sessionConfig());
    await session.update({ tecnicoId: tec.id });
    return { id: tec.id, username: tec.username, nombre: tec.nombre, is_admin: tec.is_admin };
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
      .select("id, username, nombre, is_admin, approved")
      .eq("id", id)
      .maybeSingle();
    if (!tec || !tec.approved) return null;
    return { id: tec.id, username: tec.username, nombre: tec.nombre, is_admin: tec.is_admin };
  },
);

// ---------- Admin management ----------

export type TecnicoRow = {
  id: string;
  username: string;
  nombre: string;
  approved: boolean;
  is_admin: boolean;
  created_at: string;
};

export const listTecnicos = createServerFn({ method: "GET" }).handler(
  async (): Promise<TecnicoRow[]> => {
    const admin = await requireAdmin();
    const { data, error } = await admin
      .from("tecnicos")
      .select("id, username, nombre, approved, is_admin, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

const IdInput = z.object({ id: z.string().uuid() });

export const approveTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const { error } = await admin.from("tecnicos").update({ approved: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const { error } = await admin.from("tecnicos").update({ approved: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAdminTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_admin: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const { error } = await admin
      .from("tecnicos")
      .update({ is_admin: data.is_admin })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTecnico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    // Prevent deleting the last admin
    const { data: tec } = await admin
      .from("tecnicos")
      .select("username")
      .eq("id", data.id)
      .maybeSingle();
    if (tec?.username === "admin") throw new Error("No puedes eliminar al administrador principal");
    const { error } = await admin.from("tecnicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTecnicoPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const password_hash = await bcrypt.hash(data.password, 10);
    const { error } = await admin
      .from("tecnicos")
      .update({ password_hash })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
