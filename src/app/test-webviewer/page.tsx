'use client'

import { useEffect, useRef, useState } from 'react'

export default function TestWebViewerPage() {
  const viewer = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    console.log('TestWebViewer: Starting minimal test')
    setStatus('Loading WebViewer...')

    // Test with a simple, guaranteed working PDF
    const testPdfUrl = '/uploads/1752815217698-Copy_of_Paywall-KDD.pptx.pdf'
    
    import('@pdftron/webviewer').then((module) => {
      if (!mounted) return
      
      const WebViewer = module.default
      
      if (viewer.current) {
        console.log('TestWebViewer: Initializing with minimal config')
        setStatus('Initializing WebViewer...')
        
        WebViewer(
          {
            path: '/lib',
            // Start without any document first
            enableAnnotations: false,
            enableRedaction: false,
            enableMeasurement: false,
            enableFilePicker: false,
            ui: 'default'
          },
          viewer.current
        ).then((instance: any) => {
          if (!mounted) return
          
          console.log('TestWebViewer: Instance created, loading document')
          setStatus('Loading document...')
          
          const { documentViewer } = instance.Core
          
          // Add event listeners
          documentViewer.addEventListener('documentLoaded', () => {
            console.log('TestWebViewer: Document loaded successfully!')
            setStatus('✅ Document loaded successfully!')
            setError(null)
          })
          
          documentViewer.addEventListener('documentLoadFailed', (err: any) => {
            console.error('TestWebViewer: Document load failed:', err)
            setError(`Document load failed: ${err}`)
            setStatus('❌ Document load failed')
          })
          
          // Load document manually
          console.log('TestWebViewer: Loading PDF:', testPdfUrl)
          documentViewer.loadDocument(testPdfUrl)
          
        }).catch((err: any) => {
          console.error('TestWebViewer: WebViewer init failed:', err)
          setError(`WebViewer init failed: ${err}`)
          setStatus('❌ WebViewer initialization failed')
        })
      }
    }).catch((err: any) => {
      console.error('TestWebViewer: Module load failed:', err)
      setError(`Module load failed: ${err}`)
      setStatus('❌ Module load failed')
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">WebViewer Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg">{status}</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 font-medium">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold">WebViewer Container</h2>
          </div>
          <div 
            ref={viewer}
            className="w-full"
            style={{ height: '600px' }}
          />
        </div>
      </div>
    </div>
  )
} 