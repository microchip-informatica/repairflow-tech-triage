
CREATE POLICY "Anyone can upload ticket photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ticket-photos');
CREATE POLICY "Anyone can read ticket photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-photos');
