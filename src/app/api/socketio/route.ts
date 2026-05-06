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
        
        // ✅ CRITICAL: Convert userId to string for consistent comparison
        const userIdStr = String(userId)
        
        console.log(`📄 ${userName} (userId: ${userIdStr}) joined document: ${documentId}`)

        // Initialize room if needed
        if (!documentRooms.has(documentId)) {
          documentRooms.set(documentId, { highlights: [], users: [] })
        }

        const room = documentRooms.get(documentId)
        
        // ✅ Check if user already exists (prevent duplicates) - use string comparison
        const existingUserIndex = room.users.findIndex((u: any) => String(u.userId) === userIdStr)
        if (existingUserIndex >= 0) {
          // Update socket ID for existing user
          room.users[existingUserIndex].socketId = socket.id
          console.log(`🔄 Updated socket for existing user: ${userName}`)
        } else {
          // ✅ Add new user with string userId
          room.users.push({ socketId: socket.id, userName, userId: userIdStr })
          console.log(`✅ Added new user to room: ${userName}`)
        }

        console.log(`📋 Current users in ${documentId}:`, room.users.map((u: any) => `${u.userName} (${u.userId})`))

        // Send existing highlights to new user
        socket.emit('existing-highlights', room.highlights)
        
        // Update user count for all users in room
        io?.to(documentId).emit('users-update', room.users)
      })

      // Handle peer chat invitations
      socket.on('peer-chat-invitation', (data) => {
        console.log(`\n📨 [Server] ==================== PEER INVITATION ====================`)
        console.log(`   From: ${data.fromUserName} (${data.fromUserId})`)
        console.log(`   To: ${data.toUserName} (${data.toUserId})`)
        console.log(`   Document: ${data.documentId}`)
        console.log(`   Section: ${data.sectionId}`)

        // ✅ CRITICAL: Convert to strings for comparison
        const targetUserId = String(data.toUserId)

        // Find the target user's socket ID
        const room = documentRooms.get(data.documentId)
        if (!room) {
          console.log(`❌ [Server] Document room ${data.documentId} not found`)
          console.log(`📋 [Server] Available rooms:`, Array.from(documentRooms.keys()))
          return
        }

        console.log(`\n🔍 [Server] Searching for target user in room...`)
        console.log(`   Looking for userId: "${targetUserId}"`)
        console.log(`   Room has ${room.users.length} users:`)
        room.users.forEach((u: any, idx: number) => {
          const match = String(u.userId) === targetUserId ? '✅ MATCH' : ''
          console.log(`      ${idx + 1}. ${u.userName} - userId: "${u.userId}" - socketId: ${u.socketId} ${match}`)
        })

        // ✅ Use string comparison
        const targetUser = room.users.find((u: any) => String(u.userId) === targetUserId)
        if (targetUser) {
          console.log(`\n✅ [Server] Target user FOUND: ${targetUser.userName}`)
          console.log(`   Socket ID: ${targetUser.socketId}`)
          
          // Send invitation ONLY to the specific user
          io?.to(targetUser.socketId).emit('peer-chat-invitation', {
            ...data,
            timestamp: Date.now()
          })
          console.log(`✅ [Server] Invitation emitted to socket: ${targetUser.socketId}`)
          
          // Also send confirmation back to sender
          socket.emit('invitation-sent', {
            toUserName: data.toUserName,
            status: 'delivered'
          })
          console.log(`✅ [Server] Confirmation sent to sender`)
        } else {
          console.log(`\n❌ [Server] Target user NOT FOUND`)
          console.log(`   userId mismatch detected!`)
          
          // Try to find by userName as fallback
          const userByName = room.users.find((u: any) => u.userName === data.toUserName)
          if (userByName) {
            console.log(`⚠️  [Server] Found user by NAME instead: ${userByName.userName}`)
            console.log(`   Their userId is: "${userByName.userId}" (expected: "${targetUserId}")`)
            console.log(`   This indicates a userId mismatch problem!`)
          }
          
          socket.emit('invitation-failed', {
            toUserName: data.toUserName,
            reason: 'User not found in room'
          })
        }
        console.log(`============================================================\n`)
      })
      
      socket.on('peer-chat-accepted', (data) => {
        console.log(`\n✅ [Server] ==================== INVITATION ACCEPTED ====================`)
        console.log(`   ${data.toUserName} accepted invitation from ${data.fromUserName}`)
        console.log(`   Document: ${data.documentId}`)

        // ✅ Convert to string
        const fromUserId = String(data.fromUserId)

        // Find the original inviter's socket ID
        const room = documentRooms.get(data.documentId)
        if (room) {
          const inviterUser = room.users.find((u: any) => String(u.userId) === fromUserId)
          if (inviterUser) {
            // Notify ONLY the original inviter
            io?.to(inviterUser.socketId).emit('peer-chat-accepted', {
              ...data,
              timestamp: Date.now()
            })
            console.log(`✅ [Server] Acceptance sent to: ${inviterUser.userName} (${inviterUser.socketId})`)
          } else {
            console.log(`❌ [Server] Original inviter ${data.fromUserId} not found`)
          }
        }
        console.log(`============================================================\n`)
      })
      
      // Handle peer joining for Agent 2
      socket.on('peer-joined', ({ documentId, userName, userId }) => {
        console.log(`👥 Peer joined event: ${userName} (${userId})`)
        
        // Broadcast to all other users in the document
        socket.to(documentId).emit('peer-joined', {
          userId: String(userId),
          userName,
          documentId
        })
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

      // Handle assignment changes
      socket.on('assignment-changed', (assignmentData) => {
        const { documentId, assignments, userName } = assignmentData
        
        console.log(`📋 Assignment changed by ${userName} in ${documentId}`)
        
        // Broadcast to ALL users in the room (including sender for confirmation)
        io?.to(documentId).emit('assignment-updated', {
          assignments,
          updatedBy: userName,
          timestamp: new Date().toISOString()
        })
        
        console.log(`✅ Assignment broadcasted to all users in ${documentId}`)
      })

 // ✅ Section Completion Notification
socket.on('section-completed', (data) => {
  const { documentId, sectionName, userName } = data
  console.log(`✅ Section completed: ${sectionName} by ${userName}`)
  
  // Broadcast to everyone in the room
  io?.to(documentId).emit('section-completed', {
    userName,
    sectionName,
    timestamp: new Date().toISOString()
  })
})

// ✅ Summary Sharing
socket.on('summary-shared', (data) => {
  const { documentId, sectionId, userName, summary } = data
  console.log(`📝 Summary shared for section ${sectionId} by ${userName}`)
  
  // Broadcast to everyone in the room
  io?.to(documentId).emit('summary-shared', {
    sectionId,
    userName,
    summary,
    timestamp: new Date().toISOString()
  })
})

      socket.on('disconnect', () => {
        console.log(`👋 User disconnected: ${socket.id}`)
        
        // Remove user from all rooms
        documentRooms.forEach((room, documentId) => {
          const userIndex = room.users.findIndex((u: any) => u.socketId === socket.id)
          if (userIndex >= 0) {
            const user = room.users[userIndex]
            room.users.splice(userIndex, 1)
            console.log(`🗑️  Removed ${user.userName} from ${documentId}`)
            
            // Notify remaining users
            io?.to(documentId).emit('users-update', room.users)
          }
        })
      })
    })

    ;(global as any).io = io
  }

  return new Response(JSON.stringify({ status: 'ok', port: 3001 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}