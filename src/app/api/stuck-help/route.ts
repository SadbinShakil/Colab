import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const page = searchParams.get('page')
    const status = searchParams.get('status')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const where: any = {
      paperId: documentId
    }

    if (page) {
      where.page = parseInt(page)
    }

    if (status) {
      where.status = status
    }

    const stuckHelps = await prisma.stuckHelp.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        responses: {
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ stuckHelps })

  } catch (error) {
    console.error('Error fetching stuck helps:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      paperId, 
      userId, 
      section, 
      description, 
      page, 
      position, 
      isAnonymous = false 
    } = body

    if (!paperId || !userId || !section || !description || !page || !position) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const stuckHelp = await prisma.stuckHelp.create({
      data: {
        paperId,
        userId,
        section,
        description,
        page: parseInt(page),
        position,
        isAnonymous,
        status: 'OPEN'
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

    return NextResponse.json({ stuckHelp })

  } catch (error) {
    console.error('Error creating stuck help:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
