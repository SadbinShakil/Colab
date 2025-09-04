import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const stuckHelp = await prisma.stuckHelp.findUnique({
      where: { id },
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
      }
    })

    if (!stuckHelp) {
      return NextResponse.json({ error: 'Stuck help not found' }, { status: 404 })
    }

    return NextResponse.json({ stuckHelp })

  } catch (error) {
    console.error('Error fetching stuck help:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, isResolved } = body

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
    }
    
    if (typeof isResolved === 'boolean') {
      updateData.isResolved = isResolved
      if (isResolved) {
        updateData.status = 'RESOLVED'
      }
    }

    const stuckHelp = await prisma.stuckHelp.update({
      where: { id },
      data: updateData,
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
      }
    })

    return NextResponse.json({ stuckHelp })

  } catch (error) {
    console.error('Error updating stuck help:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.stuckHelp.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting stuck help:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
