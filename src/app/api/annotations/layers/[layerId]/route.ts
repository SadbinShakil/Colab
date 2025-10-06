import { NextRequest, NextResponse } from 'next/server'
import { deleteAnnotationLayer } from '@/lib/xfdfStorage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { layerId: string } }
) {
  try {
    const { layerId } = params
    
    if (!layerId) {
      return NextResponse.json({ error: 'Layer ID required' }, { status: 400 })
    }
    
    await deleteAnnotationLayer(layerId)
    
    return NextResponse.json({
      success: true,
      message: 'Annotation layer deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting annotation layer:', error)
    return NextResponse.json(
      { error: 'Failed to delete annotation layer' },
      { status: 500 }
    )
  }
}
