import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseRealtimeHighlightsProps {
  documentId: string
  userName: string
  userId: string
  enabled?: boolean
}

export function useRealtimeHighlights({
  documentId,
  userName,
  userId,
  enabled = true
}: UseRealtimeHighlightsProps) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])

  useEffect(() => {
    if (!enabled || !documentId) return

    console.log('🔌 Connecting to real Socket.io server...')
    
    // Connect to Socket.io server
    const socket = io('http://localhost:3000')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.io server!')
      setIsConnected(true)
      
      // Join document room
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
    })

    return () => {
      socket.disconnect()
      setIsConnected(false)
      setConnectedUsers([])
    }
  }, [documentId, userName, userId, enabled])

  const broadcastHighlight = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📡 Broadcasting highlight:', data)
      socketRef.current.emit('new-highlight', data)
    }
  }

  return {
    isConnected,
    connectedUsers,
    broadcastHighlight,
    broadcastHighlightDeletion: () => {},
  }
}