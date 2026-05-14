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
  const [lastScannedId, setLastScannedId] = useState('')
  const animationRef = useRef<number>(0)

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
    setStatus('Requesting camera access...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera(stream)
        setStatus('Point camera at QR code')
        scanQRCode()
      }
    } catch (e: any) {
      console.error('Camera error:', e)
      setPermissionDenied(true)
      setStatus('Camera access denied. Please allow camera in your browser settings.')
    }
  }

  function scanQRCode() {
    if (!videoRef.current || !canvasRef.current) {
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
      if (markerId && markerId !== lastScannedId) {
        setLastScannedId(markerId)
        launchAR(markerId)
        setTimeout(() => setLastScannedId(''), 3000)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  async function launchAR(markerId: string) {
    setStatus('Loading model...')
    
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', markerId)
      .single()
    
    if (!data) {
      setStatus('Model not found')
      return
    }

    setStatus(`Found: ${data.name}`)

    const isAndroid = /Android/.test(navigator.userAgent)

    if (isAndroid) {
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(data.glb_url)}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`
      window.location.href = intent
    } else {
      window.location.href = `/view/${markerId}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <a href="/" style={{ color: 'white', textDecoration: 'none' }}>← Back</a>
        <span>📷 QR Scanner</span>
        <span style={{ width: 50 }}></span>
      </div>

      {/* Camera or Permission Request */}
      {!permissionAsked ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">Scan QR Codes for AR</h2>
          <p className="text-gray-400 mb-8">
            Point your camera at a QR code to instantly view 3D models in AR
          </p>
          <button
            onClick={requestCamera}
            style={{
              background: '#4da6ff',
              color: 'white',
              padding: '18px 50px',
              borderRadius: 30,
              fontSize: 18,
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            📷 Enable Camera
          </button>
        </div>
      ) : permissionDenied ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚫</div>
          <h2 className="text-xl font-bold mb-4">Camera Access Denied</h2>
          <p className="text-gray-400 mb-6">
            Please enable camera access in your browser settings and reload this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#4da6ff',
              color: 'white',
              padding: '14px 30px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 'bold',
              border: 'none'
            }}
          >
            Reload Page
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ flex: 1, objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Status overlay */}
          <div
            style={{
              position: 'absolute',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              padding: '10px 24px',
              borderRadius: 20,
              fontSize: 14
            }}
          >
            {status}
          </div>

          {/* Bottom tip */}
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              padding: '12px 24px',
              borderRadius: 20,
              textAlign: 'center'
            }}
          >
            Point at QR → AR launches
          </div>
        </>
      )}
    </div>
  )
}
