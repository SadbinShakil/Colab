// lib/agents/Agent1_UnderstandingDetection.ts
'use client'

import { interactionCollector, type InteractionSession, type SectionInteraction } from '../interactionCollector'

/**
 * AGENT 1: Understanding Detection
 * 
 * Role: Continuously monitors user behavior to detect understanding levels and struggle patterns
 * 
 * Responsibilities:
 * - Monitor eye tracking data (fixations, dwell time)
 * - Track understanding score changes
 * - Detect struggle signals (confusion loops, revisits)
 * - Detect breakthrough moments (confusion → understanding)
 * 
 * Always Active: YES (monitors in real-time)
 */

export interface StruggleSignal {
  detected: boolean
  severity: 'low' | 'medium' | 'high'
  sectionId: string
  sectionName: string
  indicators: {
    confusionHighlights: number
    stuckMarkers: number
    revisitCount: number
    timeSpent: number
    understandingScore: number
  }
  timestamp: number
}

export interface BreakthroughSignal {
  detected: boolean
  sectionId: string
  sectionName: string
  scoreBefore: number
  scoreAfter: number
  timeToBreakthrough: number
  timestamp: number
}

export interface UnderstandingState {
  currentScore: number
  trend: 'improving' | 'declining' | 'stable'
  recentChanges: Array<{
    from: number
    to: number
    timestamp: number
  }>
}

/**
 * Advanced Behavioral Patterns
 */
export type BehavioralPattern =
  | 'semantic-dwell'    // Staying on a section much longer than needed to read it
  | 're-read-loop'      // Visiting the same 2-3 pages in a repetitive cycle
  | 'gaze-panic'        // Gaze jittering within a small area (staring at a symbol)
  | 'erratic-scan'      // High scroll frequency with low engagement (lost user)
  | 'cross-ref-jump'    // Jumping between equation in A and definition in B

class Agent1_UnderstandingDetection {
  private agentId = 'agent-1-understanding-detection'
  private isActive = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private previousScores: Map<string, number> = new Map()

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    if (this.isActive) return

    this.isActive = true
    console.log('🤖 [Agent 1] Understanding Detection activated')

