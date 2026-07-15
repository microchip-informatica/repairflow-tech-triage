
ALTER TABLE public.tecnicos
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed default admin user "admin"/"admin" (bcrypt via pgcrypto, compatible with bcryptjs)
INSERT INTO public.tecnicos (username, nombre, password_hash, approved, is_admin)
VALUES ('admin', 'Administrador', crypt('admin', gen_salt('bf', 10)), true, true)
ON CONFLICT DO NOTHING;

-- Ensure existing rows without conflict (username has no unique constraint yet?); dedupe defensively
UPDATE public.tecnicos SET approved = true, is_admin = true WHERE username = 'admin';
