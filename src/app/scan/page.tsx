'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'
import type { ImageMarker } from '@/types'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState('')
  const [permissionAsked, setPermissionAsked] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [loadedMarkerIds, setLoadedMarkerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const animationRef = useRef<number>(0)
  const lastDetectedRef = useRef<string>('')

  useEffect(() => {
    return () => stopCamera()
  }, [])

  function stopCamera() {
    if (camera) {
      camera.getTracks().forEach(t => t.stop())
    }
    cancelAnimationFrame(animationRef.current)
  }

  async function requestCamera() {
    setPermissionAsked(true)
    setStatus('Requesting camera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera(stream)
        setStatus('Point at QR code')
        scanQRCode()
      }
    } catch (e: any) {
      setPermissionDenied(true)
      setStatus('Camera access denied')
    }
  }

  function scanQRCode() {
    if (!videoRef.current || !canvasRef.current || loading) {
      animationRef.current = requestAnimationFrame(scanQRCode)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code && code.data.includes('/view/')) {
      const markerId = code.data.split('/view/')[1]?.split(/[?&]/)[0]
      
      if (markerId && !loadedMarkerIds.includes(markerId) && lastDetectedRef.current !== markerId) {
        lastDetectedRef.current = markerId
        loadAndLaunchAR(markerId)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  async function loadAndLaunchAR(markerId: string) {
    if (loadedMarkerIds.includes(markerId)) {
      setStatus('Already viewed!')
      return
    }

    setLoading(true)
    setStatus('Loading...')
    
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', markerId)
      .single()
    
    if (!data) {
      setStatus('Not found')
      setLoading(false)
      return
    }

    setLoadedMarkerIds(prev => [...prev, markerId])
    setLoading(false)
    setStatus(`Opening AR: ${data.name}...`)
    
    // Launch AR directly
    const isAndroid = /Android/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isAndroid) {
      // Android: Scene Viewer opens camera with model
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(data.glb_url)}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end`
      window.location.href = intent
    } else if (isIOS) {
      // iOS: Use USDZ if available, otherwise show model-viewer page
      // Quick Look requires USDZ format, but we'll redirect to view page
      window.location.href = `/view/${markerId}`
    } else {
      // Desktop: Go to view page
      window.location.href = `/view/${markerId}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black text-white">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Scanner</h2>
          <p className="text-gray-400 mb-8">Scan QR codes to view 3D models in AR</p>
          <button onClick={requestCamera} style={{
            background: '#4da6ff', color: 'white',
            padding: '18px 50px', borderRadius: 30,
            fontSize: 18, fontWeight: 'bold', border: 'none'
          }}>
            📷 Enable Camera
          </button>
        </div>
      ) : permissionDenied ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚫</div>
          <h2 className="text-xl font-bold mb-4">Camera Denied</h2>
          <button onClick={() => window.location.reload()} style={{
            background: '#4da6ff', color: 'white',
            padding: '14px 30px', borderRadius: 20, border: 'none'
          }}>
            Reload
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <a href="/" className="text-white text-sm">← Back</a>
            <span className="text-xs opacity-75">Scanner</span>
            <span className="text-xs opacity-75">{loadedMarkerIds.length} viewed</span>
          </div>

          {/* Status */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {loading ? '⏳ Loading...' : status}
          </div>

          {/* Center reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{ width: 200, height: 200, border: '2px solid rgba(255,255,255,0.3)', borderRadius: 20 }} />
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <p className="text-base">Point camera at QR code</p>
            <p className="text-xs text-gray-400 mt-2">AR will open automatically</p>
          </div>
        </>
      )}
    </div>
  )
}
