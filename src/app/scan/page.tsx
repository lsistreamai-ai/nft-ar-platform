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
  const animationRef = useRef<number>(0)
  const lastDetectedRef = useRef<string>('')

  useEffect(() => {
    return () => {
      if (camera) camera.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animationRef.current)
    }
  }, [camera])

  async function requestCamera() {
    setPermissionAsked(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamera(stream)
        setStatus('Point at QR code')
        scanLoop()
      }
    } catch (e) {
      setPermissionDenied(true)
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
    setStatus('Loading...')
    
    const { data } = await supabase.from('image_markers').select('*').eq('id', markerId).single()
    
    if (data) {
      setModels(prev => [...prev, data])
      setLoadedIds(prev => [...prev, markerId])
      setStatus(`Added: ${data.name}`)
    }
    
    setLoading(false)
    setTimeout(() => setStatus('Scan more QR codes'), 1500)
  }

  function removeModel(id: string) {
    setModels(prev => prev.filter(m => m.id !== id))
    setLoadedIds(prev => prev.filter(i => i !== id))
  }

  function clearAll() {
    setModels([])
    setLoadedIds([])
    setStatus('All cleared')
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
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <a href="/" className="text-white text-sm">← Back</a>
            <span className="text-xs">{models.length} models</span>
            {models.length > 0 && <button onClick={clearAll} className="text-red-400 text-xs">Clear</button>}
          </div>

          {/* Status */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {status}
          </div>

          {/* Models overlaid on camera */}
          <div className="absolute inset-0 pointer-events-none z-40">
            {models.map((model, i) => {
              const positions = [
                { left: '10%', top: '20%' },
                { left: '55%', top: '20%' },
                { left: '10%', top: '50%' },
                { left: '55%', top: '50%' },
              ]
              const pos = positions[i % positions.length]
              
              return (
                <div
                  key={model.id}
                  className="absolute pointer-events-auto"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    width: '35%',
                    height: '200px'
                  }}
                >
                  <model-viewer
                    src={model.glb_url}
                    alt={model.name}
                    camera-controls
                    auto-rotate
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="absolute -top-6 left-0 right-0 text-center">
                    <span className="px-3 py-1 rounded-full text-xs bg-black/50">{model.name}</span>
                  </div>
                  <button
                    onClick={() => removeModel(model.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs z-50"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-50" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
            <p className="text-center text-sm">📷 Point at QR to add model</p>
          </div>

          <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
        </>
      )}
    </div>
  )
}
