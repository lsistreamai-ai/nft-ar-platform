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
  const [currentModel, setCurrentModel] = useState<ImageMarker | null>(null)
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
        setStatus('Point at QR to load model')
        scanQRCode()
      }
    } catch (e: any) {
      setPermissionDenied(true)
      setStatus('Camera access denied')
    }
  }

  function scanQRCode() {
    if (!videoRef.current || !canvasRef.current || loading || currentModel) {
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
        loadModel(markerId)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  async function loadModel(markerId: string) {
    if (loadedMarkerIds.includes(markerId)) {
      setStatus('Already placed!')
      return
    }

    setLoading(true)
    setStatus('Loading model...')
    
    const { data } = await supabase
      .from('image_markers')
      .select('*')
      .eq('id', markerId)
      .single()
    
    if (!data) {
      setStatus('Model not found')
      setLoading(false)
      return
    }

    setCurrentModel(data)
    setLoadedMarkerIds(prev => [...prev, markerId])
    setLoading(false)
    setStatus(`Placed: ${data.name}`)
  }

  function backToScanner() {
    setCurrentModel(null)
    setStatus('Point at QR to load next model')
  }

  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 bg-black text-white">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Book Scanner</h2>
          <p className="text-gray-400 mb-8">Scan QR codes to place 3D models in AR</p>
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
      ) : currentModel ? (
        /* AR VIEW - Full screen model with AR placement */
        <div className="relative w-full h-full">
          {/* Back to scanner button */}
          <button
            onClick={backToScanner}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 999,
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              fontSize: 14
            }}
          >
            ← Scan Next
          </button>

          {/* Counter */}
          <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 999,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14
          }}>
            {loadedMarkerIds.length} placed
          </div>

          {/* Model name */}
          <div style={{
            position: 'absolute',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 20,
            fontSize: 16
          }}>
            {currentModel.name}
          </div>

          {/* Model Viewer with AR */}
          <model-viewer
            src={currentModel.glb_url}
            alt={currentModel.name}
            ar
            ar-modes={isAndroid ? "webxr scene-viewer" : "quick-look webxr"}
            ar-scale="fixed"
            ar-placement="floor"
            camera-controls
            shadow-intensity="1"
            style={{ width: '100%', height: '100%' }}
          >
            <button
              slot="ar-button"
              style={{
                position: 'absolute',
                bottom: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#4da6ff',
                color: 'white',
                padding: '16px 40px',
                borderRadius: 25,
                fontSize: 16,
                fontWeight: 'bold',
                border: 'none',
                boxShadow: '0 4px 20px rgba(77,166,255,0.5)'
              }}
            >
              📱 Place in AR
            </button>
          </model-viewer>

          <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" />
        </div>
      ) : (
        /* SCANNER VIEW - Camera with QR detection */
        <>
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <a href="/" className="text-white">← Back</a>
            <span className="text-sm">{loadedMarkerIds.length} models placed</span>
            <span></span>
          </div>

          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {loading ? '⏳ Loading...' : status}
          </div>

          {/* Placed models list */}
          {loadedMarkerIds.length > 0 && (
            <div className="absolute bottom-24 left-4 right-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {loadedMarkerIds.map(id => (
                  <span key={id} className="px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(77,166,255,0.3)', border: '1px solid rgba(77,166,255,0.5)' }}>
                    ✓ Placed
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
            <p className="text-lg font-medium">Point at QR code</p>
            <p className="text-sm text-gray-400 mt-1">Model will appear in AR</p>
          </div>
        </>
      )}
    </div>
  )
}
