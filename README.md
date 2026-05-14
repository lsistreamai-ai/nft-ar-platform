# Image AR Platform

Upload images and assign 3D models for augmented reality experiences.

## Features

- 📸 Upload any image as an AR marker
- 🎨 Assign 3D GLB models to each image
- 📱 Mobile-friendly AR viewer
- ☁️ Supabase backend for data & storage

## Setup

### 1. Create Supabase Table

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE image_markers (
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

ALTER TABLE image_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON image_markers FOR SELECT USING (true);
CREATE POLICY "Public write" ON image_markers FOR ALL USING (true);
```

### 2. Create Storage Bucket

1. Go to Storage in Supabase
2. Create bucket named `ar-images`
3. Set to Public

### 3. Deploy

```bash
vercel --prod
```

## Usage

1. Open dashboard
2. Upload an image (book page, photo, etc.)
3. Enter GLB URL from GitHub
4. Save
5. Open AR viewer on mobile

## GLB Hosting

Use GitHub for free GLB hosting:
1. Upload .glb to public GitHub repo
2. Get raw URL: `https://raw.githubusercontent.com/user/repo/main/model.glb`

## Supported Formats

- Images: JPG, PNG, WebP
- 3D Models: GLB, GLTF
