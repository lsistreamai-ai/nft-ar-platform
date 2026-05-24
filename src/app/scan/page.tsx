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
  const [modelViewerReady, setModelViewerReady] = useState(false)
  const animationRef = useRef<number>(0)
  const lastDetectedRef = useRef<string>('')

  // Load model-viewer script FIRST
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.onload = () => {
      console.log('model-viewer loaded')
      setModelViewerReady(true)
    }
    script.onerror = () => {
      console.error('Failed to load model-viewer')
    }
    document.body.appendChild(script)
    
    return () => {
      if (camera) camera.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  useEffect(() => {
    if (permissionAsked && camera && modelViewerReady) {
      scanLoop()
    }
  }, [permissionAsked, camera, modelViewerReady])

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
      console.error('Camera error:', e)
      setPermissionDenied(true)
    }
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current) {
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

    // Draw video frame to canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Scan for QR code
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      console.log('QR detected:', code.data)
      
      if (code.data.includes('/view/')) {
        const markerId = code.data.split('/view/')[1]?.split(/[?&]/)[0]
        
        if (markerId && markerId !== lastDetectedRef.current) {
          console.log('Loading marker:', markerId)
          lastDetectedRef.current = markerId
          loadModel(markerId)
        }
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop)
  }

  async function loadModel(markerId: string) {
    setLoading(true)
    setStatus('Loading model...')
    
    try {
      const { data, error } = await supabase
        .from('image_markers')
        .select('*')
        .eq('id', markerId)
        .single()
      
      if (error) {
        console.error('Supabase error:', error)
        setStatus('Error loading model')
      } else if (data) {
        console.log('Model loaded:', data.name)
        setCurrentModel(data)
        setStatus('')
        
        // Play narration if exists
        if (data.narration_text) {
          const utterance = new SpeechSynthesisUtterance(data.narration_text)
          utterance.rate = 0.9
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
        }
      } else {
        setStatus('Model not found')
      }
    } catch (e) {
      console.error('Load error:', e)
      setStatus('Error loading model')
    }
    
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {!permissionAsked ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 80, marginBottom: 30 }}>📷</div>
          <h2 className="text-2xl font-bold mb-4">AR Scanner</h2>
          <p className="text-gray-400 mb-8">Scan QR code to see 3D model</p>
          <button 
            onClick={requestCamera} 
            style={{
              background: '#4da6ff', 
              color: 'white',
              padding: '18px 50px', 
              borderRadius: 30,
              fontSize: 18, 
              fontWeight: 'bold', 
              border: 'none'
            }}
          >
            📷 Enable Camera
          </button>
        </div>
      ) : permissionDenied ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚫</div>
          <h2 className="text-xl font-bold mb-4">Camera Permission Denied</h2>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#4da6ff', 
              color: 'white',
              padding: '14px 30px', 
              borderRadius: 20, 
              border: 'none'
            }}
          >
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
              objectFit: 'cover',
              zIndex: 1
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Header */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 100
            }}
          >
            <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: 14 }}>← Back</a>
            <span style={{ fontSize: 14 }}>AR Scanner</span>
            <span></span>
          </div>

          {/* Status */}
          {status && (
            <div 
              style={{
                position: 'fixed',
                top: 70,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 20px',
                borderRadius: 20,
                background: 'rgba(0,0,0,0.5)',
                fontSize: 14,
                zIndex: 100
              }}
            >
              {status}
            </div>
          )}

          {/* Model centered - blending mode */}
          {modelViewerReady && currentModel && (
            <div 
              style={{
                position: 'absolute',
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
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '20px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              zIndex: 100,
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              {currentModel ? '✅ Model loaded - Scan another QR to change' : '📷 Point at QR code'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
