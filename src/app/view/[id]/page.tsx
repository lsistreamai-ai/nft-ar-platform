'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMarker()
  }, [params.id])

  async function loadMarker() {
    try {
      const { data, error } = await supabase
        .from('image_markers')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (error) throw error
      setMarker(data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !marker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-white max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold mb-2">Marker Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'This marker does not exist'}</p>
          <a href="/" className="btn btn-primary">Back to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="max-w-4xl mx-auto mb-6">
        <a href="/" className="text-blue-400 hover:underline text-sm">← Back to Dashboard</a>
      </header>

      <main className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{marker.name}</h1>
        <p className="text-gray-400 mb-6">Tap the button below to view in AR</p>

        {/* Model Viewer */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden mb-6">
          <model-viewer
            src={marker.glb_url}
            alt={marker.name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{ width: '100%', height: '500px', backgroundColor: '#1a1a2e' }}
          >
            <button 
              slot="ar-button" 
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#4da6ff',
                color: 'black',
                padding: '14px 28px',
                borderRadius: '20px',
                fontWeight: 'bold',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              📱 View in AR
            </button>
          </model-viewer>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-xl">
          <h3 className="font-bold text-blue-400 mb-2">📱 How to Use</h3>
          <ul className="text-sm space-y-1 text-gray-300">
            <li>• Tap <strong>"View in AR"</strong> button above</li>
            <li>• Point camera at a flat surface</li>
            <li>• Tap to place the 3D model</li>
            <li>• <strong>iOS:</strong> Opens AR Quick Look</li>
            <li>• <strong>Android:</strong> Opens Scene Viewer</li>
          </ul>
        </div>
      </main>

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
