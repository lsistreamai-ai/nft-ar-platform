'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageMarker } from '@/types'

interface Book {
  id: string
  name: string
  markers: ImageMarker[]
}

export default function Dashboard() {
  const [markers, setMarkers] = useState<ImageMarker[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<string>('all')
  const [showNewBook, setShowNewBook] = useState(false)
  const [newBookName, setNewBookName] = useState('')
  const [selected, setSelected] = useState<ImageMarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [name, setName] = useState('')
  const [glbUrl, setGlbUrl] = useState('')
  const [bookId, setBookId] = useState('')
  const [scale, setScale] = useState('0.5')

  useEffect(() => { loadData() }, [])
  
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [message])

  async function loadData() {
    const { data } = await supabase.from('image_markers').select('*').order('created_at', { ascending: false })
    if (data) {
      setMarkers(data)
      // Extract unique books from markers
      const bookMap = new Map<string, Book>()
      data.forEach(m => {
        const bid = m.book_id || 'uncategorized'
        if (!bookMap.has(bid)) {
          bookMap.set(bid, { id: bid, name: bid === 'uncategorized' ? 'Uncategorized' : bid, markers: [] })
        }
        bookMap.get(bid)!.markers.push(m)
      })
      setBooks(Array.from(bookMap.values()))
    }
    setLoading(false)
  }

  function selectMarker(m: ImageMarker) {
    setSelected(m)
    setName(m.name)
    setGlbUrl(m.glb_url)
    setBookId(m.book_id || '')
    setScale(String(m.scale))
  }

  function clearForm() {
    setSelected(null)
    setName('')
    setGlbUrl('')
    setBookId(selectedBook === 'all' ? '' : selectedBook)
    setScale('0.5')
  }

  async function saveMarker(e: React.FormEvent) {
    e.preventDefault()
    if (!glbUrl) return
    setSaving(true)

    const data = {
      name: name || 'Untitled',
      image_url: selected?.image_url || '',
      glb_url: glbUrl,
      book_id: bookId || null,
      scale: parseFloat(scale) || 0.5,
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }

    const { error } = selected?.id
      ? await supabase.from('image_markers').update(data).eq('id', selected.id)
      : await supabase.from('image_markers').insert(data)

    if (!error) {
      setMessage({ type: 'success', text: 'Saved!' })
      await loadData()
      clearForm()
    } else {
      setMessage({ type: 'error', text: error.message })
    }
    setSaving(false)
  }

  async function deleteMarker(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('image_markers').delete().eq('id', id)
    await loadData()
    clearForm()
    setMessage({ type: 'success', text: 'Deleted' })
  }

  function getQRCodeUrl(markerId: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/view/${markerId}`)}`
  }

  function downloadQR(m: ImageMarker) {
    const link = document.createElement('a')
    link.download = `qr-${m.name}.png`
    link.href = getQRCodeUrl(m.id)
    link.click()
  }

  function createBook() {
    if (!newBookName.trim()) return
    setBooks([...books, { id: newBookName, name: newBookName, markers: [] }])
    setBookId(newBookName)
    setShowNewBook(false)
    setNewBookName('')
    setMessage({ type: 'success', text: `Book "${newBookName}" created! Add markers to it.` })
  }

  const filteredMarkers = selectedBook === 'all' 
    ? markers 
    : markers.filter(m => (m.book_id || 'uncategorized') === selectedBook)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📷 AR Book Platform</h1>
            <p className="text-sm text-gray-400">{markers.length} markers in {books.length} books</p>
          </div>
          <a href="/scan" className="btn btn-secondary text-sm">
            📱 Scanner
          </a>
        </div>
      </header>

      {message && (
        <div className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-xl text-center ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Books Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">📚 Books</h2>
            <button onClick={() => setShowNewBook(true)} className="btn btn-primary text-sm">
              + New Book
            </button>
          </div>
          
          {showNewBook && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
                placeholder="Book name (e.g., Hidden Kingdoms)"
                className="flex-1"
              />
              <button onClick={createBook} className="btn btn-primary">Create</button>
              <button onClick={() => setShowNewBook(false)} className="btn btn-secondary">Cancel</button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBook('all')}
              className={`px-4 py-2 rounded-lg ${selectedBook === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              All ({markers.length})
            </button>
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book.id)}
                className={`px-4 py-2 rounded-lg ${selectedBook === book.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {book.name} ({book.markers.length})
              </button>
            ))}
          </div>
        </div>

        {/* Create/Edit Marker */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">{selected?.id ? 'Edit Marker' : 'Create Marker'}</h2>
          
          <form onSubmit={saveMarker} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Dragon"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Book</label>
              <select value={bookId} onChange={e => setBookId(e.target.value)}>
                <option value="">No book</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">GLB URL *</label>
              <input
                type="url"
                value={glbUrl}
                onChange={e => setGlbUrl(e.target.value)}
                placeholder="https://...model.glb"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Scale</label>
                <input type="number" step="0.1" value={scale} onChange={e => setScale(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving || !name || !glbUrl} className="btn btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Marker'}
              </button>
              {selected?.id && (
                <button type="button" onClick={() => deleteMarker(selected.id)} className="btn btn-danger">
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Markers */}
        {filteredMarkers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">
              {selectedBook === 'all' ? 'All Markers' : books.find(b => b.id === selectedBook)?.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarkers.map(m => (
                <div key={m.id} className="card overflow-hidden">
                  <div className="bg-white p-4 flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <img src={getQRCodeUrl(m.id)} alt="QR" className="max-h-48" />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold truncate">{m.name}</h3>
                    {m.book_id && <p className="text-xs text-gray-400">{m.book_id}</p>}
                    
                    <div className="flex gap-2 mt-3">
                      <a href={`/view/${m.id}`} target="_blank" className="btn btn-primary flex-1 text-sm py-2 text-center">
                        👁️ View AR
                      </a>
                      <button onClick={() => downloadQR(m)} className="btn btn-secondary text-sm py-2">
                        📥 QR
                      </button>
                      <button onClick={() => selectMarker(m)} className="btn btn-secondary text-sm py-2">
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
