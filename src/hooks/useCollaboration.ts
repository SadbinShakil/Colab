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
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

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

  // Poll for updates (simulate real-time)
  useEffect(() => {
    if (!isConnected) return

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
        const usersData = await usersResponse.json()
        if (usersData.success) {
          setActiveUsers(usersData.activeUsers || [])
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
        const highlightsData = await highlightsResponse.json()
        if (highlightsData.success) {
          setHighlights(highlightsData.highlights || [])
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
        const messagesData = await messagesResponse.json()
        if (messagesData.success) {
          // Filter out private messages - only show public messages in main chat
          const publicMessages = (messagesData.messages || []).filter((msg: any) => {
            return !msg.recipientId // Only show messages without recipientId (public messages)
          })
          setChatMessages(publicMessages)
        }


      } catch (error) {
        console.error('Failed to poll for updates:', error)
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
    isConnected,
    lastUpdate,
    addHighlight,
    joinDocument,
    leaveDocument
  }
} 