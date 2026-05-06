import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * /api/cohort-analytics
 *
 * Feature 8: Cohort Bottleneck Visualization
 *
 * Aggregates across all sessions for a paper to produce:
 *   - passageHeatmap: which sections/concepts triggered the most confusion
 *   - peerEffectiveness: which peer pairs produced the largest D_s reductions
 *   - unresolvedDisagreements: sections with unresolved consensus conflicts
 *   - teachingLeaderboard: helpers ranked by explainer effectiveness
 *   - conceptBottlenecks: concepts that appear in the most confusion records
 *
 * Used exclusively by the study-admin page — not shown to readers.
 *
 * GET ?paperId=...
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 })
    }

    const [
      conceptConfusions,
      peerSessions,
      consensusCheckpoints,
      marginalNotes,
    ] = await Promise.all([
      prisma.conceptConfusion.findMany({
        where: { paperId },
        select: { sectionId: true, sectionName: true, conceptLabel: true, userId: true, userName: true, resolved: true, pageNumber: true },
      }),
      prisma.peerExplanationCapture.findMany({
        where: { paperId, dsAtEnd: { not: null } },
        select: { helperId: true, helperName: true, helpeeId: true, helpeeName: true, dsAtStart: true, dsAtEnd: true, resolved: true, helpeeRating: true, sectionName: true },
      }),
      prisma.consensusCheckpoint.findMany({
        where: { paperId },
        select: { sectionName: true, agreedMeaning: true, contributors: true, createdAt: true },
      }),
      prisma.marginalNote.findMany({
        where: { paperId },
        select: { sectionName: true, pageNumber: true, authorName: true },
      }),
    ])

    // ── 1. Section bottleneck heat map ──────────────────────────────────────────
    const sectionCounts = conceptConfusions.reduce<Record<string, {
      sectionName: string
      confusionCount: number
      uniqueUsers: Set<string>
      resolvedCount: number
      concepts: Record<string, number>
    }>>((acc, c) => {
      if (!acc[c.sectionId]) {
        acc[c.sectionId] = { sectionName: c.sectionName, confusionCount: 0, uniqueUsers: new Set(), resolvedCount: 0, concepts: {} }
      }
      acc[c.sectionId].confusionCount++
      acc[c.sectionId].uniqueUsers.add(c.userId)
      if (c.resolved) acc[c.sectionId].resolvedCount++
      acc[c.sectionId].concepts[c.conceptLabel] = (acc[c.sectionId].concepts[c.conceptLabel] || 0) + 1
      return acc
    }, {})

    const passageHeatmap = Object.entries(sectionCounts)
      .map(([sectionId, d]) => ({
        sectionId,
        sectionName: d.sectionName,
        confusionCount: d.confusionCount,
        uniqueReaders: d.uniqueUsers.size,
        resolutionRate: d.confusionCount > 0 ? d.resolvedCount / d.confusionCount : 0,
        topConcept: Object.entries(d.concepts).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      }))
      .sort((a, b) => b.confusionCount - a.confusionCount)

    // ── 2. Peer pair effectiveness ──────────────────────────────────────────────
    const pairMap = peerSessions.reduce<Record<string, {
      helperName: string
      helpeeName: string
      sessions: number
      totalDsReduction: number
      resolvedCount: number
      totalRating: number
      ratedSessions: number
    }>>((acc, s) => {
      const key = `${s.helperId}→${s.helpeeId}`
      if (!acc[key]) acc[key] = { helperName: s.helperName, helpeeName: s.helpeeName, sessions: 0, totalDsReduction: 0, resolvedCount: 0, totalRating: 0, ratedSessions: 0 }
      acc[key].sessions++
      acc[key].totalDsReduction += s.dsAtStart - (s.dsAtEnd ?? s.dsAtStart)
      if (s.resolved) acc[key].resolvedCount++
      if (s.helpeeRating) { acc[key].totalRating += s.helpeeRating; acc[key].ratedSessions++ }
      return acc
    }, {})

    const peerEffectiveness = Object.entries(pairMap)
      .map(([, d]) => ({
        helperName: d.helperName,
        helpeeName: d.helpeeName,
        sessions: d.sessions,
        avgDsReduction: d.sessions > 0 ? d.totalDsReduction / d.sessions : 0,
        resolutionRate: d.sessions > 0 ? d.resolvedCount / d.sessions : 0,
        avgRating: d.ratedSessions > 0 ? d.totalRating / d.ratedSessions : null,
      }))
      .sort((a, b) => b.avgDsReduction - a.avgDsReduction)
      .slice(0, 10)

    // ── 3. Concept bottlenecks ──────────────────────────────────────────────────
    const conceptMap = conceptConfusions.reduce<Record<string, {
      count: number
      users: string[]
      sectionName: string
      resolved: number
    }>>((acc, c) => {
      if (!acc[c.conceptLabel]) acc[c.conceptLabel] = { count: 0, users: [], sectionName: c.sectionName, resolved: 0 }
      acc[c.conceptLabel].count++
      if (!acc[c.conceptLabel].users.includes(c.userName)) acc[c.conceptLabel].users.push(c.userName)
      if (c.resolved) acc[c.conceptLabel].resolved++
      return acc
    }, {})

    const conceptBottlenecks = Object.entries(conceptMap)
      .map(([concept, d]) => ({
        concept,
        sectionName: d.sectionName,
        affectedReaders: d.users.length,
        occurrences: d.count,
        resolutionRate: d.count > 0 ? d.resolved / d.count : 0,
      }))
      .sort((a, b) => b.affectedReaders - a.affectedReaders)
      .slice(0, 10)

    // ── 4. Teaching leaderboard ─────────────────────────────────────────────────
    const helperMap = peerSessions.reduce<Record<string, {
      name: string
      sessions: number
      totalDsReduction: number
      resolvedCount: number
    }>>((acc, s) => {
      if (!acc[s.helperId]) acc[s.helperId] = { name: s.helperName, sessions: 0, totalDsReduction: 0, resolvedCount: 0 }
      acc[s.helperId].sessions++
      acc[s.helperId].totalDsReduction += s.dsAtStart - (s.dsAtEnd ?? s.dsAtStart)
      if (s.resolved) acc[s.helperId].resolvedCount++
      return acc
    }, {})

    const teachingLeaderboard = Object.entries(helperMap)
      .map(([userId, d]) => ({
        userId,
        name: d.name,
        sessions: d.sessions,
        avgDsReduction: d.sessions > 0 ? d.totalDsReduction / d.sessions : 0,
        resolutionRate: d.sessions > 0 ? d.resolvedCount / d.sessions : 0,
      }))
      .sort((a, b) => b.avgDsReduction - a.avgDsReduction)

    return NextResponse.json({
      success: true,
      summary: {
        totalConfusions: conceptConfusions.length,
        totalPeerSessions: peerSessions.length,
        totalConsensusCheckpoints: consensusCheckpoints.length,
        totalMarginalNotes: marginalNotes.length,
        avgDsReduction: peerSessions.length > 0
          ? peerSessions.reduce((sum, s) => sum + (s.dsAtStart - (s.dsAtEnd ?? s.dsAtStart)), 0) / peerSessions.length
          : 0,
      },
      passageHeatmap,
      peerEffectiveness,
      conceptBottlenecks,
      teachingLeaderboard,
      consensusCheckpoints: consensusCheckpoints.map(c => ({
        ...c,
        contributors: JSON.parse(c.contributors),
      })),
    })
  } catch (error) {
    console.error('[cohort-analytics GET]', error)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
