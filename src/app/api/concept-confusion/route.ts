import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/concept-confusion
 *
 * Feature 6: Concept-Level Routing
 *
 * When a reader marks a passage as confusing, GPT-4o extracts the precise
 * concept label from the paper text. This builds a per-reader concept map
 * that A2 uses to match peers who understand the *specific concept* —
 * not just the same section.
 *
 * "User A can't parse the loss function notation, which also appears in Sections 5 and 7."
 * → Route to a peer who explicitly understood that concept, not just someone
 *   who read Section 3 without struggle.
 *
 * POST — extract concept + store
 * GET  ?paperId=...&sectionId=... — fetch concept confusion map for routing
 * GET  ?paperId=...&conceptLabel=...&userId=... — find peers who understand a concept
 * PATCH ?id=... — mark concept as resolved
 */

export async function POST(request: NextRequest) {
  try {
    const body: {
      paperId: string
      userId: string
      userName: string
      sectionId: string
      sectionName: string
      passageText: string
      sectionContext: string   // broader section text for GPT grounding
      pageNumber: number
    } = await request.json()

    const { paperId, userId, userName, sectionId, sectionName, passageText, sectionContext, pageNumber } = body

    if (!paperId || !userId || !passageText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract concept label via GPT-4o — precise, grounded in paper terminology
    let conceptLabel = passageText.slice(0, 60)  // fallback
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are embedded in CoRead, a reading system for PhD researchers.

A researcher highlighted this passage as confusing:
"${passageText}"

Section: "${sectionName}"
Section context (for grounding):
${sectionContext.slice(0, 2000)}

Extract the precise concept or term this passage is about. Use the paper's own terminology — not generic labels.
Examples of good labels: "temperature-scaled softmax in Eq. 3", "the τ_fire threshold derivation", "Assumption A4 in the proof of Theorem 2"
Examples of bad labels: "the math", "this equation", "a formula"

Return ONLY the concept label — no explanation, no punctuation, max 12 words.`
        }],
        temperature: 0.1,
        max_tokens: 30,
      })
      const raw = completion.choices[0]?.message?.content?.trim()
      if (raw && raw.length > 3 && raw.length < 120) conceptLabel = raw
    } catch {
      // use fallback
    }

    const record = await prisma.conceptConfusion.create({
      data: {
        paperId,
        userId,
        userName,
        sectionId,
        sectionName,
        conceptLabel,
        passageText: passageText.slice(0, 500),
        pageNumber,
        resolved: false,
      },
    })

    return NextResponse.json({ success: true, conceptLabel, id: record.id })
  } catch (error) {
    console.error('[concept-confusion POST]', error)
    return NextResponse.json({ error: 'Failed to extract concept' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const sectionId = searchParams.get('sectionId')
    const conceptLabel = searchParams.get('conceptLabel')
    const excludeUserId = searchParams.get('userId')  // exclude the confused user from results

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 })
    }

    if (conceptLabel) {
      // Find peers who were confused about the same concept but are now resolved
      // OR peers currently in the section with high understanding — they may know this concept
      const confused = await prisma.conceptConfusion.findMany({
        where: {
          paperId,
          conceptLabel: { contains: conceptLabel.slice(0, 30) },
          resolved: true,
          ...(excludeUserId && { userId: { not: excludeUserId } }),
        },
        select: { userId: true, userName: true, sectionId: true, conceptLabel: true },
        distinct: ['userId'],
        take: 5,
      })

      return NextResponse.json({ success: true, peersWhoResolved: confused })
    }

    // Return full confusion map for a section
    const confusions = await prisma.conceptConfusion.findMany({
      where: {
        paperId,
        ...(sectionId && { sectionId }),
        resolved: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by concept — shows which concepts are most confusing
    const conceptCounts = confusions.reduce<Record<string, { count: number; users: string[]; passageText: string }>>((acc, c) => {
      if (!acc[c.conceptLabel]) acc[c.conceptLabel] = { count: 0, users: [], passageText: c.passageText }
      acc[c.conceptLabel].count++
      if (!acc[c.conceptLabel].users.includes(c.userName)) acc[c.conceptLabel].users.push(c.userName)
      return acc
    }, {})

    return NextResponse.json({ success: true, confusions, conceptCounts })
  } catch (error) {
    console.error('[concept-confusion GET]', error)
    return NextResponse.json({ error: 'Failed to fetch confusions' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.conceptConfusion.update({ where: { id }, data: { resolved: true } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[concept-confusion PATCH]', error)
    return NextResponse.json({ error: 'Failed to resolve concept' }, { status: 500 })
  }
}