    // Start continuous monitoring
    this.startMonitoring()
  }

  deactivate() {
    this.isActive = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    console.log('🤖 [Agent 1] Understanding Detection deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Understanding Detection',
      active: this.isActive,
      type: 'always-monitoring',
      description: 'Monitors eye tracking and behavior to detect understanding levels'
    }
  }

  // ============================================================================
  // MONITORING
  // ============================================================================

  private startMonitoring() {
    // Monitor every 1 second for testing
    this.monitoringInterval = setInterval(() => {
      if (!this.isActive) return

      const session = interactionCollector.getCurrentSession()
      if (!session) return

      // Check for struggle signals
      const struggleSignals = this.detectStruggle(session)
      struggleSignals.forEach(signal => {
        if (signal.detected) {
          this.emitEvent('struggle-detected', signal)
        }
      })

      // Check for breakthrough moments
      const breakthroughs = this.detectBreakthroughs(session)
      breakthroughs.forEach(breakthrough => {
        if (breakthrough.detected) {
          this.emitEvent('breakthrough-detected', breakthrough)
        }
      })
    }, 1000)
  }

  private emitEvent(eventType: string, data: any) {
    // This will be picked up by AI Coordination Core
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`agent1:${eventType}`, { detail: data }))
    }
  }

  // ============================================================================
  // STRUGGLE DETECTION
  // ============================================================================

  detectStruggle(session: InteractionSession): StruggleSignal[] {
    const signals: StruggleSignal[] = []

    session.sectionInteractions.forEach((section, sectionId) => {
      // GOOGLE-LEVEL: Behavioral flow analysis
      const patterns = this.detectPatterns(section, session)
      const severity = this.calculateStruggSeverity(section, patterns)

      if (severity !== null) {
        signals.push({
          detected: true,
          severity,
          sectionId,
          sectionName: section.sectionName,
          indicators: {
            confusionHighlights: section.confusionHighlights,
            stuckMarkers: section.stuckMarkerCount,
            revisitCount: section.visitCount - 1,
            timeSpent: section.totalTimeSpent,
            understandingScore: section.understandingScore
          },
          timestamp: Date.now()
        })
      }
    })

    return signals
  }

  private detectPatterns(section: SectionInteraction, session: InteractionSession): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = []

    // 1. Semantic Dwell Detection (Assuming ~200 words per section avg, 250wpm read speed)
    // If user spends > 3s (TESTING MODE - SUPER FAST) on a standard section without understood highlights
    if (section.totalTimeSpent > 3000 && section.understoodHighlights === 0) {
      patterns.push('semantic-dwell')
    }

    // 2. Re-read Loop Detection
    const last5Visits = session.pageVisits.slice(-6)
    const uniquePages = new Set(last5Visits.map(v => v.page))
    if (last5Visits.length >= 5 && uniquePages.size <= 2) {
      patterns.push('re-read-loop')
    }

    // 3. Gaze Panic (Concentrated fixations in a tiny area)
    if (section.gazeFixations > 30 && section.totalTimeSpent < 45000) {
      patterns.push('gaze-panic')
    }

    // 4. Erratic Scan
    const recentScrolls = session.pageVisits.filter(v =>
      v.startTime > Date.now() - 60000 && v.duration < 5000
    )
    if (recentScrolls.length > 4) {
      patterns.push('erratic-scan')
    }

    return patterns
  }

  private calculateStruggSeverity(
    section: SectionInteraction,
    patterns: BehavioralPattern[]
  ): 'low' | 'medium' | 'high' | null {
    // Weighted struggle logic
    let score = section.struggleScore

    // Amplify score based on behavioral patterns
    // Amplify score based on behavioral patterns
    if (patterns.includes('re-read-loop')) score += 30
    if (patterns.includes('semantic-dwell')) score += 45 // Increased to ensure it triggers 'low' severity (limit 40)
    if (patterns.includes('gaze-panic')) score += 40
    if (patterns.includes('erratic-scan')) score += 15

    if (score < 40) return null
    if (score < 60) return 'low'
    if (score < 80) return 'medium'
    return 'high'
  }

  // ============================================================================
  // BREAKTHROUGH DETECTION
  // ============================================================================

  detectBreakthroughs(session: InteractionSession): BreakthroughSignal[] {
    const breakthroughs: BreakthroughSignal[] = []

    session.sectionInteractions.forEach((section, sectionId) => {
      const previousScore = this.previousScores.get(sectionId)
      const currentScore = section.understandingScore

      // Breakthrough: score jumped from <50 to >70 in short time
      if (previousScore !== undefined && previousScore < 50 && currentScore > 70) {
        const timeDiff = Date.now() - section.firstVisitTime

        breakthroughs.push({
          detected: true,
          sectionId,
          sectionName: section.sectionName,
          scoreBefore: previousScore,
          scoreAfter: currentScore,
          timeToBreakthrough: timeDiff,
          timestamp: Date.now()
        })
      }

      // Update previous score
      this.previousScores.set(sectionId, currentScore)
    })

    return breakthroughs
  }

  // ============================================================================
  // UNDERSTANDING STATE ANALYSIS
  // ============================================================================

  getUnderstandingState(sectionId?: string): UnderstandingState {
    const session = interactionCollector.getCurrentSession()
    if (!session) {
      return {
        currentScore: 50,
        trend: 'stable',
        recentChanges: []
      }
    }

    if (sectionId) {
      const section = session.sectionInteractions.get(sectionId)
      if (!section) {
        return {
          currentScore: 50,
          trend: 'stable',
          recentChanges: []
        }
      }

      return {
        currentScore: section.understandingScore,
        trend: this.determineTrend(section.understandingScore),
        recentChanges: [] // TODO: Track history
      }
    }

    // Overall understanding
    const sections = Array.from(session.sectionInteractions.values())
    const avgScore = sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.understandingScore, 0) / sections.length)
      : 50

    return {
      currentScore: avgScore,
      trend: this.determineTrend(avgScore),
      recentChanges: []
    }
  }

  private determineTrend(currentScore: number): 'improving' | 'declining' | 'stable' {
    // Simple heuristic for now
    if (currentScore > 70) return 'improving'
    if (currentScore < 40) return 'declining'
    return 'stable'
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  getCurrentStrugglingSections(): StruggleSignal[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []

    return this.detectStruggle(session).filter(s => s.detected)
  }

  getRecentBreakthroughs(): BreakthroughSignal[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []

    return this.detectBreakthroughs(session).filter(b => b.detected)
  }

  isUserStruggling(): boolean {
    const session = interactionCollector.getCurrentSession()
    if (!session) return false

    const struggles = this.detectStruggle(session)
    return struggles.some(s => s.severity === 'high' || s.severity === 'medium')
  }

  getConfusionLoops(): Array<{ sectionId: string; count: number }> {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []

    const loops: Array<{ sectionId: string; count: number }> = []

    session.sectionInteractions.forEach((section, sectionId) => {
      // Confusion loop: 3+ visits with high confusion
      if (section.visitCount >= 3 && section.confusionHighlights > section.understoodHighlights) {
        loops.push({
          sectionId,
          count: section.visitCount
        })
      }
    })

    return loops.sort((a, b) => b.count - a.count)
  }
}

// Export singleton instance
export const agent1_understandingDetection = new Agent1_UnderstandingDetection()

// Export types
export type { Agent1_UnderstandingDetection }