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

  // Expose io globally so REST routes can emit Socket.IO events
  global.__io = io

  // Document rooms — exposed globally so API routes can read live peer state
  const documentRooms = new Map()
  global.__documentRooms = documentRooms

  // Cooldown per room — prevent discussion-navigator from firing too frequently
  const discussionNavCooldowns = new Map() // documentId → timestamp of last fire

  async function maybeNavigateDiscussion(documentId) {
    const now = Date.now()
    const lastFired = discussionNavCooldowns.get(documentId) || 0
    if (now - lastFired < 30000) return // 30s cooldown

    const room = documentRooms.get(documentId)
    if (!room || room.chatHistory.length < 2) return

    // Only proceed if multiple users are present
    const uniqueUsers = new Set(room.chatHistory.slice(-6).map(m => m.userId))
    if (uniqueUsers.size < 2) return

    discussionNavCooldowns.set(documentId, now)

    try {
      const res = await fetch(`http://localhost:3000/api/discussion-navigator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: room.chatHistory.slice(-6),
          documentTitle: room.documentTitle || '',
          pageTexts: room.pageTexts || {},
        }),
      })
      const data = await res.json()
      if (data.navigate && data.page) {
        console.log(`🧭 [DiscussionNav] Room ${documentId}: navigating all to page ${data.page} — "${data.label}"`)
        io.to(documentId).emit('discussion-navigate', {
          page: data.page,
          label: data.label || '',
          highlightLabel: data.highlightLabel || data.label || '',
          confidence: data.confidence || 'medium',
          reason: data.reason || '',
        })
      }
    } catch (err) {
      console.warn(`[DiscussionNav] fetch error for ${documentId}:`, err.message)
    }
  }

  // Expose discussion navigator globally so REST routes can trigger it
  global.__maybeNavigateDiscussion = maybeNavigateDiscussion

  // Google-Docs-style user identity colors — assigned by join order
  const USER_IDENTITY_COLORS = [
    '#0ea5e9', // sky blue
    '#f97316', // orange
    '#10b981', // emerald
    '#a855f7', // purple
    '#ef4444', // red
    '#eab308', // yellow
    '#ec4899', // pink
    '#14b8a6', // teal
  ]

  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`)

    socket.on('join-document', ({ documentId, userName, userId }) => {
      socket.join(documentId)
      console.log(`📄 ${userName} (${userId}) joined document: ${documentId}`)

      socket.data = { documentId, userName, userId }

      if (!documentRooms.has(documentId)) {
        documentRooms.set(documentId, { highlights: [], users: [], chatHistory: [], pageTexts: {}, documentTitle: '' })
      }

      const room = documentRooms.get(documentId)

      // ✅ Check if user already exists (prevent duplicates)
      const existingUserIndex = room.users.findIndex(u => u.userId === userId)
      if (existingUserIndex >= 0) {
        // Update existing user's socketId (keep their assigned color)
        room.users[existingUserIndex].socketId = socket.id
        console.log(`🔄 Updated existing user: ${userName} (${userId}) -> socket: ${socket.id}`)
      } else {
        // Assign identity color by join order
        const userColor = USER_IDENTITY_COLORS[room.users.length % USER_IDENTITY_COLORS.length]
        room.users.push({ socketId: socket.id, userName, userId, userColor })
        console.log(`✅ Added new user: ${userName} (${userId}) -> socket: ${socket.id}, color: ${userColor}`)
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

      const room = documentRooms.get(documentId)
      const senderUser = room?.users.find(u => u.userId === highlightData.userId)
      const enrichedHighlight = {
        ...highlightData,
        id: `highlight_${Date.now()}_${socket.id}`,
        timestamp: new Date().toISOString(),
        userColor: senderUser?.userColor || '#6366f1',
      }

      if (room) {
        room.highlights.push(enrichedHighlight)

        // ── Server-side divergence detection ──────────────────────────────────
        // Only check when the incoming highlight has a reason (set after user picks one)
        const inReason = (highlightData.reason || highlightData.comment || '').toLowerCase()
        const inText = (highlightData.text || highlightData.contents || '').toLowerCase()
        const inPage = highlightData.pageNumber || highlightData.page || 0
        const inUser = highlightData.userId || highlightData.user || ''
        const inUserName = highlightData.userName || highlightData.user || 'Peer'

        if (inReason && inText && inText.length > 10) {
          // Tokenise — words longer than 3 chars
          const tokensIn = new Set(inText.split(/\s+/).filter(t => t.length > 3))

          for (const h of room.highlights) {
            const hReason = (h.reason || h.comment || '').toLowerCase()
            const hText = (h.text || h.contents || '').toLowerCase()
            const hPage = h.pageNumber || h.page || 0
            const hUser = h.userId || h.user || ''
            const hUserName = h.userName || h.user || 'Peer'

            // Skip same user, same reason, far-away pages
            if (hUser === inUser) continue
            if (hReason === inReason) continue
            if (Math.abs(hPage - inPage) > 1) continue
            if (!hText || hText.length < 10) continue

            const tokensH = new Set(hText.split(/\s+/).filter(t => t.length > 3))
            if (tokensH.size === 0 || tokensIn.size === 0) continue

            const intersection = [...tokensIn].filter(t => tokensH.has(t)).length
            const union = new Set([...tokensIn, ...tokensH]).size
            const jaccard = intersection / union

            if (jaccard >= 0.20) {  // lower threshold — same-page nearby passages
              // Find shared words as passage excerpt
              const shared = [...tokensIn].filter(t => tokensH.has(t)).slice(0, 8).join(' ')
              console.log(`🔀 [Server] Divergence: "${inUserName}" (${inReason}) vs "${hUserName}" (${hReason}) — overlap ${(jaccard*100).toFixed(0)}%`)

              io.to(documentId).emit('divergence-signal', {
                passage: shared || inText.slice(0, 80),
                userAName: inUserName,
                userAReason: inReason,
                userBName: hUserName,
                userBReason: hReason,
                sectionId: highlightData.sectionId || `page-${inPage}`,
                overlapScore: jaccard,
              })
              break  // one divergence signal per highlight is enough
            }
          }
        }
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
        // Accumulate all group messages for discussion navigator
        if (!data.toUserId) {
          room.chatHistory.push({
            userId: data.fromUserId || data.userId || socket.id,
            userName: data.fromUserName || 'Unknown',
            message: data.message || data.content || '',
            timestamp: Date.now(),
          })
          // Keep only last 20 messages
          if (room.chatHistory.length > 20) room.chatHistory.splice(0, room.chatHistory.length - 20)

          // Every 3 group messages, check if we should navigate
          if (room.chatHistory.length % 3 === 0) {
            maybeNavigateDiscussion(data.documentId)
          }
        }

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

    // ── Page texts sync — clients send extracted page text for discussion navigator ──
    socket.on('page-texts-sync', (data) => {
      const room = documentRooms.get(data.documentId)
      if (room && data.pageTexts) {
        // Merge — client sends its current page texts cache
        Object.assign(room.pageTexts, data.pageTexts)
        if (data.documentTitle) room.documentTitle = data.documentTitle
        console.log(`📄 [Server] Page texts synced for ${data.documentId}: ${Object.keys(room.pageTexts).length} pages`)
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

    // Async marginal note created — broadcast to live readers in same document
    socket.on('marginal-note-created', (data) => {
      const { documentId } = data
      console.log(`📝 [Server] Marginal note created by ${data.authorName} on page ${data.pageNumber} in ${documentId}`)
      socket.to(documentId).emit('marginal-note-created', data)
    })

    // ✅ ADD: Handle Session Phase Start Sync
    socket.on('session-start', (data) => {
      console.log(`🚀 [Server] Session Start Triggered by ${socket.id} at ${data.timestamp}`)
      // Broadcast to everyone in the room (including sender, for confirmation/sync)
      if (data.documentId) {
        io.to(data.documentId).emit('session-start', data)
      }
    })

    // ── Peer page position tracking — feeds ReadingTrajectoryMap ──────────────
    socket.on('peer-page-changed', (data) => {
      const room = documentRooms.get(data.documentId)
      if (room) {
        const user = room.users.find(u => u.userId === data.userId)
        if (user) {
          user.currentPage = data.currentPage
          user.currentSectionId = data.currentSectionId
          user.currentSectionName = data.currentSectionName
        }
      }
      socket.to(data.documentId).emit('peer-page-changed', data)
    })

    // ── A2 peer notification — routes struggle/help signals cross-user ──────────
    // Sent by the coordination core when A2 identifies a helper for a struggling reader.
    // Delivered only to the target user's socket, not broadcast to the whole room.
    socket.on('peer-notification', (data) => {
      const { targetUserId, documentId } = data
      const room = documentRooms.get(documentId)
      if (!room) {
        console.log(`[Server] peer-notification: room ${documentId} not found`)
        return
      }
      const targetUser = room.users.find(u => String(u.userId) === String(targetUserId))
      if (targetUser) {
        io.to(targetUser.socketId).emit('peer-notification', data)
        console.log(`🔔 [Server] peer-notification → ${targetUser.userName} (${targetUser.socketId})`)
      } else {
        console.log(`[Server] peer-notification: target user ${targetUserId} not in room`)
      }
    })

    // ── Annotation divergence — when two readers mark same passage differently ─
    socket.on('annotation-divergence', (data) => {
      const excerpt = (data.passage || data.passageText || '').slice(0, 40)
      console.log(`⚡ [Server] Divergence detected in ${data.documentId}: "${excerpt}..."`)
      io.to(data.documentId).emit('divergence-signal', data)
    })

    // ── Structured debate — A3 facilitated discussion ─────────────────────────
    socket.on('debate-position', (data) => {
      socket.to(data.documentId).emit('debate-position', data)
    })

    socket.on('debate-synthesis-ready', (data) => {
      io.to(data.documentId).emit('debate-synthesis-ready', data)
    })

    socket.on('debate-opened', (data) => {
      socket.to(data.documentId).emit('debate-opened', data)
    })

    socket.on('debate-closed', (data) => {
      io.to(data.documentId).emit('debate-closed', data)
    })

    // ── Marginal note replies — threaded epistemic notes ──────────────────────
    socket.on('marginal-note-reply', (data) => {
      socket.to(data.documentId).emit('marginal-note-reply', data)
    })

    socket.on('marginal-note-tag-update', (data) => {
      socket.to(data.documentId).emit('marginal-note-tag-update', data)
    })

    // ── Reading trajectory — D_s snapshot broadcast ───────────────────────────
    socket.on('ds-snapshot', (data) => {
      socket.to(data.documentId).emit('ds-snapshot', data)
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