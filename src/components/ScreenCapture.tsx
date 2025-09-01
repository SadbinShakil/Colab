'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Scissors, 
  X, 
  Camera,
  Square,
  Download,
  Zap,
  Eye,
  RotateCcw
} from 'lucide-react'

interface ScreenCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (imageData: string) => void
  targetElementId?: string // ID of the PDF viewer element
}

interface SelectionArea {
  startX: number
  startY: number
  endX: number
  endY: number
}

export default function ScreenCapture({ 
  isOpen, 
  onClose, 
  onCapture, 
  targetElementId = 'pdf-viewer' 
}: ScreenCaptureProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<SelectionArea | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelection(null)
      setIsSelecting(false)
      setIsCapturing(false)
    }
  }, [isOpen])

  const startSelection = useCallback(() => {
    setIsSelecting(true)
    setSelection(null)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    setSelection({
      startX,
      startY,
      endX: startX,
      endY: startY
    })
  }, [isSelecting])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selection) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top
    
    setSelection(prev => prev ? {
      ...prev,
      endX,
      endY
    } : null)
  }, [isSelecting, selection])

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selection) {
      setIsSelecting(false)
    }
  }, [isSelecting, selection])

  const captureArea = useCallback(async () => {
    if (!selection) return
    
    setIsCapturing(true)
    
    try {
      // Dynamic import of html2canvas for client-side only
      const html2canvas = (await import('html2canvas')).default
      
      // Get the target element (PDF viewer)
      const targetElement = document.getElementById(targetElementId)
      if (!targetElement) {
        throw new Error('PDF viewer element not found')
      }

      console.log('🖼️ Starting real screen capture with html2canvas...')
      
      // Calculate actual selection coordinates
      const actualSelection = {
        x: Math.min(selection.startX, selection.endX),
        y: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY)
      }

      // Use html2canvas to capture the actual PDF content
      const fullCanvas = await html2canvas(targetElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      })

      console.log('✅ Full page captured, now cropping selection...')

      // Create a new canvas for the cropped area
      const croppedCanvas = document.createElement('canvas')
      const ctx = croppedCanvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Set the cropped canvas size
      croppedCanvas.width = actualSelection.width * 2
      croppedCanvas.height = actualSelection.height * 2

      // Draw the selected area from the full capture
      ctx.drawImage(
        fullCanvas,
        actualSelection.x * 2, // Source X (scaled)
        actualSelection.y * 2, // Source Y (scaled)  
        actualSelection.width * 2, // Source width (scaled)
        actualSelection.height * 2, // Source height (scaled)
        0, // Destination X
        0, // Destination Y
        actualSelection.width * 2, // Destination width
        actualSelection.height * 2  // Destination height
      )

      // Convert to base64
      const imageDataUrl = croppedCanvas.toDataURL('image/png', 0.9)
      
      console.log('🎯 Screen capture completed successfully:', {
        originalSize: fullCanvas.width + 'x' + fullCanvas.height,
        croppedSize: actualSelection.width + 'x' + actualSelection.height,
        imageDataLength: imageDataUrl.length,
        isValidImage: imageDataUrl.startsWith('data:image/png')
      })

      // Call the callback with the captured image
      onCapture(imageDataUrl)
      
      // Close the capture tool
      onClose()
      
    } catch (error) {
      console.error('❌ Real screen capture failed:', error)
      
      // Fallback to a more descriptive mock if html2canvas fails
      try {
        const actualSelection = {
          x: Math.min(selection.startX, selection.endX),
          y: Math.min(selection.startY, selection.endY),
          width: Math.abs(selection.endX - selection.startX),
          height: Math.abs(selection.endY - selection.startY)
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          canvas.width = actualSelection.width * 2
          canvas.height = actualSelection.height * 2
          ctx.scale(2, 2)
          
          // Create a more realistic fallback
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, actualSelection.width, actualSelection.height)
          
          ctx.fillStyle = '#f8fafc'
          ctx.fillRect(10, 10, actualSelection.width - 20, actualSelection.height - 20)
          
          ctx.strokeStyle = '#e2e8f0'
          ctx.lineWidth = 1
          ctx.strokeRect(10, 10, actualSelection.width - 20, actualSelection.height - 20)
          
          ctx.fillStyle = '#1e293b'
          ctx.font = 'bold 14px Arial'
          ctx.fillText('📄 PDF Content Area', 20, 35)
          
          ctx.font = '12px Arial'
          ctx.fillStyle = '#64748b'
          ctx.fillText('Screen capture unavailable - using fallback', 20, 55)
          ctx.fillText(`Selected: ${actualSelection.width}×${actualSelection.height}px`, 20, 75)
          
          const fallbackImageData = canvas.toDataURL('image/png', 0.9)
          onCapture(fallbackImageData)
          onClose()
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
        alert('Screen capture failed. Please try again.')
      }
    } finally {
      setIsCapturing(false)
    }
  }, [selection, onCapture, onClose, targetElementId])

  const resetSelection = useCallback(() => {
    setSelection(null)
    setIsSelecting(false)
  }, [])

  if (!isOpen) return null

  const selectionStyle = selection ? {
    left: Math.min(selection.startX, selection.endX),
    top: Math.min(selection.startY, selection.endY),
    width: Math.abs(selection.endX - selection.startX),
    height: Math.abs(selection.endY - selection.startY)
  } : {}

  return (
    <div className="fixed inset-0 z-50">
      {/* Darkened overlay with cutout for selected area */}
      <div className="absolute inset-0 pointer-events-none">
        {selection && (
          <svg className="w-full h-full">
            <defs>
              <mask id="cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={Math.min(selection.startX, selection.endX)}
                  y={Math.min(selection.startY, selection.endY)}
                  width={Math.abs(selection.endX - selection.startX)}
                  height={Math.abs(selection.endY - selection.startY)}
                  fill="black"
                />
              </mask>
            </defs>
            <rect 
              width="100%" 
              height="100%" 
              fill="rgba(0,0,0,0.6)" 
              mask="url(#cutout)"
            />
          </svg>
        )}
        {!selection && (
          <div className="w-full h-full bg-black/40"></div>
        )}
      </div>

      {/* Instructions Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-60">
        <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scissors className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-base">Screen Capture</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  Snipping Mode
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              {!isSelecting && !selection && (
                <Button
                  onClick={startSelection}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Square className="w-4 h-4" />
                  <span>Start Selection</span>
                </Button>
              )}
              
              {isSelecting && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                  <Square className="w-3 h-3 animate-pulse" />
                  <span className="text-xs font-medium">Click and drag to select area</span>
                </div>
              )}
              
              {selection && !isSelecting && (
                <>
                  <Button
                    onClick={captureArea}
                    disabled={isCapturing}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    {isCapturing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Capturing...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Capture & Analyze</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={resetSelection}
                    variant="outline"
                    className="flex items-center space-x-2"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </Button>
                </>
              )}
            </div>
            
            {selection && (
              <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-1 rounded">
                Selected: {Math.abs(selection.endX - selection.startX)}×{Math.abs(selection.endY - selection.startY)}px
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selection Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Selection Rectangle */}
        {selection && (
          <div
            ref={selectionRef}
            className="absolute border-4 border-red-500 shadow-lg pointer-events-none"
            style={{
              ...selectionStyle,
              backgroundColor: 'transparent',
              boxShadow: '0 0 0 2px white, 0 0 0 4px #ef4444, 0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            {/* Corner handles - larger and more visible */}
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-lg animate-pulse pointer-events-auto"></div>
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-lg animate-pulse pointer-events-auto"></div>
            <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-lg animate-pulse pointer-events-auto"></div>
            <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-lg animate-pulse pointer-events-auto"></div>
            
            {/* Side handles for better visibility */}
            <div className="absolute -top-1 left-1/2 w-3 h-3 bg-red-500 border border-white rounded-full transform -translate-x-1/2 pointer-events-auto"></div>
            <div className="absolute -bottom-1 left-1/2 w-3 h-3 bg-red-500 border border-white rounded-full transform -translate-x-1/2 pointer-events-auto"></div>
            <div className="absolute -left-1 top-1/2 w-3 h-3 bg-red-500 border border-white rounded-full transform -translate-y-1/2 pointer-events-auto"></div>
            <div className="absolute -right-1 top-1/2 w-3 h-3 bg-red-500 border border-white rounded-full transform -translate-y-1/2 pointer-events-auto"></div>
            
            {/* Dimensions label with better contrast */}
            {Math.abs(selection.endX - selection.startX) > 50 && Math.abs(selection.endY - selection.startY) > 30 && (
              <div className="absolute -top-8 left-0 bg-red-600 text-white text-sm px-3 py-1 rounded shadow-lg border-2 border-white font-bold pointer-events-auto">
                📏 {Math.abs(selection.endX - selection.startX)}×{Math.abs(selection.endY - selection.startY)}px
              </div>
            )}
            
            {/* Center crosshair for better positioning */}
            <div className="absolute left-1/2 top-1/2 w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-full h-0.5 bg-red-500 absolute top-1/2 transform -translate-y-1/2"></div>
              <div className="h-full w-0.5 bg-red-500 absolute left-1/2 transform -translate-x-1/2"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
