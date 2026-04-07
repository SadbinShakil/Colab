import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/critique-layer
 *
 * Researcher pushback on paper claims — a critical reading layer.
 * PhD researchers don't passively accept claims; they push back.
 * This feature models that behaviour and makes disagreements visible.
 *
 * Critique types:
 *   overstatement    — "This conclusion is too strong given the evidence"
 *   contradiction    — "This contradicts [prior work / earlier claim in paper]"
 *   methodology      — "This design choice is problematic because..."
 *   assumption       — "This assumes X without justification"
 *   missing-citation — "This needs a citation for [specific claim]"
 *   other
 *
 * When 3+ readers critique the same passage, the system surfaces it as a
 * "disputed claim" in the Collective Knowledge Base.
 *
 * POST — create critique
 * GET  ?paperId=... — fetch all critiques for a paper
 *      ?paperId=...&pageNumber=N — fetch for a page
 * PATCH ?id=... — upvote or mark resolved
 * DELETE ?id=...&userId=... — delete (author only)
 */

const CRITIQUE_ANALYSIS_SYSTEM = `You are helping a PhD researcher analyze a potential weakness in an academic paper claim.
Be rigorous, specific, and grounded. Do not validate weak critiques. If the critique has merit, explain precisely why and what evidence would resolve it.`

export async function POST(request: NextRequest) {
  try {
    const body: {
      paperId: string
      authorId: string
      authorName: string
      passageText: string
      pageNumber: number
      sectionName?: string
      critiqueText: string
      critiqueType: string
      severity?: string
      aiAnalysis?: boolean  // if true, ask GPT-4o to analyze and strengthen the critique
    } = await request.json()

    const {
      paperId, authorId, authorName, passageText, pageNumber,
      sectionName, critiqueText, critiqueType, severity = 'medium',
      aiAnalysis = false,
    } = body

    if (!paperId || !authorId || !passageText || !critiqueText || !critiqueType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (critiqueText.trim().length < 20) {
      return NextResponse.json({ error: 'Critique must be at least 20 characters — be specific' }, { status: 400 })
    }

    let enrichedCritiqueText = critiqueText
    let aiStrengthened = false

    // Optional: ask GPT-4o to analyze and potentially strengthen the critique
    if (aiAnalysis) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: CRITIQUE_ANALYSIS_SYSTEM },
            {
              role: 'user', content: `Passage being critiqued:
"""
${passageText.slice(0, 600)}
"""

Researcher's critique (type: ${critiqueType}):
"""
${critiqueText}
"""

In ≤3 sentences: Is this critique valid? If so, state precisely what evidence or argument would strengthen it. If not, explain why.
Start directly with your assessment, no preamble.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
        })
        const analysis = completion.choices[0]?.message?.content?.trim()
        if (analysis && analysis.length > 20) {
          enrichedCritiqueText = critiqueText  // keep original, store AI analysis separately
          aiStrengthened = true
          // Prepend AI analysis as a blockquote-style note
          enrichedCritiqueText = `${critiqueText}\n\n[AI analysis: ${analysis}]`
        }
      } catch {
        // fail silently — still save the critique
      }
    }

    const critique = await prisma.critiqueAnnotation.create({
      data: {
        paperId,
        authorId,
        authorName,
        passageText: passageText.slice(0, 600),
        pageNumber,
        sectionName: sectionName || null,
        critiqueText: enrichedCritiqueText.trim(),
        critiqueType,
        severity,
      },
      select: {
        id: true, authorName: true, authorId: true, passageText: true,
        critiqueText: true, critiqueType: true, severity: true,
        upvotes: true, resolved: true, pageNumber: true, sectionName: true, createdAt: true,
      },
    })

    // Check if this passage now has 3+ critiques → disputed claim signal
    const passageCritiqueCount = await prisma.critiqueAnnotation.count({
      where: { paperId, passageText: { contains: passageText.slice(0, 50) } },
    })

    return NextResponse.json({
      success: true,
      critique,
      aiStrengthened,
      disputed: passageCritiqueCount >= 3,
      disputeCount: passageCritiqueCount,
    })
  } catch (error) {
    console.error('[critique-layer POST]', error)
    return NextResponse.json({ error: 'Failed to save critique' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const pageNumber = searchParams.get('pageNumber')
    const critiqueType = searchParams.get('critiqueType')

    if (!paperId) return NextResponse.json({ error: 'paperId required' }, { status: 400 })

    const where: Record<string, unknown> = { paperId }
    if (pageNumber) where.pageNumber = parseInt(pageNumber, 10)
    if (critiqueType) where.critiqueType = critiqueType

    const critiques = await prisma.critiqueAnnotation.findMany({
      where,
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, authorName: true, authorId: true, passageText: true,
        critiqueText: true, critiqueType: true, severity: true,
        upvotes: true, resolved: true, resolvedNote: true,
        pageNumber: true, sectionName: true, createdAt: true,
      },
    })

    // Compute disputed passages (3+ critiques on same passage)
    const passageCounts = critiques.reduce<Record<string, number>>((acc, c) => {
      const key = c.passageText.slice(0, 60)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const enriched = critiques.map(c => ({
      ...c,
      disputed: (passageCounts[c.passageText.slice(0, 60)] || 0) >= 3,
    }))

    return NextResponse.json({ success: true, critiques: enriched })
  } catch (error) {
    console.error('[critique-layer GET]', error)
    return NextResponse.json({ error: 'Failed to fetch critiques' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body: { action: 'upvote' | 'resolve'; resolvedNote?: string } = await request.json()

    if (body.action === 'upvote') {
      const updated = await prisma.critiqueAnnotation.update({
        where: { id },
        data: { upvotes: { increment: 1 } },
        select: { id: true, upvotes: true },
      })
      return NextResponse.json({ success: true, upvotes: updated.upvotes })
    }

    if (body.action === 'resolve') {
      await prisma.critiqueAnnotation.update({
        where: { id },
        data: { resolved: true, resolvedNote: body.resolvedNote || null },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[critique-layer PATCH]', error)
    return NextResponse.json({ error: 'Failed to update critique' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    if (!id || !userId) return NextResponse.json({ error: 'id and userId required' }, { status: 400 })

    const critique = await prisma.critiqueAnnotation.findUnique({ where: { id } })
    if (!critique) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (critique.authorId !== userId) return NextResponse.json({ error: 'Only the author can delete' }, { status: 403 })

    await prisma.critiqueAnnotation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[critique-layer DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete critique' }, { status: 500 })
  }
}
