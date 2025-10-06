'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import firestoreCollaboration, { FirestoreAnnotation } from '@/lib/firestoreCollaboration'

interface FirestoreWebViewerProps {
  documentUrl: string
  documentId: string
  userName?: string
  userId?: string
  extractedText?: string
  onDocumentLoad?: () => void
  onError?: (error: string) => void
}

export default function FirestoreWebViewer({
  documentUrl,
  documentId,
  userName = 'Anonymous',
  userId = 'guest',
  extractedText,
  onDocumentLoad,
  onError
}: FirestoreWebViewerProps) {
  const viewer = useRef<HTMLDivElement>(null)
  const [webViewerInstance, setWebViewerInstance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFirestoreReady, setIsFirestoreReady] = useState(false)
  const [collaborationStatus, setCollaborationStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  // Initialize WebViewer and Firestore
  useEffect(() => {
    if (!viewer.current) return

    const initializeWebViewer = async () => {
      try {
        console.log('🔥 Initializing Firestore WebViewer...')
        
        // Initialize Firestore collaboration first
        await firestoreCollaboration.initialize()
        setIsFirestoreReady(true)
        setCollaborationStatus('connected')
        console.log('✅ Firestore collaboration ready')
        
        // Import WebViewer
        const WebViewerModule = await import('@pdftron/webviewer')
        const WebViewer = WebViewerModule.default

        // Initialize WebViewer
        const instance = await WebViewer({
          path: '/lib',
          initialDoc: documentUrl,
          licenseKey: 'demo:1755219174158:606dde5b03000000004697f8591ea5d9e505e44c124bc6be7fc53870e2'
        }, viewer.current as HTMLElement)

        console.log('✅ WebViewer initialized')
        setWebViewerInstance(instance)

        // Set up WebViewer event listeners
        setupWebViewerEvents(instance)

      } catch (err) {
        console.error('❌ Failed to initialize Firestore WebViewer:', err)
        setError('Failed to initialize WebViewer: ' + (err?.message || err))
        setIsLoading(false)
        setCollaborationStatus('error')
      }
    }

    initializeWebViewer()

    // Cleanup on unmount
    return () => {
      firestoreCollaboration.cleanup()
    }
  }, [documentUrl])

  // Set up WebViewer event listeners
  const setupWebViewerEvents = (instance: any) => {
    const { documentViewer, annotationManager } = instance.Core

    // Set user information for annotations
    if (annotationManager) {
      annotationManager.setCurrentUser(userName)
    }

    // Document loaded event
    documentViewer.addEventListener('documentLoaded', () => {
      console.log('✅ Document loaded successfully')
      setIsLoading(false)
      onDocumentLoad?.()
      
      // Set up Firestore real-time listeners after document is loaded
      setupFirestoreListeners()
    })

    // Document load failed event
    documentViewer.addEventListener('documentLoadFailed', (error: any) => {
      console.error('❌ Document load failed:', error)
      setError('Failed to load PDF document.')
      setIsLoading(false)
      setCollaborationStatus('error')
    })

    // Annotation events - convert to Firestore format
    annotationManager.addEventListener('annotationChanged', async (annotations: any[], action: string) => {
      console.log('📝 Annotation changed (Firestore):', { action, count: annotations.length })
      
      if (action === 'add' && annotations.length > 0) {
        for (const annotation of annotations) {
          await handleAnnotationAdd(annotation)
        }
      } else if (action === 'modify' && annotations.length > 0) {
        for (const annotation of annotations) {
          await handleAnnotationUpdate(annotation)
        }
      } else if (action === 'delete' && annotations.length > 0) {
        for (const annotation of annotations) {
          await handleAnnotationDelete(annotation)
        }
      }
    })
  }

  // Set up Firestore real-time listeners
  const setupFirestoreListeners = () => {
    if (!isFirestoreReady) return

    console.log('🔥 Setting up Firestore real-time listeners...')
    
    firestoreCollaboration.setupRealtimeListeners(documentId, {
      onAnnotationAdded: handleFirestoreAnnotationAdded,
      onAnnotationUpdated: handleFirestoreAnnotationUpdated,
      onAnnotationDeleted: handleFirestoreAnnotationDeleted,
      onError: (error) => {
        console.error('❌ Firestore collaboration error:', error)
        setCollaborationStatus('error')
      }
    })
  }

  // Handle adding annotation to Firestore
  const handleAnnotationAdd = async (annotation: any) => {
    try {
      // Export XFDF for this annotation
      const { annotationManager } = webViewerInstance.Core
      const xfdfString = await annotationManager.exportAnnotations({ annotList: [annotation] })
      
      await firestoreCollaboration.upsertAnnotation({
        documentId,
        apryseId: annotation.Id,
        xfdf: xfdfString,
        userId,
        userName,
        deleted: false
      })
      console.log('✅ Annotation added to Firestore')
    } catch (error) {
      console.error('❌ Failed to add annotation to Firestore:', error)
    }
  }

  // Handle updating annotation in Firestore
  const handleAnnotationUpdate = async (annotation: any) => {
    try {
      const annotationId = annotation.Id
      if (!annotationId) return

      // Export XFDF for this annotation
      const { annotationManager } = webViewerInstance.Core
      const xfdfString = await annotationManager.exportAnnotations({ annotList: [annotation] })

      await firestoreCollaboration.upsertAnnotation({
        documentId,
        apryseId: annotationId,
        xfdf: xfdfString,
        userId,
        userName,
        deleted: false
      })
      console.log('✅ Annotation updated in Firestore')
    } catch (error) {
      console.error('❌ Failed to update annotation in Firestore:', error)
    }
  }

  // Handle deleting annotation from Firestore
  const handleAnnotationDelete = async (annotation: any) => {
    try {
      const annotationId = annotation.Id
      if (!annotationId) return

      await firestoreCollaboration.deleteByApryseId(annotationId)
      console.log('✅ Annotation deleted from Firestore')
    } catch (error) {
      console.error('❌ Failed to delete annotation from Firestore:', error)
    }
  }

  // Handle Firestore annotation added (from other users)
  const handleFirestoreAnnotationAdded = useCallback(async (annotation: FirestoreAnnotation) => {
    if (!webViewerInstance || annotation.userId === userId) return

    console.log('🔥 Adding annotation from other user:', annotation)
    
    try {
      const { annotationManager } = webViewerInstance.Core
      
      // Import XFDF to add annotation
      if (annotation.xfdf) {
        await annotationManager.importAnnotations(annotation.xfdf)
        console.log('✅ Added annotation from other user to WebViewer')
      }
    } catch (error) {
      console.error('❌ Failed to add annotation from other user:', error)
    }
  }, [webViewerInstance, userId])

  // Handle Firestore annotation updated (from other users)
  const handleFirestoreAnnotationUpdated = useCallback(async (annotation: FirestoreAnnotation) => {
    if (!webViewerInstance || annotation.userId === userId) return

    console.log('🔥 Updating annotation from other user:', annotation)
    
    try {
      const { annotationManager } = webViewerInstance.Core
      
      // Delete old annotation and import updated one
      const existingAnnotation = annotationManager.getAnnotationById(annotation.apryseId)
      if (existingAnnotation) {
        annotationManager.deleteAnnotation(existingAnnotation, { imported: false, force: true })
      }
      
      // Import updated XFDF
      if (annotation.xfdf) {
        await annotationManager.importAnnotations(annotation.xfdf)
        console.log('✅ Updated annotation from other user in WebViewer')
      }
    } catch (error) {
      console.error('❌ Failed to update annotation from other user:', error)
    }
  }, [webViewerInstance, userId])

  // Handle Firestore annotation deleted (from other users)
  const handleFirestoreAnnotationDeleted = useCallback((annotationId: string) => {
    if (!webViewerInstance) return

    console.log('🔥 Deleting annotation from other user:', annotationId)
    
    try {
      const { annotationManager } = webViewerInstance.Core
      
      // Find and delete the annotation
      const existingAnnotation = annotationManager.getAnnotationById(annotationId)
      if (existingAnnotation) {
        annotationManager.deleteAnnotation(existingAnnotation, { imported: false, force: true })
        console.log('✅ Deleted annotation from other user in WebViewer')
      }
    } catch (error) {
      console.error('❌ Failed to delete annotation from other user:', error)
    }
  }, [webViewerInstance])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Collaboration Status Indicator */}
      <div className="bg-gray-100 border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            collaborationStatus === 'connected' ? 'bg-green-500' : 
            collaborationStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            Firestore Collaboration: {collaborationStatus}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          User: {userName} ({userId})
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Firestore WebViewer...</p>
            {!isFirestoreReady && (
              <p className="text-yellow-600 text-sm mt-2">Connecting to Firestore...</p>
            )}
          </div>
        </div>
      )}

      <div 
        ref={viewer} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
    </div>
  )
}
