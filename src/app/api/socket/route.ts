// src/app/api/socket/route.ts

// Extend global type
declare global {
  var sectionAssignments: Record<string, any[]> | undefined
  var sectionSummaries: Record<string, Record<string, any>> | undefined
  var __reflectionStore: Record<string, Record<string, { userName: string; content: string; timestamp: string }>> | undefined
  var __allocationResultStore: Record<string, { assignments: any[]; computedAt: string }> | undefined
  var __activeUsers: Record<string, Set<string>> | undefined
}

import { NextResponse } from "next/server"

// In-memory storage for annotations (replace with database in production)
const annotationStorage: Record<string, any[]> = {}

// In-memory storage for demo (in real app, use database)
const chatMessages: { [documentId: string]: any[] } = {}
const typingUsers: { [documentId: string]: Set<string> } = {}
// Active users pinned to global so hot reloads don't wipe join state
if (!global.__activeUsers) global.__activeUsers = {}
const activeUsers = global.__activeUsers
const realtimeAnnotations: { [documentId: string]: any[] } = {}
const annotationSubscribers: { [documentId: string]: Set<string> } = {}

// Phase I reflections — survive hot reloads via global
// documentId → userId → { userName, content, timestamp }
if (!global.__reflectionStore) global.__reflectionStore = {}
const reflectionStore = global.__reflectionStore

// Shared A10 allocation result — survive hot reloads via global
if (!global.__allocationResultStore) global.__allocationResultStore = {}
const allocationResultStore = global.__allocationResultStore

// Problem 3: Passage highlight index for divergence detection
// documentId → passageKey → PassageHighlight
interface PassageHighlight {
  passageKey: string
  passageText: string
  sectionId: string
  sectionName: string
  entries: Array<{
    userId: string
    userName: string
    reason: string       // 'confusion' | 'understood' | 'general'
    timestamp: string
    annotationId: string
  }>
}
const passageHighlightIndex: Record<string, Record<string, PassageHighlight>> = {}

