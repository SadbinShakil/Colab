import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes
// In a real app, this would be a database
const documents: { [key: string]: any } = {}

// This function will be called by the upload API to store document metadata
export function storeDocument(id: string, documentData: any) {
  documents[id] = documentData
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = documents[params.id]
    
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