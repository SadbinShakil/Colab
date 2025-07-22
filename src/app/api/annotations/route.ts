import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo (in real app, use database)
const annotations: { [documentId: string]: any[] } = {}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  
  if (!documentId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
  }
  
  return NextResponse.json({
    annotations: annotations[documentId] || []
  })
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, annotation } = await request.json()
    
    if (!documentId || !annotation) {
      return NextResponse.json({ error: 'Document ID and annotation required' }, { status: 400 })
    }
    
    if (!annotations[documentId]) {
      annotations[documentId] = []
    }
    
    annotations[documentId].push(annotation)
    
    return NextResponse.json({
      success: true,
      annotation
    })
    
  } catch (error) {
    console.error('Annotation save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 