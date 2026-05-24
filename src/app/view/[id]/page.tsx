'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

export default function ARViewPage({ params }: { params: { id: string } }) {
  const [marker, setMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    loadMarker()
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [params.id])

  useEffect(() => {
    if (marker) {
      // Auto-launch AR once marker is loaded
      launchAR()
    }
  }, [marker])

  async function loadMarker() {
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (data) {
      setMarker(data)
      // Play narration if exists
      if (data.narration_text) {
        playNarration(data.narration_text)
      }
    } else {
      setError(true)
    }
    setLoading(false)
  }

  function playNarration(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  function launchAR() {
    if (!marker) return

    const isAndroid = /Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isAndroid) {
      // Android: Direct Scene Viewer intent - opens camera immediately
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(marker.glb_url)}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.origin)};end`
      window.location.href = intent
    } else if (isIOS) {
      // iOS: Redirect to USDZ file for Quick Look
      // We need to use model-viewer for iOS Quick Look
      // Load model-viewer and trigger AR
      loadModelViewerAndLaunchAR()
    } else {
      // Desktop: Show message
      setError(true)
    }
  }

  function loadModelViewerAndLaunchAR() {
    // For iOS, we need model-viewer to trigger Quick Look
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.onload = () => {
      // Wait a moment for model-viewer to initialize
      setTimeout(() => {
        const modelViewer = document.querySelector('model-viewer')
        if (modelViewer) {
          // Trigger AR
          try {
            (modelViewer as any).activateAR()
          } catch (e) {
            console.log('AR activation failed, user may need to tap the AR button')
          }
        }
      }, 500)
    }
    document.body.appendChild(script)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Launching AR...</p>
        </div>
      </div>
    )
  }

  if (error || !marker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-white">
          <div style={{ fontSize: 60, marginBottom: 20 }}>⚠️</div>
          <h1 className="text-xl font-bold mb-2">AR Not Available</h1>
          <p className="text-gray-400 mb-6 text-sm">Please use a mobile device with AR support (iOS Safari or Android Chrome)</p>
          <a href="/" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg inline-block transition">
            ← Back
          </a>
        </div>
      </div>
    )
  }

  // Detect platform
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Back button */}
      <a href="/" style={{
        position: 'fixed', top: 20, left: 20, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', color: 'white',
        padding: '10px 18px', borderRadius: 10, textDecoration: 'none'
      }}>
        ← Back
      </a>

      {/* Narration indicator */}
      {isSpeaking && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#10b981', color: 'white',
          padding: '10px 18px', borderRadius: 10,
          fontSize: 14
        }}>
          🎙️ Playing narration...
        </div>
      )}

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          {/* iOS: Show model-viewer with AR for Quick Look */}
          {isIOS && (
            <>
              <h1 className="text-xl font-bold mb-4">{marker.name}</h1>
              <p className="text-gray-400 mb-4">Tap the AR button below to view in your camera</p>
              <div style={{ width: '100vw', height: '60vh', maxWidth: '500px' }}>
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
                  <button 
                    slot="ar-button" 
                    style={{
                      background: '#4da6ff', 
                      color: 'white',
                      padding: '16px 40px', 
                      borderRadius: 25,
                      border: 'none', 
                      fontSize: 18, 
                      fontWeight: 'bold',
                      boxShadow: '0 4px 15px rgba(77, 166, 255, 0.5)'
                    }}
                  >
                    📱 View in AR
                  </button>
                </model-viewer>
              </div>
            </>
          )}

          {/* Android: Show loading while intent launches */}
          {isAndroid && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-xl font-bold mb-2">{marker.name}</h1>
              <p className="text-gray-400">Opening AR Camera...</p>
            </div>
          )}

          {/* Show narration text if available */}
          {marker.narration_text && (
            <div style={{
              marginTop: 20,
              padding: '15px 20px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 15,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <p className="text-sm text-gray-300">{marker.narration_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
