'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [launched, setLaunched] = useState(false)

  useEffect(() => {
    setIsAndroid(/Android/.test(navigator.userAgent))
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
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
      console.error(e)
    }
    setLoading(false)
  }

  // Auto-launch AR for Android
  useEffect(() => {
    if (marker && isAndroid && !launched) {
      setLaunched(true)
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(marker.glb_url)}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`
      window.location.href = intent
    }
  }, [marker, isAndroid, launched])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading AR...</p>
        </div>
      </div>
    )
  }

  if (!marker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-white">
          <h1 className="text-xl font-bold mb-2">Marker Not Found</h1>
          <a href="/" className="btn btn-primary">Back</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white" style={{ position: 'relative' }}>
      <model-viewer
        src={marker.glb_url}
        alt={marker.name}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: '100%', height: '100vh' }}
      >
        <button 
          slot="ar-button"
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#4da6ff',
            color: 'white',
            padding: '20px 50px',
            borderRadius: '30px',
            fontWeight: 'bold',
            border: 'none',
            fontSize: '20px',
            boxShadow: '0 4px 20px rgba(77,166,255,0.5)'
          }}
        >
          📱 View in AR
        </button>
      </model-viewer>

      <a 
        href="/"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 999,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          textDecoration: 'none'
        }}
      >
        ← Back
      </a>

      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '10px',
          fontSize: '14px'
        }}
      >
        {isIOS && '🍎 iOS'}
        {isAndroid && '🤖 Android'}
      </div>

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
