// lib/agents/Agent5_StoryboardCurator.ts
'use client'

import { interactionCollector, type InteractionSession } from '../interactionCollector'

/**
 * AGENT 5: Storyboard Curator
 * 
 * Role: Creates narrative logs of reading sessions, tracks journey from struggle to understanding
 * 
 * Responsibilities:
 * - Log entire user journey
 * - Create visual storyboards
 * - Track progress over time
 * - Identify key moments (struggles, breakthroughs, collaborations)
 * - Generate session summaries
 * 
 * Activation: Always monitoring (logs all events)
 */

export interface StoryboardEvent {
  eventId: string
  type: 'struggle' | 'breakthrough' | 'collaboration' | 'highlight' | 'annotation' | 'page-visit' | 'stuck-marker'
  timestamp: number
  description: string
  sectionId?: string
  participants?: string[]
  metadata?: any
}

export interface ReadingJourney {
  sessionId: string
  userId: string
  startTime: number
  endTime?: number
  events: StoryboardEvent[]
  keyMoments: StoryboardEvent[]
  progressCurve: Array<{ time: number; understanding: number }>
  narrative: string
}

export interface SessionSummary {
  sessionId: string
  duration: number
  pagesVisited: number
  highlightsAdded: number
  strugglesEncountered: number
  breakthroughsAchieved: number
  collaborationsMade: number
  finalUnderstandingScore: number
  topAchievement: string
  recommendations: string[]
}

