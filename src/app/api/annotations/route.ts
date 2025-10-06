import { NextRequest, NextResponse } from 'next/server'
import { 
  getDocumentAnnotations, 
  saveAnnotation, 
  deleteAnnotation,
  addAnnotationReply,
  type Annotation 
} from '@/lib/annotationStorage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }
    
    const annotations = await getDocumentAnnotations(documentId)
    
    return NextResponse.json({
      success: true,
      annotations
    })
    
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, annotation, action } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Handle different actions
    if (action === 'add-reply') {
      const { annotationId, reply } = await request.json()
      await addAnnotationReply(documentId, annotationId, reply)
      
      return NextResponse.json({
        success: true,
        message: 'Reply added successfully'
      })
    }
    
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation required' }, { status: 400 })
    }
    
    // Ensure annotation has required fields
    const annotationToSave: Annotation = {
      id: annotation.id || `annotation_${Date.now()}`,
      documentId,
      type: annotation.type || 'highlight',
      content: annotation.content || '',
      position: annotation.position || { pageNumber: 1 },
      color: annotation.color || '#ffff00',
      author: annotation.author || { id: 'anonymous', name: 'Anonymous' },
      timestamp: annotation.timestamp || new Date().toISOString(),
      replies: annotation.replies || []
    }
    
    await saveAnnotation(documentId, annotationToSave)
    
    return NextResponse.json({
      success: true,
      annotation: annotationToSave
    })
    
  } catch (error) {
    console.error('Annotation save error:', error)
    return NextResponse.json(
      { error: 'Failed to save annotation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const annotationId = searchParams.get('annotationId')
    
    if (!documentId || !annotationId) {
      return NextResponse.json({ 
        error: 'Document ID and annotation ID required' 
      }, { status: 400 })
    }
    
    await deleteAnnotation(documentId, annotationId)
    
    return NextResponse.json({
      success: true,
      message: 'Annotation deleted successfully'
    })
    
  } catch (error) {
    console.error('Annotation delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    )
  }
} 