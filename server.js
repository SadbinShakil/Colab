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

      if (!documentRooms.has(documentId)) {
        documentRooms.set(documentId, { highlights: [], users: [] })
      }

      const room = documentRooms.get(documentId)
      room.users.push({ socketId: socket.id, userName, userId })

      socket.emit('existing-highlights', room.highlights)
      io.to(documentId).emit('users-update', room.users)
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
    })
  })

  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Next.js + Socket.io ready on http://${hostname}:${port}`)
  })
})