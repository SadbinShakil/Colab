import { NextRequest, NextResponse } from 'next/server'
import { deleteUserLayers } from '@/lib/xfdfStorage'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    
    if (!documentId || !userId) {
      return NextResponse.json({ 
        error: 'Document ID and User ID required' 
      }, { status: 400 })
    }
    
    await deleteUserLayers(documentId, userId)
    
    return NextResponse.json({
      success: true,
      message: 'User annotation layers deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting user annotation layers:', error)
    return NextResponse.json(
      { error: 'Failed to delete user annotation layers' },
      { status: 500 }
    )
  }
}
