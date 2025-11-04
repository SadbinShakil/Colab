import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseRealtimeHighlightsProps {
  documentId: string
  userName: string
  userId: string
  webViewerInstance?: any
  enabled?: boolean
}

export function useRealtimeHighlights({
  documentId,
  userName,
  userId,
  webViewerInstance,
  enabled = true
}: UseRealtimeHighlightsProps) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])
  const [incomingHighlights, setIncomingHighlights] = useState<any[]>([]) // MOVED INSIDE
// ✅ ADD THIS NEW FUNCTION:
const clearIncomingHighlights = useCallback(() => {
    setIncomingHighlights([]);
  }, []);


  useEffect(() => {
    if (!enabled || !documentId) return

    console.log('🔌 Connecting to real Socket.io server...')
    
    const socket = io('http://localhost:3000')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.io server!')
      setIsConnected(true)
      
      socket.emit('join-document', {
        documentId,
        userName,
        userId
      })
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.io server')
      setIsConnected(false)
    })

    socket.on('users-update', (users) => {
      console.log('👥 Users updated:', users)
      setConnectedUsers(users)
    })

    socket.on('existing-highlights', (highlights) => {
      console.log('📋 Received existing highlights:', highlights.length)
    })

    socket.on('highlight-added', (highlight) => {
      console.log('✨ New highlight from another user:', highlight)
      
      if (highlight.action === 'click') {
        showUserClickInPDF(highlight)
        console.log(`👁️ ${highlight.user} is viewing: "${highlight.clickedText.substring(0, 30)}..."`)
      } else {
        console.log('📝 Received new highlight, passing to main component');
        setIncomingHighlights(prev => [...prev, highlight]);
      }
    })

    return () => {
      socket.disconnect()
      setIsConnected(false)
      setConnectedUsers([])
    }
  }, [documentId, userName, userId, enabled, webViewerInstance])

  const broadcastHighlight = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📡 Broadcasting highlight:', data)
      socketRef.current.emit('new-highlight', data)
    }
  }

  const showUserClickInPDF = useCallback((highlight: any) => {
    console.log('🎨 showUserClickInPDF called with:', highlight);
    
    if (!webViewerInstance?.Core) return;

    try {
      const { annotationManager } = webViewerInstance.Core
      
      const allAnnotations = annotationManager.getAnnotationsList();
      const pageHighlights = allAnnotations.filter((ann: any) => {
        const isHighlight = ann.Subject === 'Highlight' || ann.Subject === 'highlight';
        const isCorrectPage = ann.PageNumber === highlight.pageNumber;
        return isHighlight && isCorrectPage;
      });
      
      if (pageHighlights.length > 0) {
        const targetAnnotation = pageHighlights[0];
        const originalColor = targetAnnotation.StrokeColor;
        targetAnnotation.StrokeColor = new webViewerInstance.Core.Annotations.Color(0, 255, 0);
        annotationManager.redrawAnnotation(targetAnnotation);
        
        setTimeout(() => {
          targetAnnotation.StrokeColor = originalColor;
          annotationManager.redrawAnnotation(targetAnnotation);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error showing user click:', error)
    }
  }, [webViewerInstance])

  return {
    isConnected,
    connectedUsers,
    broadcastHighlight,
    incomingHighlights,
    clearIncomingHighlights,
    broadcastHighlightDeletion: () => {},
  }
}