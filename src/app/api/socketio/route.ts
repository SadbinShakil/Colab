import { NextRequest } from 'next/server'
import { Server } from 'socket.io'

let io: Server | null = null

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.io server
    const httpServer = (global as any).httpServer
    
    if (!httpServer) {
      // Create a simple HTTP server for Socket.io
      const { createServer } = require('http')
      const server = createServer()
      ;(global as any).httpServer = server
      
      server.listen(3001, () => {
        console.log('🚀 Socket.io server running on port 3001')
      })
    }

    io = new Server((global as any).httpServer, {
      cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"]
      }
    })

    // Document rooms to store highlights
    const documentRooms = new Map()

    io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`)

      // Join document room
      socket.on('join-document', ({ documentId, userName, userId }) => {
        socket.join(documentId)
        console.log(`📄 ${userName} joined document: ${documentId}`)

        // Initialize room if needed
        if (!documentRooms.has(documentId)) {
          documentRooms.set(documentId, { highlights: [], users: [] })
        }

        const room = documentRooms.get(documentId)
        room.users.push({ socketId: socket.id, userName, userId })

        // Send existing highlights to new user
        socket.emit('existing-highlights', room.highlights)
        
        // Update user count for all users in room
        io?.to(documentId).emit('users-update', room.users)
      })

      // Handle new highlights
      socket.on('new-highlight', (highlightData) => {
        const { documentId } = highlightData
        
        const enrichedHighlight = {
          ...highlightData,
          id: `highlight_${Date.now()}_${socket.id}`,
          timestamp: new Date().toISOString()
        }

        // Store in room
        const room = documentRooms.get(documentId)
        if (room) {
          room.highlights.push(enrichedHighlight)
        }

        // Broadcast to others in room (not sender)
        socket.to(documentId).emit('highlight-added', enrichedHighlight)
        
        console.log(`✨ Highlight broadcasted in ${documentId}`)
      })

      socket.on('disconnect', () => {
        console.log(`👋 User disconnected: ${socket.id}`)
      })
    })

    ;(global as any).io = io
  }

  return new Response('Socket.io server initialized', { status: 200 })
}