import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/knowledge-graph
 *
 * Feature 7: Knowledge Gap Propagation
 *
 * Builds a concept dependency graph from the paper's section structure.
 * Generated once per paper (idempotent — skips if already built).
 * Used to surface: "4 readers confused in Section 5 were also confused
 * about X in Section 2.3. Did you fully follow Section 2.3?"
 *
 * POST — generate dependency graph for a paper (called on document load)
 * GET  ?paperId=...&sectionId=... — get upstream dependencies for a section
 *      Include ?userId=... to cross-reference with the user's own confusion history
 */

interface SectionInfo {
  id: string
  name: string
  text?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: { paperId: string; sections: SectionInfo[] } = await request.json()
    const { paperId, sections } = body

    if (!paperId || !sections?.length) {
      return NextResponse.json({ error: 'paperId and sections required' }, { status: 400 })
    }

    // Idempotent — skip if already generated
    const existing = await prisma.knowledgeDependency.count({ where: { paperId } })
    if (existing > 0) {
      return NextResponse.json({ success: true, generated: false, existingCount: existing })
    }

    // Build a compact section outline for GPT-4o
    const sectionOutline = sections.slice(0, 20).map((s, i) =>
      `S${i + 1}. [${s.id}] ${s.name}${s.text ? ': ' + s.text.slice(0, 200) : ''}`
    ).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `You are analyzing an academic paper's section structure to identify knowledge dependencies.

Sections:
${sectionOutline}

Identify pairs of sections where understanding Section A is a PREREQUISITE for understanding Section B.
Only include pairs where Section A introduces a concept, notation, or result that Section B explicitly builds on.
Do NOT include trivial dependencies (e.g., "Introduction → Background" unless the intro defines something specific used later).

Return a JSON array of dependency objects:
[
  {
    "fromSectionId": "the earlier section's id",
    "fromSectionName": "the earlier section's name",
    "toSectionId": "the later section's id",
    "toSectionName": "the later section's name",
    "conceptBridge": "one sentence: what specific concept/notation from Section A is used in Section B"
  }
]

Return ONLY valid JSON. Max 15 dependencies. Focus on the strongest, most non-obvious dependencies.`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1000,
    })

    let dependencies: Array<{
      fromSectionId: string
      fromSectionName: string
      toSectionId: string
      toSectionName: string
      conceptBridge: string
    }> = []

    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
      dependencies = Array.isArray(parsed) ? parsed : (parsed.dependencies || [])
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse GPT response' }, { status: 500 })
    }

    // Validate section IDs exist in our list
    const validIds = new Set(sections.map(s => s.id))
    const valid = dependencies.filter(d =>
      validIds.has(d.fromSectionId) && validIds.has(d.toSectionId) &&
      d.fromSectionId !== d.toSectionId &&
      d.conceptBridge?.length > 10
    )

    if (valid.length > 0) {
      // SQLite doesn't support createMany with skipDuplicates — use upsert loop
      for (const d of valid) {
        await prisma.knowledgeDependency.upsert({
          where: { paperId_fromSectionId_toSectionId: { paperId, fromSectionId: d.fromSectionId, toSectionId: d.toSectionId } },
          update: { conceptBridge: d.conceptBridge },
          create: {
            paperId,
            fromSectionId: d.fromSectionId,
            fromSectionName: d.fromSectionName,
            toSectionId: d.toSectionId,
            toSectionName: d.toSectionName,
            conceptBridge: d.conceptBridge,
          },
        })
      }
    }

    return NextResponse.json({ success: true, generated: true, dependencyCount: valid.length })
  } catch (error) {
    console.error('[knowledge-graph POST]', error)
    return NextResponse.json({ error: 'Failed to generate graph' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const sectionId = searchParams.get('sectionId')
    const userId = searchParams.get('userId')

    if (!paperId || !sectionId) {
      return NextResponse.json({ error: 'paperId and sectionId required' }, { status: 400 })
    }

    // Get upstream dependencies for this section
    const deps = await prisma.knowledgeDependency.findMany({
      where: { paperId, toSectionId: sectionId },
      orderBy: { createdAt: 'asc' },
    })

    if (deps.length === 0) {
      return NextResponse.json({ success: true, warnings: [] })
    }

    // Cross-reference: how many readers were confused in BOTH this section AND the upstream sections?
    const upstreamSectionIds = deps.map(d => d.fromSectionId)

    // Count readers confused in this section
    const confusedHere = await prisma.conceptConfusion.count({
      where: { paperId, sectionId, resolved: false },
    })

    // Count readers who were also confused in upstream sections
    const crossConfusionCounts = await Promise.all(
      deps.map(async dep => {
        const count = await prisma.conceptConfusion.count({
          where: { paperId, sectionId: dep.fromSectionId },
        })
        return { dep, count }
      })
    )

    // Check if the current user was confused in upstream sections
    let userUpstreamConfusions: { sectionId: string; conceptLabel: string }[] = []
    if (userId) {
      const userConfusions = await prisma.conceptConfusion.findMany({
        where: {
          paperId,
          userId,
          sectionId: { in: upstreamSectionIds },
          resolved: false,
        },
        select: { sectionId: true, conceptLabel: true },
      })
      userUpstreamConfusions = userConfusions
    }

    // Build warnings — only surface high-signal ones
    const warnings = crossConfusionCounts
      .filter(({ count }) => count > 0)
      .map(({ dep, count }) => {
        const userAlsoConfused = userUpstreamConfusions.some(u => u.sectionId === dep.fromSectionId)
        return {
          fromSectionId: dep.fromSectionId,
          fromSectionName: dep.fromSectionName,
          conceptBridge: dep.conceptBridge,
          otherReadersCount: count,
          userAlsoConfused,
          // Priority: user's own unresolved gap > high cross-reader count > low count
          priority: (userAlsoConfused ? 'critical' : count >= 3 ? 'high' : 'medium') as 'critical' | 'high' | 'medium',
        }
      })
      .sort((a, b) => {
        const order: Record<'critical' | 'high' | 'medium', number> = { critical: 0, high: 1, medium: 2 }
        return order[a.priority] - order[b.priority]
      })

    return NextResponse.json({ success: true, warnings, confusedHere })
  } catch (error) {
    console.error('[knowledge-graph GET]', error)
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 })
  }
}
