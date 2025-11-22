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
      console.log(`📄 ${userName} joined document: ${documentId}`)
    
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
        console.log(`🔄 Updated existing user: ${userName}`)
      } else {
        // Add new user
        room.users.push({ socketId: socket.id, userName, userId })
        console.log(`✅ Added new user: ${userName}`)
      }
    
      socket.emit('existing-highlights', room.highlights)
      io.to(documentId).emit('users-update', room.users)
      
      socket.to(documentId).emit('peer-joined', {
        userId,
        userName,
        documentId
      })
      
      console.log(`👥 Active users in ${documentId}:`, room.users.length)
    })



    socket.on('users-update', (users) => {
      console.log('👥 Users update received:', users)
      
      const activeCollaborators = users.map((user) => ({
        id: user.userId,
        name: user.userName,
        avatar: `/api/placeholder/32/32`,
        status: 'online',
        userId: user.userId,
        isCurrentUser: user.userId === userId,
        role: 'viewer',
        activity: 'viewing',
        lastActivity: new Date().toISOString(),
        permissions: {
          canView: true,
          canEdit: false,
          canInvite: false,
          canDelete: false
        }
      }))
      
      console.log('✅ Setting collaborators from users-update:', activeCollaborators)
      setCollaborators(activeCollaborators)
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