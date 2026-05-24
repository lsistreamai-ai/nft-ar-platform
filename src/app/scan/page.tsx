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
        scanLoop()
      }
    } catch (e) {
      console.error('Camera error:', e)
      setPermissionDenied(true)
    }
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(scanLoop)
      return
    }

    if (loading) {
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

    // Draw video to canvas for QR scanning
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, canvas.height)

    if (code && code.data.includes('/view/')) {
      const markerId = code.data.split('/view/')[1]?.split(/[?&]/)[0]
      // Only load if it's a different QR
      if (markerId && markerId !== lastDetectedRef.current) {
        lastDetectedRef.current = markerId
        loadModel(markerId)
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop)
  }

  async function loadModel(markerId: string) {
    setLoading(true)
    setStatus('Loading model...')
    
    const { data } = await supabase.from('image_markers').select('*').eq('id', markerId).single()
    
    if (data) {
      setCurrentModel(data)
      setStatus('')
      // Play narration if exists
      if (data.narration_text) {
        speak(data.narration_text)
      }
    } else {
      setStatus('Model not found')
    }
    
    setLoading(false)
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Scanner</h2>
          <p className="text-gray-400 mb-8">Scan QR code to see 3D model</p>
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
          <h2 className="text-xl font-bold mb-4">Camera Permission Denied</h2>
          <p className="text-gray-400 mb-4">Please allow camera access to use AR scanner</p>
          <button onClick={() => window.location.reload()} style={{
            background: '#4da6ff', color: 'white',
            padding: '14px 30px', borderRadius: 20, border: 'none'
          }}>
            Reload Page
          </button>
        </div>
      ) : (
        <>
          {/* Camera background - VISIBLE */}
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            autoPlay 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 1 }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Header */}
          <div 
            className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center"
            style={{ background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
          >
            <a href="/" className="text-white text-sm no-underline">← Back</a>
            <span className="text-xs">AR Scanner</span>
            <span></span>
          </div>

          {/* Status */}
          {status && (
            <div 
              className="absolute left-1/2 px-4 py-2 rounded-full text-xs"
              style={{ 
                top: '70px', 
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)', 
                zIndex: 100 
              }}
            >
              {status}
            </div>
          )}

          {/* Model centered on camera - blending mode */}
          {currentModel && (
            <div 
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '60%',
                zIndex: 50
              }}
            >
              <model-viewer
                src={currentModel.glb_url}
                alt=""
                camera-controls
                auto-rotate
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}

          {/* Bottom hint */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-5 text-center"
            style={{ 
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', 
              zIndex: 100 
            }}
          >
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              {currentModel ? '✅ Model loaded - Scan another QR to change' : '📷 Point camera at QR code'}
            </p>
          </div>

          {/* Load model-viewer */}
          <script 
            type="module" 
            src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
          />
        </>
      )}
    </div>
  )
}
