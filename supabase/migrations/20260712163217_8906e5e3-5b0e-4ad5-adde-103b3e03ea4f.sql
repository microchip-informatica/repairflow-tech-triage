
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente TEXT NOT NULL,
  telefono TEXT,
  descripcion TEXT NOT NULL,
  foto_url TEXT,
  categoria TEXT,
  urgencia TEXT,
  titulo TEXT,
  causas JSONB,
  recomendacion TEXT,
  coste_estimado TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can update tickets" ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
