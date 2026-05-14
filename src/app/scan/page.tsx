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
  const [models, setModels] = useState<ImageMarker[]>([])
  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false)
  const animationRef = useRef<number>(0)
  const lastDetectedRef = useRef<string>('')

  useEffect(() => {
    // Load model-viewer script
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.onload = () => setModelViewerLoaded(true)
    document.body.appendChild(script)
    
    return () => {
      if (camera) camera.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  useEffect(() => {
    if (permissionAsked && camera) {
      scanLoop()
    }
  }, [permissionAsked, camera])

  async function requestCamera() {
    setPermissionAsked(true)
    setStatus('Starting camera...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera(stream)
        setStatus('Point at QR code')
      }
    } catch (e) {
      setPermissionDenied(true)
      setStatus('Camera denied')
    }
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current || loading) {
      animationRef.current = requestAnimationFrame(scanLoop)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanLoop)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code && code.data.includes('/view/')) {
      const markerId = code.data.split('/view/')[1]?.split(/[?&]/)[0]
      if (markerId && !loadedIds.includes(markerId) && lastDetectedRef.current !== markerId) {
        lastDetectedRef.current = markerId
        addModel(markerId)
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop)
  }

  async function addModel(markerId: string) {
    setLoading(true)
    setStatus('Loading model...')
    
    const { data, error } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', markerId)
      .single()
    
    if (error) {
      setStatus('Error: ' + error.message)
      setLoading(false)
      return
    }
    
    if (data) {
      setModels(prev => [...prev, data])
      setLoadedIds(prev => [...prev, markerId])
      setStatus(`Added: ${data.name}`)
      lastDetectedRef.current = ''
    }
    
    setLoading(false)
    setTimeout(() => setStatus('Scan more QR codes'), 2000)
  }

  function removeModel(id: string) {
    setModels(prev => prev.filter(m => m.id !== id))
    setLoadedIds(prev => prev.filter(i => i !== id))
  }

  function clearAll() {
    setModels([])
    setLoadedIds([])
    setStatus('Cleared')
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Scanner</h2>
          <p className="text-gray-400 mb-8">Scan QR codes to add 3D models</p>
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
          {/* Camera background */}
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            autoPlay 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Header */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100
          }}>
            <a href="/" style={{ color: 'white', textDecoration: 'none' }}>← Back</a>
            <span style={{ fontSize: 14 }}>{models.length} models</span>
            {models.length > 0 && (
              <button onClick={clearAll} style={{ color: '#ff6b6b', background: 'none', border: 'none' }}>
                Clear All
              </button>
            )}
          </div>

          {/* Status */}
          <div style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            borderRadius: 20,
            background: 'rgba(0,0,0,0.6)',
            fontSize: 14,
            zIndex: 100
          }}>
            {status}
          </div>

          {/* Models overlaid on camera */}
          {modelViewerLoaded && models.map((model, i) => {
            const positions = [
              { left: '5%', top: '15%', width: '45%' },
              { left: '50%', top: '15%', width: '45%' },
              { left: '5%', top: '45%', width: '45%' },
              { left: '50%', top: '45%', width: '45%' },
            ]
            const pos = positions[i % positions.length]
            
            return (
              <div
                key={model.id}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  width: pos.width,
                  height: '180px',
                  zIndex: 50
                }}
              >
                <model-viewer
                  src={model.glb_url}
                  alt={model.name}
                  camera-controls
                  auto-rotate
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '10px'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  right: 0,
                  textAlign: 'center'
                }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.6)',
                    fontSize: 12
                  }}>
                    {model.name}
                  </span>
                </div>
                <button
                  onClick={() => removeModel(model.id)}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    fontSize: 14,
                    cursor: 'pointer',
                    zIndex: 60
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}

          {/* Bottom bar */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            zIndex: 100,
            textAlign: 'center'
          }}>
            <p style={{ fontSize: 14 }}>📷 Point at QR to add model</p>
            {models.length === 0 && (
              <p style={{ fontSize: 12, color: '#999', marginTop: 5 }}>ModelVR loaded: {modelViewerLoaded ? '✓' : '...'}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
