import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Store active document sessions in memory
const documentSessions = new Map<string, Set<string>>()
const userSessions = new Map<string, { 
  documentId: string; 
  userId: string; 
  userName: string;
  role?: 'viewer' | 'editor' | 'admin';
  activity?: 'viewing' | 'editing' | 'idle';
  lastActivity?: string;
}>()
const documentHighlights = new Map<string, any[]>()
const documentMessages = new Map<string, any[]>()
const documentInvites = new Map<string, any[]>()
const userRoles = new Map<string, Map<string, 'viewer' | 'editor' | 'admin'>>()

// Initialize with sample messages for new documents
const initializeSampleMessages = (documentId: string) => {
  if (!documentMessages.has(documentId)) {
    documentMessages.set(documentId, [
      {
        id: 'msg_1',
        documentId,
        userId: 'ai-assistant',
        userName: 'AI Assistant',
        content: 'Hello! I can help you understand this document. Ask me anything about the content, methodology, or concepts.',
        type: 'AI_RESPONSE',
        timestamp: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      }
    ])
  }
}

// Initialize user roles for a document
const initializeUserRoles = (documentId: string, userId: string) => {
  if (!userRoles.has(documentId)) {
    userRoles.set(documentId, new Map())
  }
  const documentUserRoles = userRoles.get(documentId)!
  if (!documentUserRoles.has(userId)) {
    // First user becomes admin, others become viewers
    const isFirstUser = documentUserRoles.size === 0
    documentUserRoles.set(userId, isFirstUser ? 'admin' : 'viewer')
  }
  return documentUserRoles.get(userId)!
}

