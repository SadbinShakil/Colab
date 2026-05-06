/**
 * API Route: /api/session-peers
 *
 * Returns the live list of users in a document room with their current
 * D_s scores and section positions — used by A2 for real peer matching.
 *
 * GET /api/session-peers?documentId=xxx&userId=yyy
 * POST /api/session-peers  { documentId, userId, sectionId, dsScore }  — update own D_s
 */

import { NextRequest, NextResponse } from 'next/server'

interface RoomUser {
  socketId: string
  userId: string
  userName: string
  sectionId?: string
  dsScore?: number      // latest D_s broadcast by this user
  lastSeen?: number
}

// GET — return all peers in the room except the requesting user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  const requestingUserId = searchParams.get('userId')

  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
  }

  // Access the live room map set by server.js
  const documentRooms: Map<string, { users: RoomUser[] }> =
    (global as any).__documentRooms || new Map()

  const room = documentRooms.get(documentId)

  if (!room) {
    return NextResponse.json({ peers: [] })
  }

  const peers = room.users
    .filter(u => u.userId !== requestingUserId)
    .map(u => ({
      userId: u.userId,
      userName: u.userName,
      sectionId: u.sectionId || '',
      dsScore: u.dsScore ?? 0,
      lastSeen: u.lastSeen ?? Date.now(),
    }))

  return NextResponse.json({ peers })
}

// POST — a client broadcasts their current D_s + section to the room map
export async function POST(request: NextRequest) {
  try {
    const { documentId, userId, sectionId, dsScore } = await request.json()

    if (!documentId || !userId) {
      return NextResponse.json({ error: 'documentId and userId are required' }, { status: 400 })
    }

    const documentRooms: Map<string, { users: RoomUser[] }> =
      (global as any).__documentRooms || new Map()

    const room = documentRooms.get(documentId)
    if (!room) {
      return NextResponse.json({ updated: false, reason: 'room not found' })
    }

    const user = room.users.find(u => u.userId === String(userId))
    if (user) {
      user.sectionId = sectionId
      user.dsScore = dsScore
      user.lastSeen = Date.now()
    }

    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error('[session-peers POST]', err)
    return NextResponse.json({ error: 'Failed to update peer state' }, { status: 500 })
  }
}
