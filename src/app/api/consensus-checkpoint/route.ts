import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/consensus-checkpoint
 *
 * Stores and retrieves group reading positions per section.
 *
 * After sustained group engagement on a section, A3 prompts the group to
 * record how they collectively read it — including disagreements and open
 * questions. These positions persist across sessions and prime future readers
 * as part of the Collective Knowledge Base.
 *
 * GET  ?paperId=...&sectionId=...  — fetch reading positions for a section
 * POST                              — record a new group reading position
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const sectionId = searchParams.get('sectionId')

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 })
    }

    const checkpoints = await prisma.consensusCheckpoint.findMany({
      where: {
        paperId,
        ...(sectionId && { sectionId }),
      },
      orderBy: { createdAt: 'desc' },
    })

    // Parse contributors back from JSON
    const parsed = checkpoints.map(c => ({
      ...c,
      contributors: JSON.parse(c.contributors) as { userId: string; userName: string }[],
    }))

    return NextResponse.json({ success: true, checkpoints: parsed })
  } catch (error) {
    console.error('[consensus-checkpoint GET]', error)
    return NextResponse.json({ error: 'Failed to fetch checkpoints' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      paperId: string
      sectionId: string
      sectionName: string
      passageText: string
      agreedMeaning: string
      contributors: { userId: string; userName: string }[]
      sessionId: string
    } = await request.json()

    const { paperId, sectionId, sectionName, passageText, agreedMeaning, contributors, sessionId } = body

    if (!paperId || !sectionId || !agreedMeaning || !contributors?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (agreedMeaning.trim().length < 20) {
      return NextResponse.json({ error: 'Reading position too brief — include the group\'s interpretive stance and any unresolved tension' }, { status: 400 })
    }

    // Confidence = proportion of participants who contributed (1.0 = unanimous)
    // We record as 1.0 for now — could be weighted by vote in the future
    const confidence = 1.0

    const checkpoint = await prisma.consensusCheckpoint.create({
      data: {
        paperId,
        sectionId,
        sectionName,
        passageText: passageText.slice(0, 500),
        agreedMeaning: agreedMeaning.trim(),
        contributors: JSON.stringify(contributors),
        confidence,
        sessionId,
      },
    })

    return NextResponse.json({
      success: true,
      checkpoint: {
        ...checkpoint,
        contributors,
      },
    })
  } catch (error) {
    console.error('[consensus-checkpoint POST]', error)
    return NextResponse.json({ error: 'Failed to save checkpoint' }, { status: 500 })
  }
}
