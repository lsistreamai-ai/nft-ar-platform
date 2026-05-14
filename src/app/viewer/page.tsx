'use client'

import { useEffect, useState } from 'react'

export default function ARViewerPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <iframe 
        src="/ar-viewer.html" 
        className="w-full h-full border-0"
        allow="camera; microphone; fullscreen"
      />
    </div>
  )
}
