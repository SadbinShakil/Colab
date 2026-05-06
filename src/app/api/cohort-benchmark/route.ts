import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/cohort-benchmark
 *
 * Normalizes a reader's struggle by showing how the cohort performed on
 * the same section. This is one of the most psychologically powerful
 * features: "You're not alone — 78% of readers took >12 min here."
 *
 * Also logs reading pace for cohort aggregation.
 *
 * GET  ?paperId=...&sectionId=...
 *      Returns: { percentileRank, cohortMedianMs, cohortP75Ms, pctStruggled,
 *                 avgConfusionCount, totalReaders, message }
 *
 * POST { paperId, userId, sectionId, sectionName, timeSpentMs, wordCount, complexity, pageCount }
 *      Logs a reading pace entry (called when user leaves a section)
 */

export interface CohortBenchmarkResult {
  sectionId: string
  sectionName: string
  totalReaders: number
  cohortMedianMs: number          // median time spent (ms)
  cohortP25Ms: number             // 25th percentile (fast readers)
  cohortP75Ms: number             // 75th percentile (slow readers)
  userTimeMs?: number             // this reader's time (if provided)
  percentileRank?: number         // 0–100, where 100 = slowest
  pctStruggled: number            // % of readers who had confusion highlights here
  avgConfusionHighlights: number  // average confusion highlights per reader
  message: string                 // human-readable insight
  pacing: 'fast' | 'normal' | 'slow' | 'unknown'
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function userPercentile(sorted: number[], userValue: number): number {
  const below = sorted.filter(v => v < userValue).length
  return Math.round((below / sorted.length) * 100)
}

function pacingMessage(pct: number, pctStruggled: number, complexity: number): string {
  if (pct >= 75) {
    if (pctStruggled >= 60) return `This section is genuinely difficult — ${Math.round(pctStruggled)}% of readers struggled here. You're in good company.`
    return `You're reading more slowly than most. Consider whether you're overthinking it, or whether there's a specific gap to address.`
  }
  if (pct <= 25) {
    if (complexity >= 0.7) return `You moved through a dense section quickly — make sure you captured the key insights before moving on.`
    return `You're reading faster than most here, which is fine for this section's complexity level.`
  }
  return `Your reading pace is right in line with the cohort median for this section.`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const sectionId = searchParams.get('sectionId')
    const userTimeMs = searchParams.get('userTimeMs')

    if (!paperId || !sectionId) {
      return NextResponse.json({ error: 'paperId and sectionId required' }, { status: 400 })
    }

    // Fetch all pace logs for this section
    const paceLogs = await prisma.readingPaceLog.findMany({
      where: { paperId, sectionId },
      select: { timeSpentMs: true, complexity: true, userId: true },
    })

    if (paceLogs.length < 2) {
      return NextResponse.json({
        success: true,
        benchmark: null,
        reason: 'Not enough readers have visited this section yet',
      })
    }

    // Fetch confusion counts for this section from conceptConfusion
    const confusionCounts = await prisma.conceptConfusion.groupBy({
      by: ['userId'],
      where: { paperId, sectionId },
      _count: { id: true },
    })

    const totalReaders = paceLogs.length
    const sortedTimes = [...paceLogs.map(l => l.timeSpentMs)].sort((a, b) => a - b)
    const avgComplexity = paceLogs.reduce((s, l) => s + l.complexity, 0) / paceLogs.length

    const cohortMedianMs = percentile(sortedTimes, 50)
    const cohortP25Ms = percentile(sortedTimes, 25)
    const cohortP75Ms = percentile(sortedTimes, 75)

    const readersWithConfusion = confusionCounts.length
    const pctStruggled = totalReaders > 0 ? Math.round((readersWithConfusion / totalReaders) * 100) : 0
    const avgConfusionHighlights = confusionCounts.length > 0
      ? confusionCounts.reduce((s, c) => s + c._count.id, 0) / confusionCounts.length
      : 0

    let percentileRank: number | undefined
    let pacing: 'fast' | 'normal' | 'slow' | 'unknown' = 'unknown'
    let message = `${totalReaders} readers have visited this section.`

    if (userTimeMs) {
      const userMs = parseInt(userTimeMs, 10)
      percentileRank = userPercentile(sortedTimes, userMs)
      pacing = percentileRank >= 75 ? 'slow' : percentileRank <= 25 ? 'fast' : 'normal'
      message = pacingMessage(percentileRank, pctStruggled, avgComplexity)
    } else if (pctStruggled >= 60) {
      message = `${pctStruggled}% of readers struggled in this section — this is one of the harder sections in the paper.`
    }

    const benchmark: CohortBenchmarkResult = {
      sectionId,
      sectionName: paceLogs[0] ? '' : sectionId,
      totalReaders,
      cohortMedianMs,
      cohortP25Ms,
      cohortP75Ms,
      userTimeMs: userTimeMs ? parseInt(userTimeMs, 10) : undefined,
      percentileRank,
      pctStruggled,
      avgConfusionHighlights,
      message,
      pacing,
    }

    return NextResponse.json({ success: true, benchmark })
  } catch (error) {
    console.error('[cohort-benchmark GET]', error)
    return NextResponse.json({ error: 'Failed to fetch benchmark' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      paperId: string
      userId: string
      sectionId: string
      sectionName: string
      timeSpentMs: number
      wordCount: number
      complexity: number
      pageCount: number
    } = await request.json()

    const { paperId, userId, sectionId, sectionName, timeSpentMs, wordCount, complexity, pageCount } = body

    if (!paperId || !userId || !sectionId || timeSpentMs == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Only log if time is plausible (> 5s, < 3 hours)
    if (timeSpentMs < 5000 || timeSpentMs > 10_800_000) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Upsert — if a reader visits the same section multiple times, keep the longest
    const existing = await prisma.readingPaceLog.findFirst({
      where: { paperId, userId, sectionId },
    })

    if (existing) {
      if (timeSpentMs > existing.timeSpentMs) {
        await prisma.readingPaceLog.update({
          where: { id: existing.id },
          data: { timeSpentMs, complexity, pageCount },
        })
      }
    } else {
      await prisma.readingPaceLog.create({
        data: { paperId, userId, sectionId, sectionName, timeSpentMs, wordCount: wordCount || 0, complexity: complexity || 0.5, pageCount: pageCount || 1 },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[cohort-benchmark POST]', error)
    return NextResponse.json({ error: 'Failed to log pace' }, { status: 500 })
  }
}
