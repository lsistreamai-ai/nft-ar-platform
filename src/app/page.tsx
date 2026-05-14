'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function Dashboard() {
  const [markers, setMarkers] = useState<ImageMarker[]>([])
  const [selected, setSelected] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [glbUrl, setGlbUrl] = useState('')
  const [scale, setScale] = useState('0.5')
  const [posY, setPosY] = useState('0')

  useEffect(() => { loadMarkers() }, [])
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function loadMarkers() {
    const { data } = await supabase.from('image_markers').select('*').order('created_at', { ascending: false })
    if (data) setMarkers(data)
    setLoading(false)
  }

  function selectMarker(m: ImageMarker) {
    setSelected(m)
    setName(m.name)
    setGlbUrl(m.glb_url)
    setScale(String(m.scale))
    setPosY(String(m.position_y))
  }

  function clearForm() {
    setSelected(null)
    setName('')
    setGlbUrl('')
    setScale('0.5')
    setPosY('0')
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('ar-images').upload(filename, file)
    
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      const { data: { publicUrl } } = supabase.storage.from('ar-images').getPublicUrl(filename)
      setName(file.name.split('.')[0])
      setSelected({ ...selected, id: '', image_url: publicUrl } as ImageMarker)
    }
    setUploading(false)
  }

  async function saveMarker(e: React.FormEvent) {
    e.preventDefault()
    if (!selected?.image_url || !glbUrl) return
    setSaving(true)

    const data = {
      name: name || 'Untitled',
      image_url: selected.image_url,
      glb_url: glbUrl,
      scale: parseFloat(scale) || 0.5,
      position_x: 0,
      position_y: parseFloat(posY) || 0,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }

    const { error } = selected.id
      ? await supabase.from('image_markers').update(data).eq('id', selected.id)
      : await supabase.from('image_markers').insert(data)

    if (!error) {
      setMessage({ type: 'success', text: 'Saved!' })
      await loadMarkers()
      clearForm()
    } else {
      setMessage({ type: 'error', text: error.message })
    }
    setSaving(false)
  }

  async function deleteMarker(id: string) {
    if (!confirm('Delete this marker?')) return
    await supabase.from('image_markers').delete().eq('id', id)
    await loadMarkers()
    clearForm()
    setMessage({ type: 'success', text: 'Deleted' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📸 Image AR Platform</h1>
            <p className="text-sm text-gray-400">{markers.length} image markers</p>
          </div>
          <a href="/viewer" target="_blank" className="btn btn-success text-sm px-4 py-2">
            View AR
          </a>
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className={`toast ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {message.text}
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Upload Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Upload Image</h2>
          <p className="text-sm text-gray-400 mb-4">
            Upload any image (book page, photo, artwork) to use as an AR marker
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary w-full"
          >
            {uploading ? 'Uploading...' : '📁 Choose Image'}
          </button>
        </div>

        {/* Editor (shown when image selected) */}
        {(selected?.image_url || selected?.id) && (
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">
                {selected.id ? 'Edit Marker' : 'Configure New Marker'}
              </h2>
              <button onClick={clearForm} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            <div className="image-preview mb-4">
              {selected.image_url && (
                <img src={selected.image_url} alt="Preview" />
              )}
            </div>

            <form onSubmit={saveMarker} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Page 1 - Solar System"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  GLB URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={glbUrl}
                  onChange={e => setGlbUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../model.glb"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use GitHub raw URL for your .glb file
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scale}
                    onChange={e => setScale(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Y Position</label>
                  <input
                    type="number"
                    step="0.1"
                    value={posY}
                    onChange={e => setPosY(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !glbUrl}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'Saving...' : 'Save Marker'}
                </button>
                {selected.id && (
                  <button
                    type="button"
                    onClick={() => deleteMarker(selected.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Existing Markers */}
        {markers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Your Image Markers</h2>
            <div className="marker-grid">
              {markers.map(m => (
                <div
                  key={m.id}
                  onClick={() => selectMarker(m)}
                  className={`marker-card ${selected?.id === m.id ? 'selected' : ''}`}
                >
                  <div className="image-preview aspect-video">
                    <img src={m.image_url} alt={m.name} />
                  </div>
                  <div className="p-3">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-gray-400 mt-1">Scale: {m.scale}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
