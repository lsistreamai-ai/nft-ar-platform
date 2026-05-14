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
    if (!glbUrl) return
    setSaving(true)

    const data = {
      name: name || 'Untitled',
      image_url: selected?.image_url || '',
      glb_url: glbUrl,
      scale: parseFloat(scale) || 0.5,
      position_x: 0,
      position_y: parseFloat(posY) || 0,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }

    const { error } = selected?.id
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
    if (!confirm('Delete?')) return
    await supabase.from('image_markers').delete().eq('id', id)
    await loadMarkers()
    clearForm()
    setMessage({ type: 'success', text: 'Deleted' })
  }

  function getQRCodeUrl(markerId: string) {
    const viewUrl = `${window.location.origin}/view/${markerId}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(viewUrl)}`
  }

  function downloadQR(m: ImageMarker) {
    const qrUrl = getQRCodeUrl(m.id)
    const link = document.createElement('a')
    link.download = `qr-${m.name}.png`
    link.href = qrUrl
    link.click()
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
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">📷 AR QR Platform</h1>
          <p className="text-sm text-gray-400">{markers.length} markers</p>
        </div>
      </header>

      {message && (
        <div className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-xl text-center ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Create/Edit Marker */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">{selected?.id ? 'Edit Marker' : 'Create Marker'}</h2>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
            className="hidden"
          />
          
          <form onSubmit={saveMarker} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Page 1 - Solar System"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">GLB URL *</label>
              <input
                type="url"
                value={glbUrl}
                onChange={e => setGlbUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../model.glb"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Scale</label>
                <input type="number" step="0.1" value={scale} onChange={e => setScale(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Y Position</label>
                <input type="number" step="0.1" value={posY} onChange={e => setPosY(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving || !name || !glbUrl} className="btn btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Marker'}
              </button>
              {selected?.id && (
                <button type="button" onClick={() => deleteMarker(selected.id)} className="btn btn-danger">
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Markers */}
        {markers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Your Markers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markers.map(m => (
                <div key={m.id} className="card overflow-hidden">
                  <div className="bg-white p-4 flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <img 
                      src={getQRCodeUrl(m.id)} 
                      alt="QR Code" 
                      className="max-h-48"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold truncate">{m.name}</h3>
                    
                    <div className="flex gap-2 mt-3">
                      <a
                        href={`/view/${m.id}`}
                        target="_blank"
                        className="btn btn-primary flex-1 text-sm py-2 text-center"
                      >
                        👁️ View AR
                      </a>
                      <button
                        onClick={() => downloadQR(m)}
                        className="btn btn-secondary text-sm py-2"
                      >
                        📥 QR
                      </button>
                      <button
                        onClick={() => selectMarker(m)}
                        className="btn btn-secondary text-sm py-2"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card p-6">
          <h2 className="font-bold mb-3">📖 How to Use</h2>
          <ol className="text-sm text-gray-300 space-y-2">
            <li>1. Create marker with name + GLB URL</li>
            <li>2. Download the QR code OR tap "View AR"</li>
            <li>3. Scan QR with phone camera</li>
            <li>4. Camera opens → point at floor → model appears!</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
