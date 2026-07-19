-- Explicit RLS policies for the ticket-photos bucket on storage.objects.
-- All app access goes through server functions using the service role,
-- which bypasses RLS. Anon and authenticated roles have no legitimate
-- direct-storage path, so we deny them explicitly.

DROP POLICY IF EXISTS "ticket-photos deny anon all" ON storage.objects;
DROP POLICY IF EXISTS "ticket-photos deny authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "ticket-photos deny authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "ticket-photos deny authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "ticket-photos deny authenticated delete" ON storage.objects;

-- Anon: no access to ticket-photos at all.
CREATE POLICY "ticket-photos deny anon all"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id <> 'ticket-photos')
WITH CHECK (bucket_id <> 'ticket-photos');

-- Authenticated: also blocked. The app never uses an authenticated Supabase
-- session for storage; the custom técnico auth is server-side only and all
-- storage operations run under the service role.
CREATE POLICY "ticket-photos deny authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id <> 'ticket-photos');

CREATE POLICY "ticket-photos deny authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id <> 'ticket-photos');

CREATE POLICY "ticket-photos deny authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id <> 'ticket-photos')
WITH CHECK (bucket_id <> 'ticket-photos');

CREATE POLICY "ticket-photos deny authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id <> 'ticket-photos');