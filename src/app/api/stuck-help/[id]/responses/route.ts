import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const responses = await prisma.stuckHelpResponse.findMany({
      where: { stuckHelpId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ responses })

  } catch (error) {
    console.error('Error fetching stuck help responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, content, type = 'human' } = body

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      )
    }

    // Verify the stuck help exists
    const stuckHelp = await prisma.stuckHelp.findUnique({
      where: { id }
    })

    if (!stuckHelp) {
      return NextResponse.json(
        { error: 'Stuck help not found' },
        { status: 404 }
      )
    }

    const response = await prisma.stuckHelpResponse.create({
      data: {
        stuckHelpId: id,
        userId,
        content,
        type,
        isHelpful: false,
        likes: 0
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // If this is a human response and the stuck help is still open, mark as in progress
    if (type === 'human' && stuckHelp.status === 'OPEN') {
      await prisma.stuckHelp.update({
        where: { id },
        data: { status: 'IN_PROGRESS' }
      })
    }

    return NextResponse.json({ response })

  } catch (error) {
    console.error('Error creating stuck help response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
