import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/explanation-capture
 *
 * Feature 2: Explanation Capture + D_s Pre/Post Verification
 *
 * Records what a peer explained, captures D_s at the moment peer routing
 * fired, and later accepts the D_s score 10 minutes post-explanation to
 * measure whether the collaboration actually resolved the confusion.
 *
 * This produces the evidence-backed effectiveness data the research needs:
 * "Peer routing to Alex reduced D_s from 0.89 → 0.31 in Section 3."
 *
 * POST /api/explanation-capture           — create new capture record
 * PATCH /api/explanation-capture          — update with post-session data
 * GET /api/explanation-capture?paperId=   — fetch captures for a paper
 */

export async function POST(request: NextRequest) {
  try {
    const body: {
      paperId: string
      sectionId: string
      sectionName: string
      helpeeId: string
      helpeeName: string
      helperId: string
      helperName: string
      dsAtStart: number
      sessionId: string
    } = await request.json()

    const { paperId, sectionId, sectionName, helpeeId, helpeeName, helperId, helperName, dsAtStart, sessionId } = body

    if (!paperId || !helpeeId || !helperId || !sectionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const capture = await prisma.peerExplanationCapture.create({
      data: {
        paperId,
        sectionId,
        sectionName,
        helpeeId,
        helpeeName,
        helperId,
        helperName,
        dsAtStart,
        sessionId,
      },
    })

    return NextResponse.json({ success: true, captureId: capture.id })
  } catch (error) {
    console.error('[explanation-capture POST]', error)
    return NextResponse.json({ error: 'Failed to create capture' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: {
      captureId: string
      dsAtEnd?: number
      resolved?: boolean
      helperSummary?: string
      helpeeRating?: number
    } = await request.json()

    const { captureId, dsAtEnd, resolved, helperSummary, helpeeRating } = body

    if (!captureId) {
      return NextResponse.json({ error: 'captureId required' }, { status: 400 })
    }

    const updated = await prisma.peerExplanationCapture.update({
      where: { id: captureId },
      data: {
        ...(dsAtEnd !== undefined && { dsAtEnd }),
        ...(resolved !== undefined && { resolved, resolvedAt: resolved ? new Date() : undefined }),
        ...(helperSummary !== undefined && { helperSummary }),
        ...(helpeeRating !== undefined && { helpeeRating }),
      },
    })

    // Compute effectiveness delta for logging
    const delta = updated.dsAtEnd !== null && updated.dsAtEnd !== undefined
      ? updated.dsAtStart - updated.dsAtEnd
      : null

    console.log(`[explanation-capture] Session ${captureId}: D_s ${updated.dsAtStart.toFixed(2)} → ${updated.dsAtEnd?.toFixed(2) ?? '?'} (Δ ${delta?.toFixed(2) ?? '?'}) resolved=${updated.resolved}`)

    return NextResponse.json({
      success: true,
      effectiveness: delta !== null ? {
        dsReduction: delta,
        resolved: updated.resolved,
        effective: delta > 0.2 && updated.resolved !== false,
      } : null
    })
  } catch (error) {
    console.error('[explanation-capture PATCH]', error)
    return NextResponse.json({ error: 'Failed to update capture' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const helperId = searchParams.get('helperId')

    if (!paperId && !helperId) {
      return NextResponse.json({ error: 'paperId or helperId required' }, { status: 400 })
    }

    const captures = await prisma.peerExplanationCapture.findMany({
      where: {
        ...(paperId && { paperId }),
        ...(helperId && { helperId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Aggregate helper effectiveness stats
    const helperStats = captures
      .filter(c => c.dsAtEnd !== null)
      .reduce((acc, c) => {
        const delta = c.dsAtStart - (c.dsAtEnd ?? c.dsAtStart)
        acc.totalSessions++
        acc.totalDsReduction += delta
        acc.resolvedCount += c.resolved ? 1 : 0
        return acc
      }, { totalSessions: 0, totalDsReduction: 0, resolvedCount: 0 })

    return NextResponse.json({
      success: true,
      captures,
      stats: helperStats.totalSessions > 0 ? {
        totalSessions: helperStats.totalSessions,
        avgDsReduction: helperStats.totalDsReduction / helperStats.totalSessions,
        resolutionRate: helperStats.resolvedCount / helperStats.totalSessions,
      } : null,
    })
  } catch (error) {
    console.error('[explanation-capture GET]', error)
    return NextResponse.json({ error: 'Failed to fetch captures' }, { status: 500 })
  }
}
