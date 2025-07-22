import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo (in real app, use database)
const chatMessages: { [documentId: string]: any[] } = {}
const typingUsers: { [documentId: string]: Set<string> } = {}
const activeUsers: { [documentId: string]: Set<string> } = {}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  
  if (!documentId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
  }
  
  return NextResponse.json({
    messages: chatMessages[documentId] || [],
    typingUsers: Array.from(typingUsers[documentId] || []),
    activeUsers: Array.from(activeUsers[documentId] || [])
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, userId, userName, content, type = 'TEXT', action } = body
    
    if (!documentId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Handle different actions
    if (action === 'typing-start') {
      if (!typingUsers[documentId]) {
        typingUsers[documentId] = new Set()
      }
      typingUsers[documentId].add(userName || 'Anonymous')
      return NextResponse.json({ success: true })
    }
    
    if (action === 'typing-stop') {
      if (typingUsers[documentId]) {
        typingUsers[documentId].delete(userName || 'Anonymous')
      }
      return NextResponse.json({ success: true })
    }
    
    if (action === 'join') {
      if (!activeUsers[documentId]) {
        activeUsers[documentId] = new Set()
      }
      activeUsers[documentId].add(userName || 'Anonymous')
      return NextResponse.json({ success: true })
    }
    
    if (action === 'leave') {
      if (activeUsers[documentId]) {
        activeUsers[documentId].delete(userName || 'Anonymous')
      }
      return NextResponse.json({ success: true })
    }
    
    // Handle regular message
    if (!content) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }
    
    const message = {
      id: `msg_${Date.now()}_${userId}`,
      documentId,
      userId,
      userName: userName || 'Anonymous',
      content,
      type,
      timestamp: new Date().toISOString()
    }
    
    // Store message
    if (!chatMessages[documentId]) {
      chatMessages[documentId] = []
    }
    chatMessages[documentId].push(message)
    
    // Remove typing indicator when message is sent
    if (typingUsers[documentId]) {
      typingUsers[documentId].delete(userName || 'Anonymous')
    }
    
    return NextResponse.json({ success: true, message })
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 