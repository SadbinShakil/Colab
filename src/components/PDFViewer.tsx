'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { 
  ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, 
  Search, Settings, Download, Highlighter, MessageSquare, 
  HelpCircle, Eye, Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
)

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
)
// hello 

interface Annotation {
  id: string
  type: 'highlight' | 'comment' | 'stuck'
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
  author: string
  timestamp: string
  pageNumber: number
}

interface PDFViewerProps {
  pdfUrl: string
  documentId: string
}

export default function PDFViewer({ pdfUrl, documentId }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [searchText, setSearchText] = useState<string>('')
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [selectionType, setSelectionType] = useState<'highlight' | 'comment' | 'stuck'>('highlight')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Debug: Log PDF URL
  console.log('PDFViewer received URL:', pdfUrl)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
    
    // Configure PDF.js worker for Next.js - use CDN for reliability
    import('react-pdf').then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.js`
      console.log('PDF.js worker configured:', pdfjs.pdfjs.GlobalWorkerOptions.workerSrc)
    }).catch((error) => {
      console.error('Failed to configure PDF.js worker:', error)
    })

    // Load existing annotations
    loadAnnotations()
  }, [documentId])

  const loadAnnotations = async () => {
    try {
      const response = await fetch(`/api/annotations?documentId=${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setAnnotations(data.annotations || [])
      }
    } catch (error) {
      console.error('Failed to load annotations:', error)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setPdfError('Failed to load PDF. Please try again.')
    setIsLoading(false)
  }

  const goToPrevPage = () => {
    setPageNumber(page => Math.max(1, page - 1))
  }

  const goToNextPage = () => {
    setPageNumber(page => Math.min(numPages, page + 1))
  }

  const zoomIn = () => {
    setScale(scale => Math.min(3, scale + 0.2))
  }

  const zoomOut = () => {
    setScale(scale => Math.max(0.5, scale - 0.2))
  }

  const rotateClockwise = () => {
    setRotation(rotation => (rotation + 90) % 360)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !pageRef.current) return
    
    const rect = pageRef.current.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX - rect.left
      const currentY = moveEvent.clientY - rect.top
      
      // Create selection rectangle visual feedback
      const selection = document.getElementById('pdf-selection')
      if (selection) {
        const left = Math.min(startX, currentX)
        const top = Math.min(startY, currentY)
        const width = Math.abs(currentX - startX)
        const height = Math.abs(currentY - startY)
        
        selection.style.left = `${left}px`
        selection.style.top = `${top}px`
        selection.style.width = `${width}px`
        selection.style.height = `${height}px`
        selection.style.display = 'block'
      }
    }
    
    const onMouseUp = (upEvent: MouseEvent) => {
      const endX = upEvent.clientX - rect.left
      const endY = upEvent.clientY - rect.top
      
      // Hide selection rectangle
      const selection = document.getElementById('pdf-selection')
      if (selection) {
        selection.style.display = 'none'
      }
      
      // Create annotation
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: selectionType,
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
        color: selectionType === 'highlight' ? '#ffeb3b' : selectionType === 'comment' ? '#2196f3' : '#f44336',
        text: '',
        author: 'Current User',
        timestamp: new Date().toISOString(),
        pageNumber: pageNumber
      }
      
      if (annotation.width > 10 && annotation.height > 10) {
        setAnnotations(prev => [...prev, annotation])
        saveAnnotation(annotation)
      }
      
      setIsSelecting(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [isSelecting, selectionType, pageNumber])

  const saveAnnotation = async (annotation: Annotation) => {
    try {
      await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          annotation
        })
      })
    } catch (error) {
      console.error('Failed to save annotation:', error)
    }
  }

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation)
  }

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'rgba(255, 235, 59, 0.5)'
      case 'comment': return 'rgba(33, 150, 243, 0.5)'
      case 'stuck': return 'rgba(244, 67, 54, 0.5)'
      default: return 'rgba(158, 158, 158, 0.5)'
    }
  }

  // Don't render anything until mounted (client-side only)
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading PDF viewer...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotateClockwise}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search in document..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Annotation Tools */}
      <div className="flex items-center space-x-2 p-4 bg-white border-b border-gray-200">
        <span className="text-sm font-medium">Annotation Tools:</span>
        <Button
          variant={selectionType === 'highlight' && isSelecting ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectionType('highlight')
            setIsSelecting(!isSelecting || selectionType !== 'highlight')
          }}
        >
          <Highlighter className="h-4 w-4 mr-1" />
          Highlight
        </Button>
        <Button
          variant={selectionType === 'comment' && isSelecting ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectionType('comment')
            setIsSelecting(!isSelecting || selectionType !== 'comment')
          }}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Comment
        </Button>
        <Button
          variant={selectionType === 'stuck' && isSelecting ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectionType('stuck')
            setIsSelecting(!isSelecting || selectionType !== 'stuck')
          }}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          I'm stuck here
        </Button>
        {isSelecting && (
          <span className="text-sm text-blue-600">
            Click and drag to create {selectionType}
          </span>
        )}
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="flex justify-center p-4">
          {isLoading && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          )}
          
          {pdfError && (
            <div className="text-center p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{pdfError}</p>
                <p className="text-sm text-red-600 mt-2">
                  Please check if the PDF file exists and is accessible.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  PDF URL: {pdfUrl}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => window.open(pdfUrl, '_blank')}
                >
                  Test PDF Link
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !pdfError && (
            <div className="relative" ref={pageRef} onMouseDown={handleMouseDown}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                onLoadProgress={({ loaded, total }) => {
                  console.log('PDF Loading progress:', Math.round((loaded / total) * 100) + '%')
                }}
                loading={
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading document...</span>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  className="pdf-page"
                  loading={
                    <div className="flex items-center justify-center h-96 bg-gray-100 border-2 border-dashed border-gray-300">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  }
                />
              </Document>

              {/* Annotations overlay */}
              {annotations
                .filter(annotation => annotation.pageNumber === pageNumber)
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className="pdf-annotation absolute border-2 cursor-pointer"
                    style={{
                      left: `${annotation.x * scale}px`,
                      top: `${annotation.y * scale}px`,
                      width: `${annotation.width * scale}px`,
                      height: `${annotation.height * scale}px`,
                      backgroundColor: getAnnotationColor(annotation.type),
                      borderColor: annotation.color,
                    }}
                    onClick={() => handleAnnotationClick(annotation)}
                    title={`${annotation.type} by ${annotation.author}`}
                  />
                ))}

              {/* Selection rectangle */}
              <div
                id="pdf-selection"
                className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Annotation Details Panel */}
      {selectedAnnotation && (
        <div className="absolute top-20 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {selectedAnnotation.type.charAt(0).toUpperCase() + selectedAnnotation.type.slice(1)}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAnnotation(null)}
            >
              ×
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Author:</strong> {selectedAnnotation.author}</p>
            <p><strong>Page:</strong> {selectedAnnotation.pageNumber}</p>
            <p><strong>Created:</strong> {new Date(selectedAnnotation.timestamp).toLocaleString()}</p>
            {selectedAnnotation.type === 'stuck' && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700 text-xs">
                  <HelpCircle className="h-3 w-3 inline mr-1" />
                  This user needs help understanding this section
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}