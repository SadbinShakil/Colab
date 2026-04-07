import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

  try {
    const replies = await (prisma as any).marginalNoteReply.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ success: true, replies })
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { noteId, authorId, authorName, content } = await request.json()
    if (!noteId || !authorId || !content) {
      return NextResponse.json({ error: 'noteId, authorId, content required' }, { status: 400 })
    }

    const reply = await (prisma as any).marginalNoteReply.create({
      data: { noteId, authorId, authorName, content }
    })
    return NextResponse.json({ success: true, reply })
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
