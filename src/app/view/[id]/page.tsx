'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    setIsAndroid(/Android/.test(navigator.userAgent))
    loadMarker()
  }, [params.id])

  useEffect(() => {
    // Auto-launch Scene Viewer for Android
    if (marker && isAndroid) {
      launchAndroidAR()
    }
  }, [marker, isAndroid])

  async function loadMarker() {
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', params.id)
      .single()
    if (data) setMarker(data)
    setLoading(false)
  }

  function launchAndroidAR() {
    if (!marker) return
    const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(marker.glb_url)}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`
    window.location.href = intent
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
          <h1 className="text-xl font-bold mb-2">Not Found</h1>
          <a href="/" className="btn btn-primary mt-4 inline-block">Back</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <a href="/" style={{
        position: 'fixed', top: 20, left: 20, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', color: 'white',
        padding: '10px 18px', borderRadius: 10, textDecoration: 'none'
      }}>
        ← Back
      </a>

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">{marker.name}</h1>
          
          {isAndroid ? (
            <>
              <p className="text-gray-400 mb-6">Launching AR camera...</p>
              <button
                onClick={launchAndroidAR}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: '#4da6ff',
                  color: 'white',
                  borderRadius: 15,
                  fontSize: 18,
                  fontWeight: 'bold',
                  border: 'none',
                  marginTop: 20
                }}
              >
                📱 Open AR Camera
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-4">Tap below to view in AR</p>
              <div style={{ width: '100%', height: '300px' }}>
                <model-viewer
                  src={marker.glb_url}
                  alt={marker.name}
                  ar
                  ar-modes="quick-look webxr"
                  ar-scale="fixed"
                  camera-controls
                  auto-rotate
                  style={{ width: '100%', height: '100%' }}
                >
                  <button slot="ar-button" style={{
                    background: '#4da6ff', color: 'white',
                    padding: '14px 30px', borderRadius: 20,
                    border: 'none', fontSize: 16, fontWeight: 'bold'
                  }}>
                    📱 View in AR
                  </button>
                </model-viewer>
              </div>
            </>
          )}
        </div>
      </div>

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
