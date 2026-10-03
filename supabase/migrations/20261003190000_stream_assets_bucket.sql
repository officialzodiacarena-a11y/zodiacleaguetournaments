-- Create the stream-assets bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stream-assets', 'stream-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access
CREATE POLICY "Public Read Access for stream-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'stream-assets');

-- Policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload stream-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stream-assets');

CREATE POLICY "Authenticated users can update stream-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stream-assets');

CREATE POLICY "Authenticated users can delete stream-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stream-assets');
