import { NextRequest, NextResponse } from 'next/server'
import { getDocument, storeDocument } from '@/lib/documentStorage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocument(params.id)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document
    })

  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocument(params.id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Move to trash by setting visibility to 'trash'
    // If already in trash, maybe delete permanently? 
    // For now, just move to trash or toggle.
    // Let's check query param ?permanent=true for permanent delete
    const url = new URL(request.url)
    const permanent = url.searchParams.get('permanent') === 'true'

    if (permanent) {
      // TODO: Implement permanent delete from file system
      return NextResponse.json({ success: true, message: 'Permanently deleted (mock)' })
    } else {
      document.visibility = 'trash'
      await storeDocument(document.id, document)
      return NextResponse.json({ success: true, message: 'Moved to trash' })
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

// Restore endpoint
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json()
    const document = await getDocument(params.id)

    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'restore') {
      document.visibility = 'private' // Default back to private
      await storeDocument(document.id, document)
      return NextResponse.json({ success: true, message: 'Restored' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}