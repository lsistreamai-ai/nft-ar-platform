'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)

  useEffect(() => {
    loadMarker()
  }, [params.id])

  useEffect(() => {
    // Auto-start AR camera
    if (marker) {
      startARCamera()
    }
  }, [marker])

  async function loadMarker() {
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (data) setMarker(data)
  }

  function startARCamera() {
    if (!marker) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isAndroid) {
      // Android: Launch Google Scene Viewer (camera + AR)
      const url = encodeURIComponent(marker.glb_url)
      const fallback = encodeURIComponent(window.location.href)
      window.location.href = `intent://arvr.google.com/scene-viewer/1.0?file=${url}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`
    }
    // iOS will use model-viewer with ar
  }

  if (!marker) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 bg-black">
      {/* For iOS - model-viewer with AR */}
      {!isAndroid && (
        <>
          <model-viewer
            src={marker.glb_url}
            ios-src={marker.glb_url}
            alt={marker.name}
            ar
            ar-modes="webxr quick-look"
            ar-scale="fixed"
            quick-look-browsers="safari chrome"
            style={{ width: '100%', height: '100%' }}
          >
          </model-viewer>
          
          {/* Prompt for iOS */}
          <div style={{
            position: 'fixed',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            color: 'black',
            padding: '18px 40px',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '18px',
            zIndex: 999
          }}>
            📱 Tap to View in AR
          </div>
        </>
      )}

      {/* For Android - loading screen while Scene Viewer launches */}
      {isAndroid && (
        <div className="flex items-center justify-center text-white text-center p-8">
          <div>
            <div className="text-4xl mb-4">📷</div>
            <div className="text-xl font-bold">Opening Camera...</div>
            <div className="text-sm text-gray-400 mt-2">Point at a flat surface</div>
          </div>
        </div>
      )}

      {/* Back button */}
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

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
