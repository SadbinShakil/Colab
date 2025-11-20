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
    // Monitor every 5 seconds
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
    }, 5000)
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
      const severity = this.calculateStruggSeverity(section)
      
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

  private calculateStruggSeverity(section: SectionInteraction): 'low' | 'medium' | 'high' | null {
    const struggleScore = section.struggleScore
    
    if (struggleScore < 40) return null // No struggle
    if (struggleScore < 60) return 'low'
    if (struggleScore < 80) return 'medium'
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