import { useState, useEffect, useCallback } from 'react'

interface User {
  userId: string
  userName: string
  documentId: string
}

interface Highlight {
  id: string
  userId: string
  userName: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
  timestamp: string
}

interface RealtimeAnnotation {
  id: string
  documentId: string
  userId: string
  userName: string
  action: 'add' | 'update' | 'delete' | 'sync'
  annotationData?: any
  xfdfData?: string
  version?: number
  timestamp: string
}

interface ChatMessage {
  id: string
  documentId: string
  userId: string
  userName: string
  content: string
  type: 'TEXT' | 'AI_RESPONSE' | 'SYSTEM'
  timestamp: string
}

interface UseCollaborationProps {
  documentId: string
  userId: string
  userName: string
}

export function useCollaboration({ documentId, userId, userName }: UseCollaborationProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [realtimeAnnotations, setRealtimeAnnotations] = useState<RealtimeAnnotation[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [annotationSubscriberCount, setAnnotationSubscriberCount] = useState(0)

  // Join document session
  const joinDocument = useCallback(async () => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-document',
          documentId,
          userId,
          userName
        })
      })

      const data = await response.json()
      if (data.success) {
        setIsConnected(true)
        setActiveUsers(data.activeUsers || [])
        setHighlights(data.existingHighlights || [])
        // Filter out private messages from existing messages
        const publicMessages = (data.existingMessages || []).filter((msg: any) => {
          return !msg.recipientId // Only show messages without recipientId (public messages)
        })
        setChatMessages(publicMessages)
        console.log('Joined document session:', data)
      }
    } catch (error) {
      console.error('Failed to join document:', error)
    }
  }, [documentId, userId, userName])

  // Leave document session
  const leaveDocument = useCallback(async () => {
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave-document',
          documentId,
          userId
        })
      })
      setIsConnected(false)
      console.log('Left document session')
    } catch (error) {
      console.error('Failed to leave document:', error)
    }
  }, [documentId, userId])

  // Add highlight
  const addHighlight = useCallback(async (highlightData: Omit<Highlight, 'id' | 'userId' | 'userName' | 'timestamp'>) => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-highlight',
          documentId,
          userId,
          userName,
          highlightData
        })
      })

      const data = await response.json()
      if (data.success) {
        setHighlights(prev => [...prev, data.highlight])
        setLastUpdate(new Date())
        console.log('Highlight added:', data.highlight)
      }
    } catch (error) {
      console.error('Failed to add highlight:', error)
    }
  }, [documentId, userId, userName])

  // Broadcast annotation change to other users
  const broadcastAnnotationChange = useCallback(async (annotationData: any, action: 'add' | 'update' | 'delete' = 'add') => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'annotation-changed',
          documentId,
          userId,
          userName,
          annotationData,
          annotationAction: action  // Changed from 'action' to 'annotationAction'
        })
      })

      const data = await response.json()
      if (data.success) {
        console.log(`📝 Annotation ${action} broadcasted:`, data.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to broadcast annotation change:', error)
    }
  }, [documentId, userId, userName])

  // Sync annotations with other users
  const syncAnnotations = useCallback(async (xfdfData: string, version: number = 1) => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-annotations',
          documentId,
          userId,
          xfdfData,
          version
        })
      })

      const data = await response.json()
      if (data.success) {
        console.log('🔄 Annotations synced:', data.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to sync annotations:', error)
    }
  }, [documentId, userId])

  // Get real-time annotations from other users
  const getRealtimeAnnotations = useCallback(async () => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-realtime-annotations',
          documentId,
          userId
        })
      })

      const data = await response.json()
      if (data.success) {
        setRealtimeAnnotations(data.annotations || [])
        setAnnotationSubscriberCount(data.subscriberCount || 0)
        setLastUpdate(new Date())
        return data.annotations || []
      }
    } catch (error) {
      console.error('Failed to get real-time annotations:', error)
    }
    return []
  }, [documentId, userId])

  // Poll for updates (simulate real-time)
  useEffect(() => {
    if (!isConnected) return

    let consecutiveFailures = 0;
    const maxFailures = 10;

    const pollInterval = setInterval(async () => {
      try {
        // Get active users
        const usersResponse = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-active-users',
            documentId
          })
        })
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          if (usersData.success) {
            setActiveUsers(usersData.activeUsers || [])
          }
        } else {
          console.warn('Failed to get active users:', usersResponse.status, usersResponse.statusText)
        }

        // Get highlights
        const highlightsResponse = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-highlights',
            documentId
          })
        })
        
        if (highlightsResponse.ok) {
          const highlightsData = await highlightsResponse.json()
          if (highlightsData.success) {
            setHighlights(highlightsData.highlights || [])
          }
        } else {
          console.warn('Failed to get highlights:', highlightsResponse.status, highlightsResponse.statusText)
        }

        // Get real-time annotations
        const annotationsResponse = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-realtime-annotations',
            documentId,
            userId
          })
        })
        
        if (annotationsResponse.ok) {
          const annotationsData = await annotationsResponse.json()
          if (annotationsData.success) {
            setRealtimeAnnotations(annotationsData.annotations || [])
            setAnnotationSubscriberCount(annotationsData.subscriberCount || 0)
          }
        } else {
          console.warn('Failed to get real-time annotations:', annotationsResponse.status, annotationsResponse.statusText)
        }

        // Get chat messages
        const messagesResponse = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-messages',
            documentId
          })
        })
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          if (messagesData.success) {
            // Filter out private messages - only show public messages in main chat
            const publicMessages = (messagesData.messages || []).filter((msg: any) => {
              return !msg.recipientId // Only show messages without recipientId (public messages)
            })
            setChatMessages(publicMessages)
          }
        } else {
          console.warn('Failed to get messages:', messagesResponse.status, messagesResponse.statusText)
        }
        
        consecutiveFailures = 0; // Reset on success
      } catch (error) {
        consecutiveFailures++;
        console.error('Failed to poll for updates:', error)
        // Optionally, stop polling after too many failures
        if (consecutiveFailures >= maxFailures) {
          console.error('Too many consecutive failures, stopping polling')
          clearInterval(pollInterval);
        }
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [isConnected, documentId])

  // Auto-join on mount, auto-leave on unmount
  useEffect(() => {
    joinDocument()
    return () => {
      leaveDocument()
    }
  }, [joinDocument, leaveDocument])

  return {
    activeUsers,
    highlights,
    chatMessages,
    realtimeAnnotations,
    annotationSubscriberCount,
    isConnected,
    lastUpdate,
    addHighlight,
    broadcastAnnotationChange,
    syncAnnotations,
    getRealtimeAnnotations,
    joinDocument,
    leaveDocument
  }
} 