'use client'

import { useEffect, useRef, useState } from 'react'

export default function TestPDFPage() {
  const viewer = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    console.log('TestPDF: Starting WebViewer test')

    // Test with the most recent uploaded file
    const testUrl = '/uploads/1752814207697-Farees___MobileHCI_2025___Smartwatch_Interaction___updated.pdf'
    console.log('TestPDF: Test URL:', testUrl)

    // Dynamically import WebViewer
    import('@pdftron/webviewer').then((module) => {
      if (!mounted) return
      
      const WebViewer = module.default
      
      if (viewer.current) {
        console.log('TestPDF: Initializing WebViewer with minimal config')
        
        WebViewer(
          {
            path: '/lib',
            initialDoc: testUrl,
          },
          viewer.current,
        ).then((instance: any) => {
          if (!mounted) return
          
          console.log('TestPDF: WebViewer instance created')
          const { documentViewer } = instance.Core
          
          // Set timeout for loading
          const timeout = setTimeout(() => {
            setError('PDF load timeout after 10 seconds')
            setIsLoading(false)
          }, 10000)
          
          documentViewer.addEventListener('documentLoaded', () => {
            clearTimeout(timeout)
            console.log('TestPDF: Document loaded successfully!')
            setSuccess(`PDF loaded successfully! Pages: ${documentViewer.getPageCount()}`)
            setIsLoading(false)
          })

          documentViewer.addEventListener('documentLoadFailed', (error: any) => {
            clearTimeout(timeout)
            console.error('TestPDF: Document load failed:', error)
            setError(`PDF load failed: ${error?.message || 'Unknown error'}`)
            setIsLoading(false)
          })

        }).catch((err: any) => {
          console.error('TestPDF: WebViewer initialization failed:', err)
          setError(`WebViewer init failed: ${err.message}`)
          setIsLoading(false)
        })
      }
    }).catch((err: any) => {
      console.error('TestPDF: Failed to load WebViewer module:', err)
      setError(`Failed to load WebViewer: ${err.message}`)
      setIsLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="h-screen bg-white">
      <div className="p-4 bg-gray-100 border-b">
        <h1 className="text-xl font-bold">PDF WebViewer Test</h1>
        <p className="text-sm text-gray-600">Testing PDF loading with minimal configuration</p>
        
        {isLoading && (
          <div className="mt-2 text-blue-600">
            Loading PDF...
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}
        
        {success && (
          <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
            Success: {success}
          </div>
        )}
      </div>
      
      <div 
        className="flex-1" 
        ref={viewer}
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
} 