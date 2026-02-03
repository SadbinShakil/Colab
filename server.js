const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  })

  // Document rooms
  const documentRooms = new Map()

  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`)

    socket.on('join-document', ({ documentId, userName, userId }) => {
      socket.join(documentId)
      console.log(`📄 ${userName} (${userId}) joined document: ${documentId}`)

      socket.data = { documentId, userName, userId }

      if (!documentRooms.has(documentId)) {
        documentRooms.set(documentId, { highlights: [], users: [] })
      }

      const room = documentRooms.get(documentId)

      // ✅ Check if user already exists (prevent duplicates)
      const existingUserIndex = room.users.findIndex(u => u.userId === userId)
      if (existingUserIndex >= 0) {
        // Update existing user's socketId
        room.users[existingUserIndex].socketId = socket.id
        console.log(`🔄 Updated existing user: ${userName} (${userId}) -> socket: ${socket.id}`)
      } else {
        // Add new user
        room.users.push({ socketId: socket.id, userName, userId })
        console.log(`✅ Added new user: ${userName} (${userId}) -> socket: ${socket.id}`)
      }

      console.log(`👥 [Server] Current users in room ${documentId}:`, room.users.map(u => `${u.userName} (${u.userId})`))

      socket.emit('existing-highlights', room.highlights)
      io.to(documentId).emit('users-update', room.users)

      socket.to(documentId).emit('peer-joined', {
        userId,
        userName,
        documentId
      })

      console.log(`👥 Active users in ${documentId}:`, room.users.length)
    })


    socket.on('new-highlight', (highlightData) => {
      const { documentId } = highlightData

      const enrichedHighlight = {
        ...highlightData,
        id: `highlight_${Date.now()}_${socket.id}`,
        timestamp: new Date().toISOString()
      }

      const room = documentRooms.get(documentId)
      if (room) {
        room.highlights.push(enrichedHighlight)
      }

      socket.to(documentId).emit('highlight-added', enrichedHighlight)
      console.log(`✨ Highlight broadcasted in ${documentId}`)
    })

    // ✅ ADD: Handle peer chat invitations
    socket.on('peer-chat-invitation', (data) => {
      console.log(`📨 [Server] Chat invitation: ${data.fromUserName} → ${data.toUserName}`)
      console.log(`📨 [Server] Invitation data:`, {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        documentId: data.documentId
      })

      // Find the target user's socket ID
      const room = documentRooms.get(data.documentId)
      if (!room) {
        console.log(`❌ [Server] Room ${data.documentId} not found`)
        return
      }

      console.log(`👥 [Server] Room users:`, room.users.map((u) => ({ userId: u.userId, userName: u.userName, socketId: u.socketId })))
      console.log(`🔍 [Server] Looking for target user: ${data.toUserId}`)
      console.log(`🔍 [Server] Available user IDs:`, room.users.map((u) => u.userId))

      const targetUser = room.users.find((u) => u.userId === data.toUserId)
      if (targetUser) {
        // Send invitation ONLY to the specific user
        console.log(`📤 [Server] Sending invitation to socket ${targetUser.socketId} for user ${targetUser.userName} (${targetUser.userId})`)
        io.to(targetUser.socketId).emit('peer-chat-invitation', data)
        console.log(`✅ [Server] Invitation sent to socket: ${targetUser.socketId} (user: ${targetUser.userName})`)
      } else {
        console.log(`❌ [Server] Target user ${data.toUserId} not found in room. Available users:`, room.users.map((u) => `${u.userName} (${u.userId})`))
        // Also log the invitation data for debugging
        console.log(`❌ [Server] Invitation data was:`, data)
      }
    })

    // ✅ ADD: Handle peer chat acceptance
    socket.on('peer-chat-accepted', (data) => {
      console.log(`✅ [Server] Chat accepted: ${data.fromUserName} accepted invitation from ${data.toUserName}`)

      // Find the original inviter's socket ID (data.toUserId is the inviter)
      const room = documentRooms.get(data.documentId)
      if (room) {
        const inviterUser = room.users.find((u) => u.userId === data.toUserId)
        if (inviterUser) {
          // Notify ONLY the original inviter
          io.to(inviterUser.socketId).emit('peer-chat-accepted', data)
          console.log(`✅ [Server] Acceptance sent to inviter socket: ${inviterUser.socketId}`)
        } else {
          console.log(`❌ [Server] Inviter ${data.toUserId} not found in room for acceptance`)
        }
      }
    })

    // ✅ ADD: Handle peer chat messages
    socket.on('peer-chat-message', (data) => {
      console.log(`💬 [Server] Chat message: ${data.fromUserName} → ${data.toUserName || 'Group'}`)

      const room = documentRooms.get(data.documentId)
      if (room) {
        if (data.toUserId) {
          // PRIVATE MESSAGE: Find target user
          const targetUser = room.users.find((u) => u.userId === data.toUserId)
          if (targetUser) {
            io.to(targetUser.socketId).emit('peer-chat-message', data)
            console.log(`✅ [Server] Message sent to socket: ${targetUser.socketId}`)
          } else {
            console.log(`❌ [Server] Target user ${data.toUserId} not found for private message`)
          }
        } else {
          // GROUP MESSAGE: Broadcast to all in document
          socket.to(data.documentId).emit('peer-chat-message', data)
          console.log(`✅ [Server] Group message broadcasted in ${data.documentId}`)
        }
      }
    })

    // ✅ ADD: Handle Reflection Updates
    socket.on('reflection-updated', (data) => {
      console.log(`🧠 [Server] Reflection update from ${data.userName}:`, {
        userId: data.userId,
        type: data.type,
        contentLength: data.content?.length || 0
      })

      // Broadcast to all OTHER users in the same document
      socket.to(data.documentId).emit('reflection-updated', data)
      console.log(`✅ [Server] Reflection broadcasted to room: ${data.documentId}`)
    })

    // ✅ ADD: Handle Session Phase Start Sync
    socket.on('session-start', (data) => {
      console.log(`🚀 [Server] Session Start Triggered by ${socket.id} at ${data.timestamp}`)
      // Broadcast to everyone in the room (including sender, for confirmation/sync)
      if (data.documentId) {
        io.to(data.documentId).emit('session-start', data)
      }
    })

    socket.on('disconnect', () => {
      console.log(`👋 User disconnected: ${socket.id}`)

      // Remove user from all document rooms they were in
      const { documentId, userName, userId } = socket.data || {}

      if (documentId && documentRooms.has(documentId)) {
        const room = documentRooms.get(documentId)
        const initialCount = room.users.length

        // Remove the disconnected user
        room.users = room.users.filter(user => user.socketId !== socket.id)

        console.log(`👥 ${userName} left document: ${documentId} (${initialCount} -> ${room.users.length} users)`)

        // Notify remaining users about the update
        io.to(documentId).emit('users-update', room.users)

        // Broadcast peer-left event
        io.to(documentId).emit('peer-left', {
          userId,
          userName,
          documentId
        })

        // Clean up empty rooms
        if (room.users.length === 0) {
          documentRooms.delete(documentId)
          console.log(`🗑️ Removed empty room: ${documentId}`)
        }
      }
    })
  })

  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js + Socket.io ready on http://${hostname}:${port}`)
  })
})