import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paperId')
  const sectionId = searchParams.get('sectionId')

  if (!paperId) return NextResponse.json({ error: 'paperId required' }, { status: 400 })

  try {
    // Reading pace — velocity percentile per user per section
    const paceWhere: any = { paperId }
    if (sectionId) paceWhere.sectionId = sectionId

    const paceLogs = await prisma.readingPaceLog.findMany({ where: paceWhere })

    // Compute velocity (words per minute) per user per section
    const velocityByUser = new Map<string, number[]>()
    for (const log of paceLogs) {
      if (log.timeSpentMs > 0) {
        const wpm = (log.wordCount / (log.timeSpentMs / 60000))
        if (!velocityByUser.has(log.userId)) velocityByUser.set(log.userId, [])
        velocityByUser.get(log.userId)!.push(wpm)
      }
    }

    // Confusion density per user per section
    const confusionWhere: any = { paperId }
    if (sectionId) confusionWhere.sectionId = sectionId
    const confusions = await prisma.conceptConfusion.findMany({ where: confusionWhere })

    const confusionByUser = new Map<string, { count: number; name: string }>()
    for (const c of confusions) {
      if (!confusionByUser.has(c.userId)) confusionByUser.set(c.userId, { count: 0, name: c.userName })
      confusionByUser.get(c.userId)!.count++
    }

    // Peer explanation capture — explainer score
    const explanations = await prisma.peerExplanationCapture.findMany({
      where: { paperId, ...(sectionId ? { sectionId } : {}) }
    })
    const explainerScoreByUser = new Map<string, number>()
    for (const e of explanations) {
      if (e.helpeeRating) {
        const existing = explainerScoreByUser.get(e.helperId) || 0
        explainerScoreByUser.set(e.helperId, Math.max(existing, e.helpeeRating / 5))
      }
    }

    // Marginal notes — epistemic quality proxy
    const notes = await (prisma as any).marginalNote.findMany({
      where: { paperId, ...(sectionId ? { sectionName: { contains: sectionId } } : {}) }
    })
    const noteQualityByUser = new Map<string, number>()
    const highQualityTags = ['Evidence', 'Claim', 'Contradiction']
    for (const n of notes) {
      const quality = highQualityTags.includes(n.epistemicTag || '') ? 0.8 : 0.4
      const existing = noteQualityByUser.get(n.authorId) || 0
      noteQualityByUser.set(n.authorId, Math.max(existing, quality))
    }

    // Build all unique user IDs
    const allUsers = new Set([
      ...velocityByUser.keys(),
      ...confusionByUser.keys(),
      ...explainerScoreByUser.keys(),
      ...noteQualityByUser.keys(),
    ])

    // Compute global velocity percentile
    const allVelocities = [...velocityByUser.values()].flatMap(v => v)
    allVelocities.sort((a, b) => a - b)
    const getPercentile = (val: number) => {
      if (allVelocities.length === 0) return 50
      const below = allVelocities.filter(v => v <= val).length
      return Math.round((below / allVelocities.length) * 100)
    }

    const expertiseMap = Array.from(allUsers).map(userId => {
      const userVelocities = velocityByUser.get(userId) || []
      const avgVelocity = userVelocities.length > 0
        ? userVelocities.reduce((a, b) => a + b, 0) / userVelocities.length
        : 0
      const velocityPercentile = getPercentile(avgVelocity)
      const confusionData = confusionByUser.get(userId)
      const confusionCount = confusionData?.count || 0
      const userName = confusionData?.name || userId
      const explainerScore = explainerScoreByUser.get(userId) || 0
      const noteQuality = noteQualityByUser.get(userId) || 0.3

      // Annotation density: confusions per section (lower = less confused = more expert)
      const annotationDensity = Math.min(1, confusionCount / 10)

      // Composite: velocity 30%, note quality 25%, explainer 30%, low-confusion 15%
      const composite = (
        (velocityPercentile / 100) * 0.30 +
        noteQuality * 0.25 +
        explainerScore * 0.30 +
        (1 - annotationDensity) * 0.15
      )

      const label = composite > 0.75 ? 'expert'
        : composite > 0.55 ? 'proficient'
        : composite > 0.35 ? 'familiar'
        : 'novice'

      return {
        userId,
        userName,
        sectionId: sectionId || 'all',
        velocityPercentile,
        annotationDensity,
        explainerScore,
        noteQuality,
        compositeScore: Math.round(composite * 100) / 100,
        expertiseLabel: label,
      }
    })

    return NextResponse.json({ success: true, expertiseMap })
  } catch (error: any) {
    console.error('[expertise-map]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