export async function POST(req: Request) {
  let body: any = {}

  // ✅ Only parse JSON if there's a non-empty body
  if (req.headers.get("content-type")?.includes("application/json")) {
    const raw = await req.text() // read as plain text first
    if (raw.trim().length > 0) {
      try {
        body = JSON.parse(raw)
      } catch (err) {
        console.error("❌ JSON parse error:", err)
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        )
      }
    } else {
      console.warn("⚠️ Empty JSON body received at /api/socket")
    }
  } else {
    console.warn("⚠️ No JSON body sent to /api/socket")
  }

  // Handle different actions
  const action = body?.action || "none"
  
  try {
    switch (action) {
      case 'update-activity':
        // Handle activity updates
        const { documentId, userId, activity } = body
        if (documentId && userId && activity) {
          // In a real app, you'd store this in a database
          console.log(`📊 Activity update: User ${userId} is ${activity} on document ${documentId}`)
          return NextResponse.json({
            success: true,
            message: "Activity updated",
            data: { documentId, userId, activity },
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json(
            { success: false, error: "Missing required fields for activity update" },
            { status: 400 }
          )
        }

        case 'broadcast-annotation': {
          const { documentId: reqDocId, annotationData } = body  // 👈 Extract documentId
          
          // Save to in-memory storage (or database)
          if (!annotationStorage[reqDocId]) {  // 👈 Use reqDocId
            annotationStorage[reqDocId] = []
          }
          
          annotationStorage[reqDocId].push({  // 👈 Use reqDocId
            ...annotationData,
            userId: body.userId,
            userName: body.userName
          })
          
          console.log('📡 Annotation broadcast received:', annotationData.id)
          
          return NextResponse.json({ success: true })
        }
        
        case 'get-annotations': {
          const { documentId: reqDocId } = body  // 👈 ADD THIS LINE
          const annotations = annotationStorage[reqDocId] || []  // 👈 Use reqDocId
          
          return NextResponse.json({ 
            success: true, 
            annotations 
          })
        }
        
        case 'delete-annotation': {
          const { documentId: reqDocId, annotationId } = body  // 👈 Extract documentId
          
          if (annotationStorage[reqDocId]) {  // 👈 Use reqDocId
            annotationStorage[reqDocId] = annotationStorage[reqDocId].filter(
              (a: any) => a.id !== annotationId
            )
          }
          
          return NextResponse.json({ success: true })
        }

        case 'join-document':
          // Handle user joining document
          const { documentId: joinDocId, userId: joinUserId, userName: joinUserName } = body
          if (joinDocId && joinUserId) {
            if (!activeUsers[joinDocId]) {
              activeUsers[joinDocId] = new Set()
            }
            
            // Store as object with userId and userName
            const userKey = JSON.stringify({ userId: joinUserId, userName: joinUserName || 'Anonymous' })
            activeUsers[joinDocId].add(userKey)
            
            console.log(`👤 User ${joinUserName} (${joinUserId}) joined document ${joinDocId}`)
            
            // Convert Set to array of objects for response
            const usersArray = Array.from(activeUsers[joinDocId]).map(userStr => JSON.parse(userStr))
            
            return NextResponse.json({
              success: true,
              message: "Joined document",
              activeUsers: usersArray
            })
          }
          return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

      case 'leave-document':
        // Handle user leaving document
        const { documentId: leaveDocId, userId: leaveUserId, userName: leaveUserName } = body
        if (leaveDocId && leaveUserId) {
          if (activeUsers[leaveDocId]) {
            activeUsers[leaveDocId].delete(leaveUserName || 'Anonymous')
          }
          console.log(`👋 User ${leaveUserName || 'Anonymous'} left document ${leaveDocId}`)
          return NextResponse.json({
            success: true,
            message: "Left document",
            activeUsers: Array.from(activeUsers[leaveDocId] || [])
          })
        }
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

      case 'get-messages':
        // Handle getting messages
        const { documentId: getMsgDocId } = body
        if (getMsgDocId) {
          return NextResponse.json({
            success: true,
            messages: chatMessages[getMsgDocId] || [],
            activeUsers: Array.from(activeUsers[getMsgDocId] || []),
            typingUsers: Array.from(typingUsers[getMsgDocId] || [])
          })
        }
        return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })

      case 'send-message':
        // Handle sending messages
        const {
          documentId: sendMsgDocId,
          userId: sendMsgUserId,
          userName: sendMsgUserName,
          messageData
        } = body
        if (sendMsgDocId && sendMsgUserId && messageData) {
          const message = {
            id: `msg_${Date.now()}_${sendMsgUserId}`,
            documentId: sendMsgDocId,
            userId: sendMsgUserId,
            userName: sendMsgUserName || 'Anonymous',
            content: messageData.content,
            type: messageData.type || 'TEXT',
            recipientId: messageData.recipientId,
            timestamp: new Date().toISOString()
          }

          // Store message in REST cache
          if (!chatMessages[sendMsgDocId]) {
            chatMessages[sendMsgDocId] = []
          }
          chatMessages[sendMsgDocId].push(message)

          // Emit via Socket.IO so all peers receive it in real-time
          // and so the discussion navigator (maybeNavigateDiscussion) can trigger
          const io = (global as any).__io
          const rooms = (global as any).__documentRooms
          if (io) {
            const payload = {
              fromUserId: sendMsgUserId,
              fromUserName: sendMsgUserName || 'Anonymous',
              message: messageData.content,
              content: messageData.content,
              type: messageData.type || 'TEXT',
              documentId: sendMsgDocId,
              toUserId: messageData.recipientId || null,
              anchor: messageData.anchor || null,
              timestamp: message.timestamp,
            }
            // Push into room chatHistory so discussion navigator can process it
            if (rooms) {
              const room = rooms.get(sendMsgDocId)
              if (room && !messageData.recipientId) {
                room.chatHistory.push({
                  userId: sendMsgUserId,
                  userName: sendMsgUserName || 'Anonymous',
                  message: messageData.content,
                  timestamp: Date.now(),
                })
                if (room.chatHistory.length > 20) room.chatHistory.splice(0, room.chatHistory.length - 20)
                // Trigger discussion navigator every 3 group messages
                if (room.chatHistory.length % 3 === 0) {
                  const maybeNav = (global as any).__maybeNavigateDiscussion
                  if (maybeNav) maybeNav(sendMsgDocId)
                }
              }
            }
            // Broadcast to all other clients in the room
            io.to(sendMsgDocId).emit('peer-chat-message', payload)
          }

          console.log(`💬 Message sent by ${sendMsgUserName || 'Anonymous'} in document ${sendMsgDocId}`)
          return NextResponse.json({
            success: true,
            message: "Message sent",
            data: message
          })
        }
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

        case 'get-active-users':
          // Handle getting active users
          const { documentId: getUsersDocId } = body
          if (getUsersDocId) {
            // Convert Set to array of user objects
            const usersArray = Array.from(activeUsers[getUsersDocId] || []).map(userStr => JSON.parse(userStr))
            
            return NextResponse.json({
              success: true,
              activeUsers: usersArray.map(user => ({
                userId: user.userId,
                userName: user.userName,
                documentId: getUsersDocId
              }))
            })
          }
          return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })

      case 'get-highlights': {
        const { documentId: getHighlightsDocId } = body
        if (!getHighlightsDocId) return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })

        // Read from the Socket.IO document rooms (shared via global) if available
        const rooms = (global as any).__documentRooms as Map<string, { highlights: any[]; users: any[] }> | undefined
        const room = rooms?.get(getHighlightsDocId)
        return NextResponse.json({
          success: true,
          highlights: room?.highlights ?? []
        })
      }

      case 'add-highlight':
        // Handle adding highlights (empty for now)
        const { documentId: addHighlightDocId, highlightData } = body
        if (addHighlightDocId && highlightData) {
          const highlight = {
            id: `highlight_${Date.now()}`,
            ...highlightData,
            timestamp: new Date().toISOString()
          }
          console.log(`🎨 Highlight added in document ${addHighlightDocId}`)
          return NextResponse.json({
            success: true,
            highlight
          })
        }
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

      case 'annotation-changed':
        // Handle real-time annotation changes
        const { 
          documentId: annotationDocId, 
          userId: annotationUserId, 
          userName: annotationUserName,
          annotationData,
          annotationAction 
        } = body
        if (annotationDocId && annotationUserId && annotationData) {
          const annotationEvent = {
            id: `annotation_${Date.now()}_${annotationUserId}`,
            documentId: annotationDocId,
            userId: annotationUserId,
            userName: annotationUserName || 'Anonymous',
            action: annotationAction || 'add', // add, update, delete
            annotationData,
            timestamp: new Date().toISOString()
          }
          
          // Store annotation event
          if (!realtimeAnnotations[annotationDocId]) {
            realtimeAnnotations[annotationDocId] = []
          }
          realtimeAnnotations[annotationDocId].push(annotationEvent)
          
          // Keep only last 100 events per document to prevent memory issues
          if (realtimeAnnotations[annotationDocId].length > 100) {
            realtimeAnnotations[annotationDocId] = realtimeAnnotations[annotationDocId].slice(-100)
          }
          
          console.log(`💾 Stored annotation event for ${annotationDocId}:`, {
            totalEvents: realtimeAnnotations[annotationDocId].length,
            eventId: annotationEvent.id,
            userId: annotationEvent.userId,
            action: annotationEvent.action
          })
          
          console.log(`📝 Annotation ${annotationAction} by ${annotationUserName || 'Anonymous'} in document ${annotationDocId}`)
          return NextResponse.json({
            success: true,
            message: "Annotation change broadcasted",
            data: annotationEvent
          })
        }
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

      case 'get-realtime-annotations': {
        const { documentId: getAnnotationsDocId, userId: getAnnotationsUserId } = body
        if (!getAnnotationsDocId) return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })

        if (!annotationSubscribers[getAnnotationsDocId]) {
          annotationSubscribers[getAnnotationsDocId] = new Set()
        }
        annotationSubscribers[getAnnotationsDocId].add(getAnnotationsUserId || 'anonymous')

        // Merge HTTP annotation-changed events + Socket.IO highlights from the shared room
        const httpAnnotations = (realtimeAnnotations[getAnnotationsDocId] || []).slice(-50)

        const rooms = (global as any).__documentRooms as Map<string, { highlights: any[]; users: any[] }> | undefined
        const socketHighlights = (rooms?.get(getAnnotationsDocId)?.highlights ?? []).map((h: any) => ({
          id: h.id,
          documentId: getAnnotationsDocId,
          userId: h.userId || h.user || 'unknown',
          userName: h.userName || h.user || 'Collaborator',
          action: 'add',
          annotationData: {
            text: h.contents || h.text || '',
            color: h.color || '#FEF08A',
            pageNumber: h.pageNumber || h.page || 1,
          },
          timestamp: h.timestamp || new Date().toISOString(),
        }))

        // Combine and exclude the requesting user's own entries
        const combined = [...httpAnnotations, ...socketHighlights]
          .filter(a => (a.userId || a.user) !== getAnnotationsUserId)

        return NextResponse.json({
          success: true,
          annotations: combined.slice(-50),
          subscriberCount: annotationSubscribers[getAnnotationsDocId]?.size || 0
        })
      }



        case 'get-assignments':
          // Return assignments for this document
          const { documentId: getAssignDocId } = body
          if (getAssignDocId) {
            if (!global.sectionAssignments) {
              global.sectionAssignments = {}
            }
            return NextResponse.json({
              success: true,
              assignments: global.sectionAssignments[getAssignDocId] || []
            })
          }
          return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })
        
        case 'section-assigned':
          // Store assignments when someone assigns
          const { documentId: assignDocId, assignments } = body
          if (assignDocId && assignments) {
            if (!global.sectionAssignments) {
              global.sectionAssignments = {}
            }
            global.sectionAssignments[assignDocId] = assignments
            
            console.log('📋 Section assignment stored:', {
              documentId: assignDocId,
              assignmentsCount: assignments.length
            })
            
            return NextResponse.json({ 
              success: true,
              message: "Assignments saved",
              assignmentsCount: assignments.length
            })
          }
          return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })


          case 'save-summary':
            // Store section summaries
            const { documentId: summaryDocId, sectionId, userId: summaryUserId, summary } = body
            if (summaryDocId && sectionId && summary) {
              // Initialize storage if needed
              if (!global.sectionSummaries) {
                global.sectionSummaries = {}
              }
              if (!global.sectionSummaries[summaryDocId]) {
                global.sectionSummaries[summaryDocId] = {}
              }
              
              // Store summary
              global.sectionSummaries[summaryDocId][sectionId] = {
                summary,
                userId: summaryUserId,
                timestamp: new Date().toISOString()
              }
              
              console.log('📝 Summary saved:', {
                documentId: summaryDocId,
                sectionId,
                summaryLength: summary.length
              })
              
              return NextResponse.json({ 
                success: true,
                message: "Summary saved"
              })
            }
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
          
          case 'get-summaries':
            // Retrieve summaries for a document
            const { documentId: getSummariesDocId } = body
            if (getSummariesDocId) {
              if (!global.sectionSummaries) {
                global.sectionSummaries = {}
              }
              return NextResponse.json({
                success: true,
                summaries: global.sectionSummaries[getSummariesDocId] || {}
              })
            }
            return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })





      // ── Problem 3: Annotation divergence detection ─────────────────────────
      case 'register-passage-highlight': {
        const { documentId: phDocId, passageKey, passageText, sectionId: phSectionId, sectionName: phSectionName,
                userId: phUserId, userName: phUserName, reason: phReason, annotationId: phAnnotationId } = body
        if (!phDocId || !passageKey || !phUserId) break

        if (!passageHighlightIndex[phDocId]) passageHighlightIndex[phDocId] = {}
        const existing = passageHighlightIndex[phDocId][passageKey]

        if (existing) {
          // Only add if this user hasn't already registered for this passage
          const alreadyRegistered = existing.entries.some(e => e.userId === phUserId)
          if (!alreadyRegistered) {
            existing.entries.push({ userId: phUserId, userName: phUserName, reason: phReason || 'general', timestamp: new Date().toISOString(), annotationId: phAnnotationId || '' })
          }
        } else {
          passageHighlightIndex[phDocId][passageKey] = {
            passageKey, passageText: passageText || passageKey, sectionId: phSectionId || '', sectionName: phSectionName || '',
            entries: [{ userId: phUserId, userName: phUserName, reason: phReason || 'general', timestamp: new Date().toISOString(), annotationId: phAnnotationId || '' }]
          }
        }

        // Check for divergence: 2+ users, 2+ distinct reasons
        const record = passageHighlightIndex[phDocId][passageKey]
        const hasDivergence = record.entries.length >= 2 &&
          new Set(record.entries.map((e: any) => e.reason)).size >= 2 &&
          new Set(record.entries.map((e: any) => e.userId)).size >= 2

        return NextResponse.json({ success: true, divergence: hasDivergence, record })
      }

      case 'get-passage-divergences': {
        const { documentId: divDocId, userId: divUserId } = body
        if (!divDocId) return NextResponse.json({ success: true, divergences: [] })

        const docIndex = passageHighlightIndex[divDocId] || {}
        // Return passages where this user has an entry AND there's a divergence
        const divergences = Object.values(docIndex).filter((record: any) => {
          const userEntry = record.entries.find((e: any) => e.userId === divUserId)
          if (!userEntry) return false
          const otherEntries = record.entries.filter((e: any) => e.userId !== divUserId)
          if (otherEntries.length === 0) return false
          return otherEntries.some((e: any) => e.reason !== userEntry.reason)
        }).map((record: any) => {
          const userEntry = record.entries.find((e: any) => e.userId === divUserId)
          const otherEntry = record.entries.find((e: any) => e.userId !== divUserId && e.reason !== userEntry.reason)
          return {
            passageKey: record.passageKey,
            passageText: record.passageText,
            sectionName: record.sectionName,
            myReason: userEntry.reason,
            otherUserId: otherEntry.userId,
            otherUserName: otherEntry.userName,
            theirReason: otherEntry.reason,
          }
        })

        return NextResponse.json({ success: true, divergences })
      }

      case 'sync-annotations':
        // Handle annotation synchronization (for initial load)
        const { 
          documentId: syncDocId, 
          userId: syncUserId, 
          xfdfData,
          version 
        } = body
        if (syncDocId && syncUserId && xfdfData) {
          const syncEvent = {
            id: `sync_${Date.now()}_${syncUserId}`,
            documentId: syncDocId,
            userId: syncUserId,
            action: 'sync',
            xfdfData,
            version: version || 1,
            timestamp: new Date().toISOString()
          }
          
          // Store sync event
          if (!realtimeAnnotations[syncDocId]) {
            realtimeAnnotations[syncDocId] = []
          }
          realtimeAnnotations[syncDocId].push(syncEvent)
          
          console.log(`🔄 Annotation sync by user ${syncUserId} in document ${syncDocId}`)
          return NextResponse.json({
            success: true,
            message: "Annotations synchronized",
            data: syncEvent
          })
        }
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
      
      case 'save-reflection': {
        const {
          documentId: refDocId,
          userId: refUserId,
          userName: refUserName,
          content: refContent,
          sections: refSections,
          paperTitle: refPaperTitle,
          expectedParticipants: refExpected,
          forceAllocate,
        } = body
        if (!refDocId || !refUserId || !refContent) {
          return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
        }

        // Store this user's reflection (skip update if forceAllocate — content already stored)
        if (!reflectionStore[refDocId]) reflectionStore[refDocId] = {}
        if (!forceAllocate) {
          reflectionStore[refDocId][refUserId] = {
            userName: refUserName || 'Participant',
            content: refContent,
            timestamp: new Date().toISOString(),
          }
        }

        const reflectionCount = Object.keys(reflectionStore[refDocId]).length
        const expected = refExpected ?? 1

        // Run allocation ONLY when explicitly forced by the poll (which has the
        // authoritative live user count). Never auto-allocate on save — the first
        // user to submit would get an all-AI result before others join.
        const shouldAllocate = forceAllocate && refSections?.length

        if (shouldAllocate) {
          try {
            // Disambiguate names if multiple participants share the same display name
            // (e.g. two tabs on same machine logged into same account during testing)
            const nameCounts: Record<string, number> = {}
            const nameIndex: Record<string, number> = {}
            for (const d of Object.values(reflectionStore[refDocId])) {
              nameCounts[d.userName] = (nameCounts[d.userName] ?? 0) + 1
            }
            const allReflections = Object.entries(reflectionStore[refDocId]).map(([uid, d]) => {
              let displayName = d.userName
              if (nameCounts[d.userName] > 1) {
                nameIndex[d.userName] = (nameIndex[d.userName] ?? 0) + 1
                displayName = `${d.userName} (${nameIndex[d.userName]})`
              }
              return { userId: uid, userName: displayName, content: d.content }
            })

            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            const allocRes = await fetch(`${baseUrl}/api/role-allocation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reflections: allReflections,
                sections: refSections,
                paperTitle: refPaperTitle || '',
              }),
            })
            if (allocRes.ok) {
              const allocData = await allocRes.json()
              allocationResultStore[refDocId] = {
                assignments: allocData.assignments ?? [],
                computedAt: new Date().toISOString(),
              }
            }
          } catch (e) {
            console.error('[socket/save-reflection] Allocation failed:', e)
          }
        }

        return NextResponse.json({
          success: true,
          reflectionCount,
          expected,
          allocationReady: !!allocationResultStore[refDocId],
        })
      }

      case 'get-reflections': {
        const { documentId: getRefDocId } = body
        if (!getRefDocId) return NextResponse.json({ success: false, error: 'Missing documentId' }, { status: 400 })
        const stored = reflectionStore[getRefDocId] ?? {}
        const reflections = Object.entries(stored).map(([userId, data]) => ({
          userId,
          userName: data.userName,
          content: data.content,
          timestamp: data.timestamp,
        }))

        // Parse active users for this document
        const activeUserEntries = Array.from(activeUsers[getRefDocId] ?? []).map(s => {
          try { return JSON.parse(s) } catch { return null }
        }).filter(Boolean) as { userId: string; userName: string }[]

        const activeUserCount = activeUserEntries.length

        // allReflected = true only when EVERY currently joined user has submitted
        const submittedIds = new Set(Object.keys(stored))
        const allReflected = activeUserCount >= 2 &&
          activeUserEntries.every(u => submittedIds.has(u.userId))

        return NextResponse.json({ success: true, reflections, activeUserCount, allReflected })
      }

      case 'get-allocation': {
        const { documentId: getAllocDocId } = body
        if (!getAllocDocId) return NextResponse.json({ success: false, error: 'Missing documentId' }, { status: 400 })
        const result = allocationResultStore[getAllocDocId] ?? null
        return NextResponse.json({ success: true, result })
      }

      case 'clear-allocation': {
        // Called when session resets — allows re-running A10 for a new session
        const { documentId: clearDocId } = body
        if (clearDocId) {
          delete allocationResultStore[clearDocId]
          delete reflectionStore[clearDocId]
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({
          success: true,
          received: body,
          actionHandled: action,
          timestamp: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error("❌ Error processing socket request:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 