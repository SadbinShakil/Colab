import { useEffect, useRef, useState, useCallback } from 'react'

interface UseRealtimeHighlightsProps {
  documentId: string
  userName: string
  userId: string
  webViewerInstance?: any
  enabled?: boolean
  /**
   * If provided, use this existing socket instead of creating a new one.
   * This avoids double-joining the room when ApryseWebViewer already has a socket.
   */
  externalSocket?: any
}

export function useRealtimeHighlights({
  documentId,
  userName,
  userId,
  webViewerInstance,
  enabled = true,
  externalSocket,
}: UseRealtimeHighlightsProps) {
  const socketRef = useRef<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])
  const [incomingHighlights, setIncomingHighlights] = useState<any[]>([])

  const clearIncomingHighlights = useCallback(() => {
    setIncomingHighlights([])
  }, [])

  // If an external socket is provided, use it — no new connection created.
  // ApryseWebViewer emits highlight events via window custom events so we pick them up
  // even before this effect re-runs with the external socket.
  useEffect(() => {
    if (!externalSocket) return

    socketRef.current = externalSocket
    // Snapshot current connection state; also track future connect/disconnect
    setIsConnected(externalSocket.connected)
    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => { setIsConnected(false); setConnectedUsers([]) }
    externalSocket.on('connect', onConnect)
    externalSocket.on('disconnect', onDisconnect)

    // Window-event bridge: ApryseWebViewer dispatches these on the window so highlights
    // received before this effect re-ran (timing gap) are still captured.
    const onWindowExisting = (e: Event) => {
      const highlights = (e as CustomEvent).detail
      if (highlights?.length > 0) setIncomingHighlights(prev => [...prev, ...highlights])
    }
    const onWindowHighlight = (e: Event) => {
      const h = (e as CustomEvent).detail
      if (h) setIncomingHighlights(prev => [...prev, h])
    }
    window.addEventListener('__existing-highlights', onWindowExisting)
    window.addEventListener('__highlight-added', onWindowHighlight)

    // Direct socket listeners for events that arrive after this effect runs
    const onExistingHighlights = (highlights: any[]) => {
      if (highlights.length > 0) setIncomingHighlights(prev => [...prev, ...highlights])
    }
    const onHighlightAdded = (highlight: any) => {
      if (highlight.action === 'click') return
      setIncomingHighlights(prev => [...prev, highlight])
    }
    const onUsersUpdate = (users: any[]) => setConnectedUsers(users)

    externalSocket.on('existing-highlights', onExistingHighlights)
    externalSocket.on('highlight-added', onHighlightAdded)
    externalSocket.on('users-update', onUsersUpdate)

    return () => {
      externalSocket.off('connect', onConnect)
      externalSocket.off('disconnect', onDisconnect)
      window.removeEventListener('__existing-highlights', onWindowExisting)
      window.removeEventListener('__highlight-added', onWindowHighlight)
      externalSocket.off('existing-highlights', onExistingHighlights)
      externalSocket.off('highlight-added', onHighlightAdded)
      externalSocket.off('users-update', onUsersUpdate)
    }
  }, [externalSocket])

  // Fallback: create own socket only when no external socket is provided
  useEffect(() => {
    if (!enabled || !documentId || externalSocket) return

    let socket: any
    import('socket.io-client').then(({ io }) => {
      socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 5000,
      })
      socketRef.current = socket

      socket.on('connect', () => {
        setIsConnected(true)
        socket.emit('join-document', { documentId, userName, userId })
      })
      socket.on('disconnect', () => {
        setIsConnected(false)
        setConnectedUsers([])
      })
      socket.on('users-update', (users: any[]) => setConnectedUsers(users))
      socket.on('existing-highlights', (highlights: any[]) => {
        if (highlights.length > 0) setIncomingHighlights(prev => [...prev, ...highlights])
      })
      socket.on('highlight-added', (highlight: any) => {
        if (highlight.action === 'click') return
        setIncomingHighlights(prev => [...prev, highlight])
      })
      socket.on('peer-chat-invitation', (data: any) => {
        window.dispatchEvent(new CustomEvent('peer-chat-invitation', { detail: data }))
      })
      socket.on('peer-chat-accepted', (data: any) => {
        window.dispatchEvent(new CustomEvent('peer-chat-accepted', { detail: data }))
      })
      socket.on('peer-chat-message', (data: any) => {
        window.dispatchEvent(new CustomEvent('peer-chat-message', { detail: data }))
      })
      socket.on('reflection-updated', (data: any) => {
        window.dispatchEvent(new CustomEvent('remote-reflection-updated', { detail: data }))
      })
      socket.on('session-start', (data: any) => {
        window.dispatchEvent(new CustomEvent('remote-session-start', { detail: data.timestamp }))
      })
    })

    return () => {
      socket?.disconnect()
      setIsConnected(false)
      setConnectedUsers([])
    }
  }, [documentId, userName, userId, enabled, externalSocket])

  const broadcastHighlight = useCallback((data: any) => {
    const s = socketRef.current
    if (s?.connected) s.emit('new-highlight', data)
  }, [])

  const broadcastReflection = useCallback((data: { type: string; content: string }) => {
    const s = socketRef.current
    if (s?.connected) s.emit('reflection-updated', { ...data, userId, userName, documentId, timestamp: Date.now() })
  }, [userId, userName, documentId])

  const broadcastPeerInvitation = useCallback((data: any) => {
    const s = socketRef.current
    if (s?.connected) s.emit('peer-chat-invitation', data)
  }, [])

  const broadcastPeerAcceptance = useCallback((data: any) => {
    const s = socketRef.current
    if (s?.connected) s.emit('peer-chat-accepted', data)
  }, [])

  const broadcastPeerMessage = useCallback((data: any) => {
    const s = socketRef.current
    if (s?.connected) s.emit('peer-chat-message', data)
  }, [])

  const broadcastSessionStart = useCallback((timestamp: number) => {
    const s = socketRef.current
    if (s?.connected) s.emit('session-start', { documentId, timestamp })
  }, [documentId])

  return {
    isConnected,
    connectedUsers,
    broadcastHighlight,
    broadcastPeerInvitation,
    broadcastPeerAcceptance,
    broadcastPeerMessage,
    broadcastSessionStart,
    broadcastReflection,
    incomingHighlights,
    clearIncomingHighlights,
    broadcastHighlightDeletion: () => {},
  }
}
