import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/teaching-profile
 *
 * Feature 5: Teaching Ability Modeling
 *
 * A peer can understand perfectly but explain poorly.
 * This endpoint computes two separate scores from PeerExplanationCapture data:
 *
 *   understandingScore  — how often this user RESOLVED their own confusions
 *                        (inferred from sections where they were the helpee and D_s dropped)
 *
 *   explainerScore      — how often confusions RESOLVED when this user was the helper
 *                        (weighted by D_s reduction + helpee rating + resolution flag)
 *
 * Both are 0.0–1.0. The routing system should prefer helpers with high explainerScore,
 * not just high understandingScore.
 *
 * GET ?userId=...&paperId=...   — profile for one user on one paper
 * GET ?paperId=...              — all user profiles for a paper (for routing decisions)
 */

interface TeachingProfile {
  userId: string
  userName: string
  understandingScore: number   // 0.0-1.0: their own comprehension level
  explainerScore: number       // 0.0-1.0: how well they make others understand
  sessionsAsHelper: number
  sessionsAsHelpee: number
  avgDsReductionAsHelper: number
  resolutionRateAsHelper: number
  avgRatingAsHelper: number
  confidence: 'high' | 'medium' | 'low'  // based on sample size
}

function computeExplainerScore(
  sessions: { dsAtStart: number; dsAtEnd: number | null; resolved: boolean | null; helpeeRating: number | null }[]
): { score: number; avgDsReduction: number; resolutionRate: number; avgRating: number } {
  const completed = sessions.filter(s => s.dsAtEnd !== null)
  if (completed.length === 0) return { score: 0, avgDsReduction: 0, resolutionRate: 0, avgRating: 0 }

  const avgDsReduction = completed.reduce((sum, s) => sum + (s.dsAtStart - (s.dsAtEnd ?? s.dsAtStart)), 0) / completed.length
  const resolutionRate = completed.filter(s => s.resolved === true).length / completed.length
  const ratedSessions = completed.filter(s => s.helpeeRating !== null)
  const avgRating = ratedSessions.length > 0
    ? ratedSessions.reduce((sum, s) => sum + (s.helpeeRating ?? 0), 0) / ratedSessions.length / 5  // normalize to 0-1
    : 0.5 // neutral if no ratings

  // Composite score: 40% D_s reduction, 40% resolution rate, 20% peer rating
  const score = Math.max(0, Math.min(1,
    0.4 * Math.max(0, Math.min(1, avgDsReduction / 0.5)) +  // normalize: 0.5 D_s drop = perfect
    0.4 * resolutionRate +
    0.2 * avgRating
  ))

  return { score, avgDsReduction, resolutionRate, avgRating: avgRating * 5 }
}

function computeUnderstandingScore(
  sessions: { dsAtStart: number; dsAtEnd: number | null; resolved: boolean | null }[]
): number {
  const completed = sessions.filter(s => s.dsAtEnd !== null)
  if (completed.length === 0) return 0.5 // unknown
  const resolutionRate = completed.filter(s => s.resolved === true).length / completed.length
  const avgDsReduction = completed.reduce((sum, s) => sum + (s.dsAtStart - (s.dsAtEnd ?? s.dsAtStart)), 0) / completed.length
  return Math.max(0, Math.min(1, 0.5 * resolutionRate + 0.5 * Math.max(0, Math.min(1, avgDsReduction / 0.5))))
}

function confidenceLevel(sessions: number): 'high' | 'medium' | 'low' {
  if (sessions >= 5) return 'high'
  if (sessions >= 2) return 'medium'
  return 'low'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const paperId = searchParams.get('paperId')

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 })
    }

    if (userId) {
      // Single user profile
      const [helperSessions, helpeeSessions] = await Promise.all([
        prisma.peerExplanationCapture.findMany({
          where: { paperId, helperId: userId },
          select: { dsAtStart: true, dsAtEnd: true, resolved: true, helpeeRating: true },
        }),
        prisma.peerExplanationCapture.findMany({
          where: { paperId, helpeeId: userId },
          select: { dsAtStart: true, dsAtEnd: true, resolved: true, helperName: true },
        }),
      ])

      const { score: explainerScore, avgDsReduction, resolutionRate, avgRating } = computeExplainerScore(helperSessions)
      const understandingScore = computeUnderstandingScore(helpeeSessions)

      const profile: TeachingProfile = {
        userId,
        userName: '', // caller knows their own name
        understandingScore,
        explainerScore,
        sessionsAsHelper: helperSessions.length,
        sessionsAsHelpee: helpeeSessions.length,
        avgDsReductionAsHelper: avgDsReduction,
        resolutionRateAsHelper: resolutionRate,
        avgRatingAsHelper: avgRating,
        confidence: confidenceLevel(helperSessions.length),
      }

      return NextResponse.json({ success: true, profile })
    }

    // All users for this paper — for routing decisions
    const allCaptures = await prisma.peerExplanationCapture.findMany({
      where: { paperId },
      select: {
        helperId: true, helperName: true,
        helpeeId: true, helpeeName: true,
        dsAtStart: true, dsAtEnd: true,
        resolved: true, helpeeRating: true,
      },
    })

    // Group by helper
    const helperMap = new Map<string, { name: string; sessions: typeof allCaptures }>()
    for (const c of allCaptures) {
      if (!helperMap.has(c.helperId)) helperMap.set(c.helperId, { name: c.helperName, sessions: [] })
      helperMap.get(c.helperId)!.sessions.push(c)
    }

    const profiles: TeachingProfile[] = []
    for (const [uid, { name, sessions }] of helperMap.entries()) {
      const helpeeSessions = allCaptures.filter(c => c.helpeeId === uid)
      const { score: explainerScore, avgDsReduction, resolutionRate, avgRating } = computeExplainerScore(sessions)
      const understandingScore = computeUnderstandingScore(helpeeSessions)

      profiles.push({
        userId: uid,
        userName: name,
        understandingScore,
        explainerScore,
        sessionsAsHelper: sessions.length,
        sessionsAsHelpee: helpeeSessions.length,
        avgDsReductionAsHelper: avgDsReduction,
        resolutionRateAsHelper: resolutionRate,
        avgRatingAsHelper: avgRating,
        confidence: confidenceLevel(sessions.length),
      })
    }

    // Sort by explainer score — this is what the routing system should use
    profiles.sort((a, b) => b.explainerScore - a.explainerScore)

    return NextResponse.json({ success: true, profiles })
  } catch (error) {
    console.error('[teaching-profile GET]', error)
    return NextResponse.json({ error: 'Failed to compute teaching profiles' }, { status: 500 })
  }
}
