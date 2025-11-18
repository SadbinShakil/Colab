// src/app/api/socket/route.ts

// Extend global type
declare global {
  var sectionAssignments: Record<string, any[]> | undefined
}

import { NextResponse } from "next/server"

// In-memory storage for annotations (replace with database in production)
const annotationStorage: Record<string, any[]> = {}

// In-memory storage for demo (in real app, use database)
const chatMessages: { [documentId: string]: any[] } = {}
const typingUsers: { [documentId: string]: Set<string> } = {}
const activeUsers: { [documentId: string]: Set<string> } = {}
const realtimeAnnotations: { [documentId: string]: any[] } = {}
const annotationSubscribers: { [documentId: string]: Set<string> } = {}

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
          
          // Store message
          if (!chatMessages[sendMsgDocId]) {
            chatMessages[sendMsgDocId] = []
          }
          chatMessages[sendMsgDocId].push(message)
          
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

      case 'get-highlights':
        // Handle getting highlights (empty for now)
        const { documentId: getHighlightsDocId } = body
        if (getHighlightsDocId) {
          return NextResponse.json({
            success: true,
            highlights: []
          })
        }
        return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })

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

      case 'get-realtime-annotations':
        // Handle getting real-time annotations
        const { documentId: getAnnotationsDocId, userId: getAnnotationsUserId } = body
        if (getAnnotationsDocId) {
          // Add user to subscribers
          if (!annotationSubscribers[getAnnotationsDocId]) {
            annotationSubscribers[getAnnotationsDocId] = new Set()
          }
          annotationSubscribers[getAnnotationsDocId].add(getAnnotationsUserId || 'anonymous')
          
          // Return recent annotation events (last 50)
          const allAnnotations = realtimeAnnotations[getAnnotationsDocId] || []
          const recentAnnotations = allAnnotations
            .slice(-50)
            .filter(annotation => annotation.userId !== getAnnotationsUserId) // Don't send user's own annotations back
          
          console.log(`🔍 Real-time annotations for ${getAnnotationsUserId}:`, {
            total: allAnnotations.length,
            filtered: recentAnnotations.length,
            allUserIds: allAnnotations.map(a => a.userId),
            requestingUserId: getAnnotationsUserId
          })
          
          return NextResponse.json({
            success: true,
            annotations: recentAnnotations,
            subscriberCount: annotationSubscribers[getAnnotationsDocId]?.size || 0
          })
        }
        return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 })



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