import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/marginal-notes
 *
 * Async marginal annotations — passage-anchored notes left by one reader
 * for future readers. "If you're confused here, the key is that τ refers
 * to the scaled temperature, not raw."
 *
 * GET  ?documentId=...&pageNumber=...   — fetch notes for a page
 * POST                                  — create a new marginal note
 * DELETE ?id=...                        — delete a note (author only)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const pageNumber = searchParams.get('pageNumber')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    }

    const where: { paperId: string; pageNumber?: number } = { paperId: documentId }
    if (pageNumber) {
      where.pageNumber = parseInt(pageNumber, 10)
    }

    const notes = await prisma.marginalNote.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        authorName: true,
        authorId: true,
        content: true,
        passageText: true,
        pageNumber: true,
        sectionName: true,
        epistemicTag: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, notes })
  } catch (error) {
    console.error('[marginal-notes GET]', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      documentId: string
      userId: string
      userName: string
      content: string
      passageText: string
      pageNumber: number
      sectionName?: string
      epistemicTag?: string
    } = await request.json()

    const { documentId, userId, userName, content, passageText, pageNumber, sectionName, epistemicTag } = body

    if (!documentId || !userId || !content || pageNumber == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (content.trim().length < 10) {
      return NextResponse.json({ error: 'Note too short — add something useful for the next reader' }, { status: 400 })
    }

    const note = await prisma.marginalNote.create({
      data: {
        paperId: documentId,
        authorId: userId,
        authorName: userName,
        content: content.trim(),
        passageText: passageText.slice(0, 500), // cap passage length
        pageNumber,
        sectionName: sectionName || null,
        epistemicTag: epistemicTag || null,
      },
      select: {
        id: true,
        authorName: true,
        authorId: true,
        content: true,
        passageText: true,
        pageNumber: true,
        sectionName: true,
        epistemicTag: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, note })
  } catch (error: any) {
    console.error('[marginal-notes POST]', error?.message || error)
    return NextResponse.json({ error: 'Failed to create note', detail: error?.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId required' }, { status: 400 })
    }

    const note = await prisma.marginalNote.findUnique({ where: { id } })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    if (note.authorId !== userId) {
      return NextResponse.json({ error: 'Only the author can delete this note' }, { status: 403 })
    }

    await prisma.marginalNote.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[marginal-notes DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