class Agent5_StoryboardCurator {
  private agentId = 'agent-5-storyboard-curator'
  private isActive = false
  private currentJourney: ReadingJourney | null = null
  private journeyHistory: ReadingJourney[] = []

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 5] Storyboard Curator activated')
    
    // Start listening to all events
    this.setupEventListeners()
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 5] Storyboard Curator deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Storyboard Curator',
      active: this.isActive,
      type: 'always-monitoring',
      description: 'Logs reading journey and creates storyboards',
      currentEvents: this.currentJourney?.events.length || 0,
      totalJourneys: this.journeyHistory.length
    }
  }

  // ============================================================================
  // EVENT LISTENING
  // ============================================================================

  private setupEventListeners() {
    if (typeof window === 'undefined') return
    
    // Listen to all agent events
    window.addEventListener('agent1:struggle-detected', ((e: CustomEvent) => {
      this.logEvent({
        type: 'struggle',
        description: `Struggle detected: ${e.detail.sectionName}`,
        sectionId: e.detail.sectionId,
        metadata: e.detail
      })
    }) as EventListener)
    
    window.addEventListener('agent1:breakthrough-detected', ((e: CustomEvent) => {
      this.logEvent({
        type: 'breakthrough',
        description: `Breakthrough! Understanding improved from ${e.detail.scoreBefore} to ${e.detail.scoreAfter}`,
        sectionId: e.detail.sectionId,
        metadata: e.detail
      })
    }) as EventListener)
    
    window.addEventListener('agent2:collaboration-started', ((e: CustomEvent) => {
      this.logEvent({
        type: 'collaboration',
        description: `Collaboration started with ${e.detail.match.helper.userName}`,
        sectionId: e.detail.match.sectionId,
        participants: [e.detail.match.helper.userId, e.detail.match.helpee.userId],
        metadata: e.detail
      })
    }) as EventListener)
  }

  // ============================================================================
  // JOURNEY TRACKING
  // ============================================================================

  startJourney(userId: string, sessionId: string) {
    this.currentJourney = {
      sessionId,
      userId,
      startTime: Date.now(),
      events: [],
      keyMoments: [],
      progressCurve: [{ time: Date.now(), understanding: 50 }],
      narrative: ''
    }
    
    console.log(`🤖 [Agent 5] Journey started for user: ${userId}`)
  }

  endJourney() {
    if (!this.currentJourney) return
    
    this.currentJourney.endTime = Date.now()
    
    // Generate narrative
    this.currentJourney.narrative = this.generateNarrative(this.currentJourney)
    
    // Archive journey
    this.journeyHistory.push(this.currentJourney)
    
    // Keep only last 10 journeys
    if (this.journeyHistory.length > 10) {
      this.journeyHistory.shift()
    }
    
    console.log(`🤖 [Agent 5] Journey ended. ${this.currentJourney.events.length} events logged`)
    
    const summary = this.generateSummary(this.currentJourney)
    this.currentJourney = null
    
    return summary
  }

  logEvent(event: Omit<StoryboardEvent, 'eventId' | 'timestamp'>) {
    if (!this.currentJourney || !this.isActive) return
    
    const storyboardEvent: StoryboardEvent = {
      ...event,
      eventId: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    this.currentJourney.events.push(storyboardEvent)
    
    // Mark as key moment if significant
    if (this.isKeyMoment(storyboardEvent)) {
      this.currentJourney.keyMoments.push(storyboardEvent)
    }
    
    // Update progress curve
    this.updateProgressCurve()
  }

  private isKeyMoment(event: StoryboardEvent): boolean {
    // Key moments are struggles, breakthroughs, and collaborations
    return ['struggle', 'breakthrough', 'collaboration'].includes(event.type)
  }

  private updateProgressCurve() {
    if (!this.currentJourney) return
    
    const session = interactionCollector.getCurrentSession()
    if (!session) return
    
    // Calculate current understanding
    const sections = Array.from(session.sectionInteractions.values())
    const avgUnderstanding = sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.understandingScore, 0) / sections.length)
      : 50
    
    this.currentJourney.progressCurve.push({
      time: Date.now(),
      understanding: avgUnderstanding
    })
  }

  // ============================================================================
  // NARRATIVE GENERATION
  // ============================================================================

  private generateNarrative(journey: ReadingJourney): string {
    const duration = Math.round(((journey.endTime || Date.now()) - journey.startTime) / 60000)
    const struggles = journey.events.filter(e => e.type === 'struggle').length
    const breakthroughs = journey.events.filter(e => e.type === 'breakthrough').length
    const collaborations = journey.events.filter(e => e.type === 'collaboration').length
    
    let narrative = `Reading session lasted ${duration} minutes. `
    
    if (struggles > 0) {
      narrative += `Encountered ${struggles} challenging section${struggles > 1 ? 's' : ''}. `
    }
    
    if (breakthroughs > 0) {
      narrative += `Achieved ${breakthroughs} breakthrough moment${breakthroughs > 1 ? 's' : ''}! `
    }
    
    if (collaborations > 0) {
      narrative += `Collaborated with ${collaborations} peer${collaborations > 1 ? 's' : ''}. `
    }
    
    // Describe progress
    const startUnderstanding = journey.progressCurve[0]?.understanding || 50
    const endUnderstanding = journey.progressCurve[journey.progressCurve.length - 1]?.understanding || 50
    const improvement = endUnderstanding - startUnderstanding
    
    if (improvement > 20) {
      narrative += `Made significant progress (understanding improved by ${improvement} points).`
    } else if (improvement > 0) {
      narrative += `Made steady progress.`
    } else {
      narrative += `Working through challenging material.`
    }
    
    return narrative
  }

  // ============================================================================
  // SUMMARY GENERATION
  // ============================================================================

  generateSummary(journey: ReadingJourney): SessionSummary {
    const session = interactionCollector.getCurrentSession()
    
    const duration = (journey.endTime || Date.now()) - journey.startTime
    const struggles = journey.events.filter(e => e.type === 'struggle').length
    const breakthroughs = journey.events.filter(e => e.type === 'breakthrough').length
    const collaborations = journey.events.filter(e => e.type === 'collaboration').length
    
    const sections = session ? Array.from(session.sectionInteractions.values()) : []
    const finalScore = sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.understandingScore, 0) / sections.length)
      : 50
    
    // Determine top achievement
    let topAchievement = 'Completed reading session'
    if (breakthroughs >= 3) {
      topAchievement = 'Multiple breakthrough moments!'
    } else if (collaborations >= 2) {
      topAchievement = 'Effective collaboration with peers'
    } else if (struggles > 0 && breakthroughs > 0) {
      topAchievement = 'Overcame challenges through persistence'
    }
    
    // Generate recommendations
    const recommendations: string[] = []
    if (struggles > breakthroughs) {
      recommendations.push('Review confused sections')
      recommendations.push('Consider collaborating with peers')
    }
    if (collaborations === 0 && struggles > 2) {
      recommendations.push('Try connecting with others who understood this material')
    }
    if (finalScore < 60) {
      recommendations.push('Spend more time on challenging sections')
    }
    
    return {
      sessionId: journey.sessionId,
      duration,
      pagesVisited: session?.pagesVisited.length || 0,
      highlightsAdded: session?.highlights.length || 0,
      strugglesEncountered: struggles,
      breakthroughsAchieved: breakthroughs,
      collaborationsMade: collaborations,
      finalUnderstandingScore: finalScore,
      topAchievement,
      recommendations
    }
  }

  // ============================================================================
  // STORYBOARD VISUALIZATION DATA
  // ============================================================================

  getStoryboardData(): ReadingJourney | null {
    return this.currentJourney
  }

  getKeyMoments(): StoryboardEvent[] {
    return this.currentJourney?.keyMoments || []
  }

  getProgressCurve(): Array<{ time: number; understanding: number }> {
    return this.currentJourney?.progressCurve || []
  }

  getTimelineEvents(): StoryboardEvent[] {
    return this.currentJourney?.events || []
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  getCurrentNarrative(): string {
    return this.currentJourney?.narrative || 'No active session'
  }

  getSessionProgress(): { start: number; current: number; improvement: number } | null {
    if (!this.currentJourney) return null
    
    const curve = this.currentJourney.progressCurve
    if (curve.length < 2) return null
    
    return {
      start: curve[0].understanding,
      current: curve[curve.length - 1].understanding,
      improvement: curve[curve.length - 1].understanding - curve[0].understanding
    }
  }

  getJourneyHistory(): ReadingJourney[] {
    return this.journeyHistory
  }

  exportJourney(sessionId?: string): string {
    const journey = sessionId
      ? this.journeyHistory.find(j => j.sessionId === sessionId)
      : this.currentJourney
    
    if (!journey) return ''
    
    return JSON.stringify(journey, null, 2)
  }
}

// Export singleton instance
export const agent5_storyboardCurator = new Agent5_StoryboardCurator()

// Export types
export type { Agent5_StoryboardCurator }