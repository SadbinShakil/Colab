'use client'

import { useEffect, useRef, useState } from 'react'
import firebaseClient from '@/lib/firebaseClient.js'

interface FirebaseWebViewerSimpleProps {
  documentUrl: string
  documentId: string
  userName?: string
  userId?: string
  onHighlightAdd?: (highlight: any) => void
  onAnnotationAdd?: (annotation: any) => void
  onPageChange?: (page: number) => void
  onScroll?: (scrollData: any) => void
  extractedText?: string
}

export default function FirebaseWebViewerSimple({
  documentUrl,
  documentId,
  userName = 'Anonymous',
  userId = 'anonymous',
  onHighlightAdd,
  onAnnotationAdd,
  onPageChange,
  onScroll,
  extractedText
}: FirebaseWebViewerSimpleProps) {
  const viewer = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [webViewerInstance, setWebViewerInstance] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Initialize Firebase authentication
    const initFirebase = async () => {
      try {
        console.log('🔥 Initializing Firebase for WebViewer...')
        
        // Sign in anonymously
        await firebaseClient.signInAnonymously()
        
        // Listen for auth state changes
        firebaseClient.onAuthStateChanged((user) => {
          if (user) {
            console.log('✅ Firebase authenticated:', user.uid)
            setIsAuthenticated(true)
            setupWebViewer()
          } else {
            console.log('❌ Firebase not authenticated')
            setIsAuthenticated(false)
          }
        })
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error)
        setError('Failed to initialize Firebase authentication')
        // Continue with WebViewer setup even if Firebase fails
        setupWebViewer()
      }
    }

    initFirebase()
  }, [userName])

  const setupWebViewer = async () => {
    if (!viewer.current) return

    try {
      console.log('🔄 Setting up Apryse WebViewer...')
      
      // Load Apryse WebViewer
      const WebViewer = (await import('@pdftron/webviewer')).default
      
      const instance = await WebViewer(
        {
          path: '/lib',
          initialDoc: documentUrl,
          // Enable real-time collaboration
          enableRealTimeCollaboration: true,
          // Firebase configuration for collaboration
          realTimeCollaboration: {
            server: firebaseServer,
            documentId: documentId
          }
        },
        viewer.current
      )

      setWebViewerInstance(instance)
      setIsLoading(false)

      // Set up event listeners
      const { documentViewer, annotationManager } = instance.Core

      // Page change events
      documentViewer.addEventListener('pageNumberChanged', (pageNumber: number) => {
        setCurrentPage(pageNumber)
        onPageChange?.(pageNumber)
      })

      // Annotation events
      annotationManager.addEventListener('annotationChanged', (annotations: any[], action: string, info: any) => {
        console.log('📝 Annotation changed:', { action, count: annotations.length })
        
        if (action === 'add' && info?.annotation) {
          const annotation = info.annotation
          
          // Handle highlight annotations
          if (annotation.Subject === 'Highlight') {
            const highlightData = {
              id: annotation.Id,
              userId: userId,
              userName: userName,
              pageNumber: annotation.PageNumber,
              x: annotation.X,
              y: annotation.Y,
              width: annotation.Width,
              height: annotation.Height,
              color: annotation.Color ? `rgb(${annotation.Color.R}, ${annotation.Color.G}, ${annotation.Color.B})` : '#ffff00',
              text: annotation.Contents || '',
              timestamp: new Date().toISOString()
            }
            
            onHighlightAdd?.(highlightData)
            onAnnotationAdd?.(highlightData)
          }
        }
      })

      // Scroll events
      documentViewer.addEventListener('scrollViewChanged', (scrollData: any) => {
        onScroll?.(scrollData)
      })

      // Set up Firebase real-time collaboration listeners
      setupFirebaseListeners(instance)

    } catch (error) {
      console.error('❌ WebViewer setup failed:', error)
      setError('Failed to initialize WebViewer')
      setIsLoading(false)
    }
  }

  const setupFirebaseListeners = (instance: any) => {
    console.log('🔥 Setting up Firebase real-time collaboration listeners...')
    
    // Listen for annotation creation
    firebaseClient.onAnnotationCreated((snapshot) => {
      const annotation = snapshot.val()
      console.log('📝 Firebase annotation created:', annotation)
    })

    // Listen for annotation updates
    firebaseClient.onAnnotationUpdated((snapshot) => {
      const annotation = snapshot.val()
      console.log('📝 Firebase annotation updated:', annotation)
    })

    // Listen for annotation deletion
    firebaseClient.onAnnotationDeleted((snapshot) => {
      const annotation = snapshot.val()
      console.log('📝 Firebase annotation deleted:', annotation)
    })
  }

  return (
    <div className="w-full h-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isAuthenticated ? 'Loading WebViewer...' : 'Connecting to Firebase...'}
            </p>
          </div>
        </div>
      )}
      
      <div 
        ref={viewer} 
        className="w-full h-full"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      
      {!isLoading && !error && (
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Firebase Collaboration:</strong> Real-time collaboration enabled</p>
          <p><strong>Status:</strong> {isAuthenticated ? 'Connected' : 'Connecting...'}</p>
          <p><strong>Page:</strong> {currentPage}</p>
        </div>
      )}
    </div>
  )
}
