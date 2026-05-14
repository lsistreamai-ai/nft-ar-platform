'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [arStarted, setArStarted] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    loadMarker()
  }, [params.id])

  async function loadMarker() {
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', params.id)
      .single()
    if (data) setMarker(data)
    setLoading(false)
  }

  function startAR() {
    setArStarted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!marker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold mb-2">Not Found</h1>
          <a href="/" className="btn btn-primary mt-4 inline-block">Back</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Back button */}
      <a 
        href="/"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 18px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontSize: '14px'
        }}
      >
        ← Back
      </a>

      {!arStarted ? (
        /* Preview mode - show model with button */
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">{marker.name}</h1>
              <p className="text-gray-400 mb-6">Tap below to view in AR</p>
              
              {/* Model Preview */}
              <div style={{ width: '100%', maxWidth: '400px', height: '300px', margin: '0 auto' }}>
                <model-viewer
                  src={marker.glb_url}
                  alt={marker.name}
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }}
                />
              </div>
            </div>
          </div>

          {/* AR Button */}
          <div className="p-6">
            <button
              onClick={startAR}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #4da6ff 0%, #0066cc 100%)',
                color: 'white',
                borderRadius: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,102,204,0.4)'
              }}
            >
              📱 View in AR
            </button>
          </div>
        </div>
      ) : (
        /* AR Mode */
        <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
          <model-viewer
            src={marker.glb_url}
            ios-src={marker.glb_url}
            alt={marker.name}
            ar
            ar-modes={isIOS ? "quick-look webxr" : "webxr scene-viewer"}
            ar-scale="fixed"
            ar-placement="floor"
            camera-controls
            style={{ width: '100%', height: '100%' }}
          >
            {/* Loading indicator */}
            <div slot="ar-status" style={{ 
              position: 'absolute', 
              bottom: '100px', 
              left: '50%', 
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '14px'
            }}>
              Point camera at floor
            </div>
          </model-viewer>

          {/* Cancel button */}
          <button
            onClick={() => setArStarted(false)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 9999,
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
