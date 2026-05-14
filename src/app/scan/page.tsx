'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'
import type { ImageMarker } from '@/types'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState('Starting camera...')
  const [lastScannedId, setLastScannedId] = useState('')
  const animationRef = useRef<number>(0)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
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
    } catch (e) {
      setStatus('Camera access denied')
    }
  }

  function stopCamera() {
    if (camera) {
      camera.getTracks().forEach(t => t.stop())
    }
    cancelAnimationFrame(animationRef.current)
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
        
        // Reset after 3 seconds to allow scanning again
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
      // Android: Launch Scene Viewer directly
      const intent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(data.glb_url)}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`
      window.location.href = intent
    } else {
      // iOS: Redirect to the view page which has AR Quick Look
      window.location.href = `/view/${markerId}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <a 
        href="/"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 999,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 18px',
          borderRadius: 10,
          textDecoration: 'none',
          fontSize: 14
        }}
      >
        ← Back
      </a>

      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: 20,
          fontSize: 14
        }}
      >
        {status}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '15px 30px',
          borderRadius: 30,
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 5 }}>📷</div>
        <div>Point at QR code → AR launches!</div>
      </div>
    </div>
  )
}
