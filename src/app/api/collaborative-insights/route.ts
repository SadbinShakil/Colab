import { NextRequest, NextResponse } from 'next/server'
import { 
  getDocumentInsights, 
  storeReadingInsight, 
  getCollaborativeSummary,
  checkOtherReaders,
  createReadingInsight 
} from '@/lib/collaborativeInsights'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }
    
    if (userId) {
      // Check if other researchers have read this document
      const otherReaders = await checkOtherReaders(documentId, userId)
      return NextResponse.json(otherReaders)
    } else {
      // Get all insights for the document
      const insights = await getDocumentInsights(documentId)
      return NextResponse.json({ insights })
    }
  } catch (error) {
    console.error('Error in collaborative insights GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      documentId, 
      userId, 
      userName, 
      type, 
      content, 
      pageNumber, 
      position, 
      color, 
      tags, 
      isPublic, 
      parentId 
    } = body
    
    if (!documentId || !userId || !userName || !type || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: documentId, userId, userName, type, content' 
      }, { status: 400 })
    }
    
    // Create new reading insight
    const insight = createReadingInsight(
      documentId,
      userId,
      userName,
      type,
      content,
      {
        pageNumber,
        position,
        color,
        tags,
        isPublic,
        parentId
      }
    )
    
    // Store the insight
    const storedInsight = await storeReadingInsight(documentId, insight)
    
    return NextResponse.json({ 
      success: true, 
      insight: storedInsight 
    })
  } catch (error) {
    console.error('Error in collaborative insights POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
