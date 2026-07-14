-- Tabla de técnicos con contraseñas hasheadas
CREATE TABLE public.tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  nombre text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.tecnicos TO service_role;
-- Sin acceso desde el cliente: toda la autenticación pasa por server functions con service role.
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

-- Añadir referencia del último técnico que trabajó el ticket
ALTER TABLE public.tickets
  ADD COLUMN tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  ADD COLUMN tecnico_nombre text;