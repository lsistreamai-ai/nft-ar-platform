import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Image AR Platform',
  description: 'Upload images and assign 3D models for AR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
