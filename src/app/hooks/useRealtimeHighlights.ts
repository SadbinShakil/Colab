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
        // Note: Struggle detection is now handled in the annotation listener
        // after the highlight is imported, where we track confusion highlights
        // per user and only trigger notifications when there are 3+ highlights
        setIncomingHighlights(prev => [...prev, highlight]);
      }
    })

    socket.on('peer-chat-invitation', (data) => {
      console.log('📨 Received chat invitation:', data)
      window.dispatchEvent(new CustomEvent('peer-chat-invitation', { detail: data }))
    })

    socket.on('peer-chat-accepted', (data) => {
      console.log('✅ Chat invitation accepted:', data)
      window.dispatchEvent(new CustomEvent('peer-chat-accepted', { detail: data }))
    })

    socket.on('peer-chat-message', (data) => {
      console.log('💬 Received peer message:', data)
      window.dispatchEvent(new CustomEvent('peer-chat-message', { detail: data }))
    })

    // ✅ ADD: Listen for reflections from other users
    socket.on('reflection-updated', (data) => {
      console.log('🧠 Received remote reflection update:', data)
      window.dispatchEvent(new CustomEvent('remote-reflection-updated', { detail: data }))
    })

    // ✅ ADD: Listen for Start Signal
    socket.on('session-start', (data) => {
      console.log('🚀 Received remote session start:', data)
      // Dispatch to window so SystemFlowVisualizer can pick it up
      window.dispatchEvent(new CustomEvent('remote-session-start', { detail: data.timestamp }))
    })

    return () => {
      socket.disconnect()
      setIsConnected(false)
      setConnectedUsers([])
    }
  }, [documentId, userName, userId, enabled, webViewerInstance])

  const broadcastReflection = (data: { type: string, content: string }) => {
    if (socketRef.current?.connected) {
      console.log('📡 Broadcasting reflection:', data)
      socketRef.current.emit('reflection-updated', {
        ...data,
        userId,
        userName,
        documentId,
        timestamp: Date.now()
      })
    }
  }

  const broadcastHighlight = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📡 Broadcasting highlight:', data)
      socketRef.current.emit('new-highlight', data)
    }
  }

  const broadcastPeerInvitation = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📨 Broadcasting peer invitation:', data)
      socketRef.current.emit('peer-chat-invitation', data)
    }
  }

  const broadcastPeerAcceptance = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('✅ Broadcasting peer acceptance:', data)
      socketRef.current.emit('peer-chat-accepted', data)
    }
  }

  const broadcastPeerMessage = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('💬 Broadcasting peer message:', data)
      socketRef.current.emit('peer-chat-message', data)
    }
  }

  // ✅ ADD: Function to trigger session start
  const broadcastSessionStart = (timestamp: number) => {
    if (socketRef.current?.connected) {
      console.log('🚀 Broadcasting Session Start:', timestamp)
      socketRef.current.emit('session-start', {
        documentId,
        timestamp
      })
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
    broadcastPeerInvitation,
    broadcastPeerAcceptance,
    broadcastPeerMessage,
    broadcastSessionStart,
    broadcastReflection, // ✅ Added this
    incomingHighlights,
    clearIncomingHighlights,
    broadcastHighlightDeletion: () => { },
  }
}