# AR Platform - Backup & Settings

**Last Updated:** May 24, 2026
**URL:** https://nft-ar-platform.vercel.app

---

## Live URLs

| Page | URL |
|------|-----|
| Main Dashboard | https://nft-ar-platform.vercel.app |
| AR Scanner | https://nft-ar-platform.vercel.app/scan |
| Direct AR View | https://nft-ar-platform.vercel.app/view/{id} |

---

## Database (Supabase)

| Setting | Value |
|---------|-------|
| Project URL | https://zywgdjbuttwyingoldgb.supabase.co |
| Region | Singapore |
| Table | `image_markers` |
| Storage Bucket | `ar-images` (public) |

### Table Schema

```sql
CREATE TABLE image_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  glb_url TEXT NOT NULL,
  book_id TEXT,
  narration_text TEXT,
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
```

---

## Environment Variables (Vercel)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://zywgdjbuttwyingoldgb.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (stored in Vercel) |

---

## Current Markers (as of May 24, 2026)

| Name | Book | ID |
|------|------|-----|
| Scientist | CPYPS AR Book (6A) | `7ff9b5cb-c5e7-4dea-b468-d527fa47e9c4` |
| space | - | `f8bac444-5b03-4a4f-b72b-1e447bdb1212` |
| Astronaut Test | - | `dc54f650-f810-4653-ae8a-407177952f30` |
| Box | - | `21c9c1be-8811-4880-8b37-4201e2819191` |

---

## Feature Settings

### `/scan` - AR Scanner (Blending Mode)

**Behavior:**
1. Shows "Enable Camera" button
2. Asks for camera permission
3. Camera feed shows as background (LIVE camera, not black)
4. Scan QR code → Model loads centered on screen
5. **One model at a time** - scanning new QR replaces current model
6. Model floats on camera (no name label, no X button, no background box)
7. Auto-plays narration if marker has `narration_text`

**What is REMOVED:**
- ❌ No model name label
- ❌ No X button on model
- ❌ No background box around model
- ❌ No "Clear All" button
- ❌ No multiple models at once

**Tech Stack:**
- `jsQR` for QR code scanning
- `model-viewer` for 3D rendering
- Camera uses `getUserMedia` with `facingMode: 'environment'`

---

### `/view/{id}` - Direct AR View

**Behavior:**
1. Android: Launches Google Scene Viewer directly (AR camera)
2. iOS: Shows model-viewer with AR button for Quick Look
3. Auto-plays narration if exists
4. Desktop: Shows error message (mobile only)

---

## Local Project Location

```
~/.openclaw/workspace/projects/nft-ar-platform/
```

---

## GitHub Repository

```
https://github.com/language-services-international/nft-ar-platform
```

---

## Vercel Project

- **Project ID:** `prj_O9WPr0MUKLF3OUY1otidRxMeE8KI`
- **Team:** language-services-international
- **Project Name:** nft-ar-platform
- **Deployment Protection:** OFF (Standard)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard - create/edit markers, QR codes |
| `src/app/scan/page.tsx` | AR Scanner (blending mode) |
| `src/app/view/[id]/page.tsx` | Direct AR view - auto-launch camera |
| `src/lib/supabase.ts` | Database connection |
| `schema.sql` | Database schema |

---

## Model Sources

| Type | URL Pattern |
|------|-------------|
| Custom uploads | `https://zywgdjbuttwyingoldgb.supabase.co/storage/v1/object/public/ar-images/{filename}.glb` |
| External | Any public GLB URL |

---

## How to Restore/Deploy

```bash
cd ~/.openclaw/workspace/projects/nft-ar-platform
vercel --prod --yes
```

---

## Notes

- Password protection was causing issues → now turned OFF
- Environment variables were missing → now added to Vercel
- Camera was showing black → fixed by proper video element styling
- Blending mode = camera background + 3D model overlaid on top
