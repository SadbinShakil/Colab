import { NextRequest, NextResponse } from 'next/server'
import { 
  getAnnotationLayers, 
  saveAnnotationLayer, 
  validateXfdf,
  getLayerStats
} from '@/lib/xfdfStorage'
import { 
  getUserFromRequest, 
  canAccessDocument, 
  canModifyAnnotations,
  canCreateGlobalAnnotations 
} from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    const includeGlobal = searchParams.get('includeGlobal') !== 'false'
    const statsOnly = searchParams.get('statsOnly') === 'true'
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Check authentication and permissions
    const user = getUserFromRequest(request)
    if (!canAccessDocument(user, documentId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Return stats only if requested
    if (statsOnly) {
      const stats = await getLayerStats(documentId)
      return NextResponse.json({
        success: true,
        stats
      })
    }
    
    const layers = await getAnnotationLayers(documentId, userId || undefined, includeGlobal)
    
    return NextResponse.json({
      success: true,
      ...layers
    })
    
  } catch (error) {
    console.error('Error fetching annotation layers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotation layers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId, xfdf, isGlobal, expectedVersion } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    if (!xfdf) {
      return NextResponse.json({ error: 'XFDF content required' }, { status: 400 })
    }

    // Check authentication and permissions
    const user = getUserFromRequest(request)
    if (!canAccessDocument(user, documentId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if user can modify annotations for the target user
    if (!canModifyAnnotations(user, documentId, userId)) {
      return NextResponse.json({ error: 'Cannot modify annotations for this user' }, { status: 403 })
    }

    // Check if user can create global annotations
    if (isGlobal && !canCreateGlobalAnnotations(user)) {
      return NextResponse.json({ error: 'Cannot create global annotations' }, { status: 403 })
    }

    // Validate XFDF format
    if (!validateXfdf(xfdf)) {
      return NextResponse.json({ error: 'Invalid XFDF format' }, { status: 400 })
    }

    // For global layers, userId should be null
    const finalUserId = isGlobal ? null : userId

    const savedLayer = await saveAnnotationLayer(
      documentId,
      xfdf,
      finalUserId,
      isGlobal || false,
      expectedVersion
    )
    
    return NextResponse.json({
      success: true,
      layer: savedLayer
    })
    
  } catch (error) {
    console.error('Error saving annotation layer:', error)
    
    // Handle version conflicts specifically
    if (error instanceof Error && error.message.includes('Version conflict')) {
      return NextResponse.json(
        { error: error.message, code: 'VERSION_CONFLICT' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to save annotation layer' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // Alias for POST to support both create and update operations
  return POST(request)
}
