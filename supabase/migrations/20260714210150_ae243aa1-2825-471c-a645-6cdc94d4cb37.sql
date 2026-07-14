-- Lock down tickets: remove all public policies. Access is now only via
-- server functions using the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;

-- Revoke Data API privileges from public roles so no client-side query can
-- reach this table even if a policy were added later by mistake.
REVOKE ALL ON public.tickets FROM anon, authenticated;
GRANT ALL ON public.tickets TO service_role;

-- Lock down the ticket-photos storage bucket: remove the public read/upload
-- policies. Photos are now served via short-lived signed URLs from a
-- session-gated server function using the service role.
DROP POLICY IF EXISTS "Anyone can read ticket photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload ticket photos" ON storage.objects;