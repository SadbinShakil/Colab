'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  Highlighter, MessageSquare, HelpCircle, MousePointer,
  Users, Eye, Share2, MessageCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import ChatSidebar from './ChatSidebar'

// Dynamic import to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Document })),
  { ssr: false }
)
const Page = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Page })),
  { ssr: false }
)

interface CollaborativePDFViewerProps {
  fileUrl: string
  documentId: string
}

interface Annotation {
  id: string
  type: 'highlight' | 'comment' | 'help'
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
  author: string
  authorId: string
  timestamp: string
  pageNumber: number
}

interface User {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number; pageNumber: number }
  isActive: boolean
}

interface CollaborativeEvent {
  type: 'user_joined' | 'user_left' | 'annotation_added' | 'annotation_updated' | 'cursor_moved'
  documentId: string
  userId: string
  userName: string
  data?: any
  timestamp: string
}

const USER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
]

export default function CollaborativePDFViewer({ fileUrl, documentId }: CollaborativePDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [selectedTool, setSelectedTool] = useState<'select' | 'highlight' | 'comment' | 'help'>('select')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Current user info
  const currentUser = {
    id: `user_${Date.now()}`,
    name: `User ${Math.floor(Math.random() * 1000)}`,
    color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
  }

  // Configure PDF.js worker on client side only
  useEffect(() => {
    const setupPDFWorker = async () => {
      try {
        const pdfjs = await import('react-pdf')
        
        // Use .mjs extension for Next.js 15 + Turbopack compatibility
        // This is the recommended solution from Stack Overflow for the "Setting up fake worker failed" error
        pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = 
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.pdfjs.version}/pdf.worker.min.mjs`
        
        console.log('PDF.js worker configured with version:', pdfjs.pdfjs.version)
      } catch (error) {
        console.warn('Failed to configure PDF.js worker:', error)
        // Fallback: Let react-pdf handle worker loading automatically
      }
    }
    
    setupPDFWorker()
  }, [])

  // Set up real-time collaboration
  useEffect(() => {
    const connectToCollaboration = () => {
      const eventSource = new EventSource(
        `/api/collaborative?documentId=${documentId}&userId=${currentUser.id}&userName=${currentUser.name}`
      )

      eventSource.onmessage = (event) => {
        try {
          const collaborativeEvent: CollaborativeEvent = JSON.parse(event.data)
          handleCollaborativeEvent(collaborativeEvent)
        } catch (error) {
          console.error('Failed to parse collaborative event:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        setTimeout(connectToCollaboration, 3000) // Reconnect after 3 seconds
      }

      eventSourceRef.current = eventSource
    }

    connectToCollaboration()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [documentId])

  const handleCollaborativeEvent = (event: CollaborativeEvent) => {
    switch (event.type) {
      case 'user_joined':
        if (event.userId !== currentUser.id) {
          setActiveUsers(prev => {
            const filtered = prev.filter(u => u.id !== event.userId)
            return [...filtered, {
              id: event.userId,
              name: event.userName,
              color: USER_COLORS[filtered.length % USER_COLORS.length],
              isActive: true
            }]
          })
        }
        if (event.data?.annotations) {
          setAnnotations(event.data.annotations)
        }
        break

      case 'user_left':
        setActiveUsers(prev => prev.filter(u => u.id !== event.userId))
        break

      case 'annotation_added':
        if (event.userId !== currentUser.id) {
          setAnnotations(prev => [...prev, event.data])
        }
        break

      case 'cursor_moved':
        if (event.userId !== currentUser.id) {
          setActiveUsers(prev => prev.map(user => 
            user.id === event.userId 
              ? { ...user, cursor: event.data }
              : user
          ))
        }
        break
    }
  }

  const broadcastEvent = async (type: string, data?: any) => {
    try {
      await fetch('/api/collaborative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          documentId,
          userId: currentUser.id,
          userName: currentUser.name,
          data
        })
      })
    } catch (error) {
      console.error('Failed to broadcast event:', error)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    console.log('PDF loaded successfully with', numPages, 'pages')
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
  }

  const goToPrevPage = () => setPageNumber(Math.max(1, pageNumber - 1))
  const goToNextPage = () => setPageNumber(Math.min(numPages, pageNumber + 1))
  const zoomIn = () => setScale(scale + 0.2)
  const zoomOut = () => setScale(Math.max(0.5, scale - 0.2))
  const rotate = () => setRotation((rotation + 90) % 360)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select') return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsSelecting(true)
    setSelectionStart({ x, y })
    setSelection({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Broadcast cursor position for collaboration
    broadcastEvent('cursor_moved', { x, y, pageNumber })

    if (!isSelecting || !selectionStart) return
    
    setSelection({
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    })
  }, [isSelecting, selectionStart, pageNumber])

  const handleMouseUp = async () => {
    if (!isSelecting || !selection || !selectionStart) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelection(null)
      return
    }

    if (selection.width < 10 || selection.height < 10) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelection(null)
      return
    }

    const annotationText = prompt(`Add ${selectedTool}:`) || ''
    if (!annotationText) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelection(null)
      return
    }

    const newAnnotation: Annotation = {
      id: `${Date.now()}_${currentUser.id}`,
      type: selectedTool as 'highlight' | 'comment' | 'help',
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
      color: selectedTool === 'highlight' ? '#ffff00' : selectedTool === 'comment' ? '#00ff00' : '#ff0000',
      text: annotationText,
      author: currentUser.name,
      authorId: currentUser.id,
      timestamp: new Date().toISOString(),
      pageNumber: pageNumber
    }

    // Add locally first for immediate feedback
    setAnnotations(prev => [...prev, newAnnotation])

    // Broadcast to other users
    await broadcastEvent('annotation_added', newAnnotation)

    setIsSelecting(false)
    setSelectionStart(null)
    setSelection(null)
  }

  const shareDocument = async () => {
    const shareUrl = `${window.location.origin}/document/${documentId}`
    try {
      await navigator.share({
        title: 'Collaborative Document',
        text: 'Join me in reviewing this document',
        url: shareUrl
      })
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl)
      alert('Document link copied to clipboard!')
    }
  }

  return (
    <div className="h-full flex bg-white">
      {/* Main PDF Viewer */}
      <div className={`${isChatOpen ? 'flex-1' : 'w-full'} flex flex-col`}>
        {/* Clean Minimal Toolbar - Anara Style */}
        <div className="border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Left - Simple Navigation */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <Button variant="ghost" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center px-3">
                  <Input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageNumber}
                    onChange={(e) => setPageNumber(Math.min(numPages, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-12 h-8 text-center border-0 bg-transparent text-sm"
                  />
                  <span className="text-sm text-gray-500 mx-1">/</span>
                  <span className="text-sm text-gray-500">{numPages}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Center - Document Title */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-sm font-medium text-gray-900 truncate max-w-md">
                Research Document
              </h1>
            </div>

            {/* Right - Essential Controls */}
            <div className="flex items-center space-x-1">
              {/* Zoom Controls */}
              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <Button variant="ghost" size="sm" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-600 px-2 min-w-[40px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button variant="ghost" size="sm" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Collaboration Indicator */}
              {activeUsers.length > 0 && (
                <div className="flex items-center bg-blue-50 rounded-lg px-2 py-1">
                  <div className="flex -space-x-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-white"
                      style={{ backgroundColor: currentUser.color }}
                    />
                    {activeUsers.slice(0, 2).map(user => (
                      <div 
                        key={user.id}
                        className="w-4 h-4 rounded-full border border-white"
                        style={{ backgroundColor: user.color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 ml-2">
                    {activeUsers.length + 1}
                  </span>
                </div>
              )}

              {/* AI Chat Toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`${isChatOpen ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'} transition-colors`}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Annotation Tools - Anara Style */}
        <div className="absolute top-16 left-6 z-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex flex-col space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTool('select')}
              className={`w-8 h-8 p-0 ${selectedTool === 'select' ? 'bg-gray-100' : ''}`}
              title="Select"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTool('highlight')}
              className={`w-8 h-8 p-0 ${selectedTool === 'highlight' ? 'bg-yellow-100 text-yellow-700' : ''}`}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTool('comment')}
              className={`w-8 h-8 p-0 ${selectedTool === 'comment' ? 'bg-blue-100 text-blue-700' : ''}`}
              title="Comment"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTool('help')}
              className={`w-8 h-8 p-0 ${selectedTool === 'help' ? 'bg-red-100 text-red-700' : ''}`}
              title="I'm stuck here"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Clean PDF Container */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="flex justify-center py-8">
            <div 
              ref={containerRef}
              className="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ cursor: selectedTool === 'select' ? 'default' : 'crosshair' }}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading PDF...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center p-16">
                    <div className="text-center text-gray-500">
                      <p className="font-medium">Failed to load PDF</p>
                      <p className="text-sm mt-2">Please check the file and try again</p>
                    </div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  loading={
                    <div className="flex items-center justify-center p-16 bg-gray-50">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-16 bg-red-50">
                      <div className="text-center text-red-600">
                        <p className="font-medium">Failed to load page</p>
                      </div>
                    </div>
                  }
                />
              </Document>

              {/* Live Cursors - Minimal Style */}
              {activeUsers
                .filter(user => user.cursor?.pageNumber === pageNumber)
                .map(user => (
                  <div
                    key={user.id}
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: user.cursor!.x,
                      top: user.cursor!.y,
                      transform: 'translate(-2px, -2px)'
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: user.color }}
                    />
                    <div 
                      className="absolute top-4 left-0 px-2 py-1 rounded-md text-xs text-white whitespace-nowrap shadow-sm"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name}
                    </div>
                  </div>
                ))}

              {/* Selection overlay - Clean Style */}
              {selection && isSelecting && (
                <div
                  className="absolute border-2 border-blue-400 bg-blue-50 bg-opacity-20 pointer-events-none"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height
                  }}
                />
              )}

              {/* Annotations - Clean Style */}
              {annotations
                .filter(ann => ann.pageNumber === pageNumber)
                .map(annotation => (
                  <div
                    key={annotation.id}
                    className="absolute border bg-opacity-25 hover:bg-opacity-40 transition-opacity cursor-pointer"
                    style={{
                      left: annotation.x,
                      top: annotation.y,
                      width: annotation.width,
                      height: annotation.height,
                      backgroundColor: annotation.color,
                      borderColor: annotation.color,
                      borderWidth: '1px'
                    }}
                    title={`${annotation.type} by ${annotation.author}: ${annotation.text}`}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Chat Sidebar */}
      <ChatSidebar
        documentId={documentId}
        currentUser={currentUser}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  )
} 