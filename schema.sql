-- Image Markers table for NFT-based AR
CREATE TABLE IF NOT EXISTS image_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  glb_url TEXT NOT NULL,
  scale DECIMAL DEFAULT 0.5,
  position_x DECIMAL DEFAULT 0,
  position_y DECIMAL DEFAULT 0,
  position_z DECIMAL DEFAULT 0,
  rotation_x DECIMAL DEFAULT 0,
  rotation_y DECIMAL DEFAULT 0,
  rotation_z DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE image_markers ENABLE ROW LEVEL SECURITY;

-- Allow public access (add auth later if needed)
CREATE POLICY "Public read" ON image_markers FOR SELECT USING (true);
CREATE POLICY "Public write" ON image_markers FOR ALL USING (true);

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ar-images', 'ar-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for public uploads
CREATE POLICY "Public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ar-images');

CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ar-images');

CREATE POLICY "Public delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'ar-images');
