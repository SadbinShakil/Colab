import { NextRequest, NextResponse } from 'next/server'

// In-memory store for active sessions and annotations
const activeSessions = new Map<string, Set<string>>() // documentId -> Set of userIds
const liveAnnotations = new Map<string, any[]>() // documentId -> annotations
const userCursors = new Map<string, Map<string, any>>() // documentId -> userId -> cursor position

// SSE connections for real-time updates
const connections = new Map<string, Map<string, any>>() // documentId -> userId -> connection

interface CollaborativeEvent {
  type: 'user_joined' | 'user_left' | 'annotation_added' | 'annotation_updated' | 'cursor_moved'
  documentId: string
  userId: string
  userName: string
  data?: any
  timestamp: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  const userId = searchParams.get('userId')
  const userName = searchParams.get('userName') || 'Anonymous'

  if (!documentId || !userId) {
    return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 })
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Add user to active session
      if (!activeSessions.has(documentId)) {
        activeSessions.set(documentId, new Set())
      }
      activeSessions.get(documentId)!.add(userId)

      // Store connection
      if (!connections.has(documentId)) {
        connections.set(documentId, new Map())
      }
      connections.get(documentId)!.set(userId, { controller, userName })

      // Send initial data
      const initialEvent: CollaborativeEvent = {
        type: 'user_joined',
        documentId,
        userId,
        userName,
        data: {
          activeUsers: Array.from(activeSessions.get(documentId) || []),
          annotations: liveAnnotations.get(documentId) || []
        },
        timestamp: new Date().toISOString()
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`))

      // Notify other users
      broadcastToDocument(documentId, initialEvent, userId)
    },

    cancel() {
      // Clean up when connection closes
      if (activeSessions.has(documentId)) {
        activeSessions.get(documentId)!.delete(userId)
        if (activeSessions.get(documentId)!.size === 0) {
          activeSessions.delete(documentId)
        }
      }

      if (connections.has(documentId)) {
        connections.get(documentId)!.delete(userId)
        if (connections.get(documentId)!.size === 0) {
          connections.delete(documentId)
        }
      }

      // Notify other users that user left
      const leaveEvent: CollaborativeEvent = {
        type: 'user_left',
        documentId,
        userId,
        userName,
        timestamp: new Date().toISOString()
      }
      broadcastToDocument(documentId, leaveEvent, userId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, documentId, userId, userName, data } = body

    const event: CollaborativeEvent = {
      type,
      documentId,
      userId,
      userName: userName || 'Anonymous',
      data,
      timestamp: new Date().toISOString()
    }

    // Handle different event types
    switch (type) {
      case 'annotation_added':
        if (!liveAnnotations.has(documentId)) {
          liveAnnotations.set(documentId, [])
        }
        liveAnnotations.get(documentId)!.push(data)
        break

      case 'annotation_updated':
        if (liveAnnotations.has(documentId)) {
          const annotations = liveAnnotations.get(documentId)!
          const index = annotations.findIndex(ann => ann.id === data.id)
          if (index !== -1) {
            annotations[index] = data
          }
        }
        break

      case 'cursor_moved':
        if (!userCursors.has(documentId)) {
          userCursors.set(documentId, new Map())
        }
        userCursors.get(documentId)!.set(userId, data)
        break
    }

    // Broadcast to all users in the document
    broadcastToDocument(documentId, event, userId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Collaborative API error:', error)
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 })
  }
}

function broadcastToDocument(documentId: string, event: CollaborativeEvent, excludeUserId?: string) {
  const documentConnections = connections.get(documentId)
  if (!documentConnections) return

  const encoder = new TextEncoder()
  const eventData = `data: ${JSON.stringify(event)}\n\n`

  documentConnections.forEach((connection, userId) => {
    if (excludeUserId && userId === excludeUserId) return
    
    try {
      connection.controller.enqueue(encoder.encode(eventData))
    } catch (error) {
      console.error('Failed to send to user:', userId, error)
      // Remove broken connection
      documentConnections.delete(userId)
    }
  })
} 