export async function GET(req: NextRequest) {
  return new Response('Collaboration API endpoint', { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error('Failed to parse JSON:', error)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      }), { status: 400 })
    }

    const { action, documentId, userId, userName, highlightData, messageData, inviteData, activity, targetUserId, newRole } = body

    if (!action) {
      return new Response(JSON.stringify({ 
        error: 'Action is required' 
      }), { status: 400 })
    }

    switch (action) {
      case 'join-document':
        if (!documentId || !userId || !userName) {
          return new Response(JSON.stringify({ 
            error: 'documentId, userId, and userName are required' 
          }), { status: 400 })
        }

        // Add user to document session
        if (!documentSessions.has(documentId)) {
          documentSessions.set(documentId, new Set())
        }
        documentSessions.get(documentId)!.add(userId)
        
        // Initialize user role
        const userRole = initializeUserRoles(documentId, userId)
        
        userSessions.set(userId, { 
          documentId, 
          userId, 
          userName,
          role: userRole,
          activity: 'viewing',
          lastActivity: new Date().toISOString()
        })
        
        // Initialize sample messages if this is a new document
        initializeSampleMessages(documentId)
        
        // Get existing highlights and messages for this document
        const existingHighlights = documentHighlights.get(documentId) || []
        const existingMessages = documentMessages.get(documentId) || []
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Joined document session',
          activeUsers: Array.from(documentSessions.get(documentId) || []).map(id => userSessions.get(id)),
          existingHighlights,
          existingMessages,
          userRole
        }), { status: 200 })

      case 'leave-document':
        // Remove user from document session
        documentSessions.get(documentId)?.delete(userId)
        userSessions.delete(userId)
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Left document session' 
        }), { status: 200 })

      case 'add-highlight':
        // Store highlight data
        if (!documentHighlights.has(documentId)) {
          documentHighlights.set(documentId, [])
        }
        
        const newHighlight = {
          id: Date.now().toString(),
          ...highlightData,
          userId,
          userName,
          timestamp: new Date().toISOString()
        }
        
        documentHighlights.get(documentId)!.push(newHighlight)
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Highlight added',
          highlight: newHighlight
        }), { status: 200 })

      case 'send-message':
        // Store chat message
        if (!documentMessages.has(documentId)) {
          documentMessages.set(documentId, [])
        }
        
        const newMessage = {
          id: `msg_${Date.now()}_${userId}`,
          documentId,
          userId,
          userName,
          content: messageData.content,
          type: messageData.type || 'TEXT',
          timestamp: new Date().toISOString(),
          isPrivate: messageData.type === 'PRIVATE',
          recipientId: messageData.recipientId
        }
        
        documentMessages.get(documentId)!.push(newMessage)
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Message sent',
          chatMessage: newMessage
        }), { status: 200 })

      case 'get-messages':
        const messages = documentMessages.get(documentId) || []
        return new Response(JSON.stringify({ 
          success: true, 
          messages
        }), { status: 200 })

      case 'get-highlights':
        const highlights = documentHighlights.get(documentId) || []
        return new Response(JSON.stringify({ 
          success: true, 
          highlights 
        }), { status: 200 })

      case 'get-active-users':
        if (!documentId) {
          return new Response(JSON.stringify({ 
            error: 'documentId is required' 
          }), { status: 400 })
        }

        const activeUsers = Array.from(documentSessions.get(documentId) || [])
          .map(userId => userSessions.get(userId))
          .filter(Boolean)
        
        return new Response(JSON.stringify({ 
          success: true, 
          activeUsers 
        }), { status: 200 })

      case 'update-activity':
        // Update user activity
        const userSession = userSessions.get(userId)
        if (userSession) {
          userSession.activity = activity
          userSession.lastActivity = new Date().toISOString()
          userSessions.set(userId, userSession)
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Activity updated' 
        }), { status: 200 })

      case 'invite-collaborator':
        // Store invitation
        if (!documentInvites.has(documentId)) {
          documentInvites.set(documentId, [])
        }
        
        const newInvite = {
          id: `invite_${Date.now()}`,
          documentId,
          invitedBy: userId,
          invitedByName: userName,
          email: inviteData.email,
          role: inviteData.role,
          message: inviteData.message,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        
        documentInvites.get(documentId)!.push(newInvite)
        
        // In a real implementation, you would send an email here
        console.log('Invitation sent:', newInvite)
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Invitation sent',
          invite: newInvite
        }), { status: 200 })

      case 'change-role':
        // Check if user has admin permissions
        const currentUserRole = userRoles.get(documentId)?.get(userId)
        if (currentUserRole !== 'admin') {
          return new Response(JSON.stringify({ 
            error: 'Insufficient permissions' 
          }), { status: 403 })
        }
        
        // Change target user's role
        if (!userRoles.has(documentId)) {
          userRoles.set(documentId, new Map())
        }
        userRoles.get(documentId)!.set(targetUserId, newRole)
        
        // Update user session if they're online
        const targetUserSession = userSessions.get(targetUserId)
        if (targetUserSession) {
          targetUserSession.role = newRole
          userSessions.set(targetUserId, targetUserSession)
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Role changed',
          newRole
        }), { status: 200 })

      case 'remove-collaborator':
        // Check if user has admin permissions
        const adminRole = userRoles.get(documentId)?.get(userId)
        if (adminRole !== 'admin') {
          return new Response(JSON.stringify({ 
            error: 'Insufficient permissions' 
          }), { status: 403 })
        }
        
        // Remove user from document session
        documentSessions.get(documentId)?.delete(targetUserId)
        userSessions.delete(targetUserId)
        
        // Remove user role
        userRoles.get(documentId)?.delete(targetUserId)
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Collaborator removed' 
        }), { status: 200 })

      case 'get-invites':
        const invites = documentInvites.get(documentId) || []
        return new Response(JSON.stringify({ 
          success: true, 
          invites
        }), { status: 200 })

      case 'accept-invite':
        // Accept invitation and join document
        const invite = documentInvites.get(documentId)?.find(inv => inv.id === inviteData.inviteId)
        if (!invite) {
          return new Response(JSON.stringify({ 
            error: 'Invitation not found' 
          }), { status: 404 })
        }
        
        // Set user role based on invitation
        if (!userRoles.has(documentId)) {
          userRoles.set(documentId, new Map())
        }
        userRoles.get(documentId)!.set(userId, invite.role)
        
        // Update invitation status
        invite.status = 'accepted'
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Invitation accepted',
          role: invite.role
        }), { status: 200 })

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action' 
        }), { status: 400 })
    }
  } catch (error) {
    console.error('Collaboration API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { status: 500 })
  }
} 