'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'
import type { ImageMarker } from '@/types'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState<MediaStream | null>(null)
  const [currentMarker, setCurrentMarker] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Starting camera...')
  const animationRef = useRef<number>(0)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
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
        setStatus('Point camera at QR code')
        scanQRCode()
      }
    } catch (e) {
      setError('Camera access denied')
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
      if (markerId) {
        loadMarker(markerId)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  async function loadMarker(id: string) {
    if (loading || currentMarker?.id === id) return
    
    setLoading(true)
    setStatus('Loading model...')
    
    const { data, error } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) {
      setCurrentMarker(data)
      setStatus(`Found: ${data.name}`)
    } else {
      setError('Marker not found')
    }
    setLoading(false)
    
    setTimeout(() => setStatus('Point camera at QR code'), 2000)
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
          top: '20px',
          left: '20px',
          zIndex: 999,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}
      >
        ← Back
      </a>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '14px'
        }}
      >
        {error || status}
      </div>

      {currentMarker && (
        <div
          style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            height: '50%',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: '20px 20px 0 0',
            padding: '20px',
            zIndex: 100
          }}
        >
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '10px' }}>
            {currentMarker.name}
          </h2>
          <model-viewer
            src={currentMarker.glb_url}
            alt={currentMarker.name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            camera-controls
            auto-rotate
            style={{ width: '100%', height: '250px', backgroundColor: 'transparent' }}
          >
            <button
              slot="ar-button"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#4da6ff',
                color: 'white',
                padding: '14px 30px',
                borderRadius: '25px',
                fontWeight: 'bold',
                border: 'none',
                fontSize: '16px'
              }}
            >
              📱 View in AR
            </button>
          </model-viewer>
        </div>
      )}

      {!currentMarker && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '30px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📷</div>
          <div>Point at QR code</div>
        </div>
      )}

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
