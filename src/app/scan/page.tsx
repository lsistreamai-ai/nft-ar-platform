'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'
import type { ImageMarker } from '@/types'

interface PlacedModel extends ImageMarker {
  instanceId: string
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState('')
  const [permissionAsked, setPermissionAsked] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [placedModels, setPlacedModels] = useState<PlacedModel[]>([])
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
    setStatus('Requesting camera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera(stream)
        setStatus('Point at QR to add models')
        scanQRCode()
      }
    } catch (e: any) {
      setPermissionDenied(true)
      setStatus('Camera access denied')
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
        addModel(markerId)
        setTimeout(() => setLastScannedId(''), 2000)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  async function addModel(markerId: string) {
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

    const newModel: PlacedModel = {
      ...data,
      instanceId: `${data.id}-${Date.now()}`
    }
    
    setPlacedModels(prev => [...prev, newModel])
    setStatus(`Added: ${data.name}`)
    setTimeout(() => setStatus('Point at QR to add more'), 1500)
  }

  function removeModel(instanceId: string) {
    setPlacedModels(prev => prev.filter(m => m.instanceId !== instanceId))
  }

  function clearAll() {
    setPlacedModels([])
    setStatus('All models cleared')
  }

  return (
    <div className="fixed inset-0 bg-black text-white">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Multi-Model Scanner</h2>
          <p className="text-gray-400 mb-8">
            Scan QR codes to place multiple 3D models together
          </p>
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
          {/* Camera feed */}
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <a href="/" className="text-white">← Back</a>
            <span className="text-sm">{placedModels.length} models</span>
            {placedModels.length > 0 && (
              <button onClick={clearAll} className="text-red-400 text-sm">Clear All</button>
            )}
          </div>

          {/* Status */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {status}
          </div>

          {/* Models overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            {placedModels.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2">Models placed:</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {placedModels.map(model => (
                    <div key={model.instanceId} className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <span>{model.name}</span>
                      <button onClick={() => removeModel(model.instanceId)} className="text-red-400 ml-1">×</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Scan more QR codes to add models</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p>Point camera at QR code</p>
                <p className="text-xs text-gray-400 mt-1">Models will appear here</p>
              </div>
            )}
          </div>

          {/* Model viewers for each placed model */}
          <div className="absolute inset-0 pointer-events-none">
            {placedModels.map((model, index) => (
              <div 
                key={model.instanceId} 
                className="absolute"
                style={{
                  left: `${10 + (index % 3) * 30}%`,
                  top: `${30 + Math.floor(index / 3) * 20}%`,
                  width: '35%',
                  height: '150px',
                  pointerEvents: 'auto'
                }}
              >
                <model-viewer
                  src={model.glb_url}
                  alt={model.name}
                  camera-controls
                  auto-rotqate
                  style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
    </div>
  )
}
