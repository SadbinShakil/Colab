import { NextRequest, NextResponse } from 'next/server'
import {
  getDocumentInsights,
  storeReadingInsight,
  getCollaborativeSummary,
  checkOtherReaders,
  createReadingInsight,
  recordStruggleStart,
  recordStruggleEnd,
  getGhostHighlights,
  getJourneyReplay,
  getDocumentStruggles
} from '@/lib/collaborativeInsights'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const sectionId = searchParams.get('sectionId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Handle ghost highlights request
    if (action === 'ghost-highlights') {
      const highlights = await getGhostHighlights(documentId, sectionId || undefined)
      return NextResponse.json({
        success: true,
        highlights,
        count: highlights.length
      })
    }

    // Handle journey replay request
    if (action === 'journey-replay' && sectionId) {
      const journey = await getJourneyReplay(documentId, sectionId, userId || undefined)
      return NextResponse.json({
        success: true,
        journey,
        totalEvents: journey.length
      })
    }

    // Handle struggles request
    if (action === 'struggles') {
      const struggles = await getDocumentStruggles(documentId)
      return NextResponse.json({
        success: true,
        struggles,
        count: struggles.length
      })
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
    const { action } = body

    // Handle struggle tracking
    if (action === 'record-struggle-start') {
      const { documentId, userId, userName, sectionId, sectionName, behavioralPatterns, confusionHighlights } = body

      if (!documentId || !userId || !userName || !sectionId || !sectionName) {
        return NextResponse.json({
          error: 'Missing required fields: documentId, userId, userName, sectionId, sectionName'
        }, { status: 400 })
      }

      const struggle = await recordStruggleStart(
        documentId,
        userId,
        userName,
        sectionId,
        sectionName,
        behavioralPatterns || [],
        confusionHighlights || 0
      )

      return NextResponse.json({
        success: true,
        struggle,
        message: 'Struggle tracking started'
      })
    }

    if (action === 'record-struggle-end') {
      const { documentId, struggleId, resolutionMethod, resolutionDetails } = body

      if (!documentId || !struggleId || !resolutionMethod) {
        return NextResponse.json({
          error: 'Missing required fields: documentId, struggleId, resolutionMethod'
        }, { status: 400 })
      }

      const struggle = await recordStruggleEnd(documentId, struggleId, resolutionMethod, resolutionDetails)

      if (!struggle) {
        return NextResponse.json({
          error: 'Struggle not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        struggle,
        message: 'Struggle tracking completed'
      })
    }

    // Handle reading insights (original functionality)
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
