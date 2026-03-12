// lib/agents/Agent2_CollaborationOrchestrator.ts
'use client'

import { interactionCollector, type SectionInteraction } from '../interactionCollector'

/**
 * AGENT 2: Collaboration Orchestrator
 * 
 * Role: Matches struggling users with proficient peers for collaborative learning
 * 
 * Responsibilities:
 * - Find available peers for help
 * - Match struggling ↔ proficient users
 * - Create collaboration opportunities
 * - Suggest peer tutoring pairs
 * - Track collaboration success
 * 
 * Activation: Event-based (when struggle detected or help requested)
 */

export interface PeerProfile {
  userId: string
  userName: string
  sectionId: string
  understandingScore: number
  status: 'struggling' | 'proficient' | 'neutral'
  availableToHelp: boolean
  currentlyHelping: string | null
}

export interface PeerMatch {
  matchId: string
  helper: PeerProfile
  helpee: PeerProfile
  sectionId: string
  matchReason: string
  matchScore: number // 0-100, higher = better match
  suggestedApproach: 'ai-first' | 'peer-first' | 'group'
}

export interface CollaborationSession {
  sessionId: string
  participants: string[]
  sectionId: string
  startTime: number
  endTime?: number
  outcome?: 'success' | 'partial' | 'failed'
  helpType: 'peer-tutoring' | 'group-discussion' | 'ai-mediated'
}

class Agent2_CollaborationOrchestrator {
  private agentId = 'agent-2-collaboration-orchestrator'
  private isActive = false
  private peerProfiles: Map<string, PeerProfile> = new Map()
  private activeCollaborations: Map<string, CollaborationSession> = new Map()
  private matchHistory: PeerMatch[] = []

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 2] Collaboration Orchestrator activated')
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 2] Collaboration Orchestrator deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Collaboration Orchestrator',
      active: this.isActive,
      type: 'event-based',
      description: 'Matches peers for collaborative learning',
      activePeers: this.peerProfiles.size,
      activeCollaborations: this.activeCollaborations.size
    }
  }

  // ============================================================================
  // PEER PROFILE MANAGEMENT
  // ============================================================================

  registerPeer(userId: string, userName: string) {
    // ✅ Ensure userId is string
    const userIdStr = String(userId)

    console.log(`🤖 [Agent 2] Registering peer: ${userName} (userId: ${userIdStr})`)

    if (!this.peerProfiles.has(userIdStr)) {
      const profile: PeerProfile = {
        userId: userIdStr,
        userName,
        sectionId: '',
        understandingScore: 50,
        status: 'neutral',
        availableToHelp: true,
        currentlyHelping: null
      }

      this.peerProfiles.set(userIdStr, profile)
      console.log(`🤖 [Agent 2] Peer registered: ${userName}`)
    }
  }

  /**
   * SIMULATION HELPER: Injects a fake peer for demo purposes
   */
  injectFakePeer(userId: string, userName: string, sectionId: string, status: 'proficient' | 'struggling') {
    const profile: PeerProfile = {
      userId,
      userName,
      sectionId,
      understandingScore: status === 'proficient' ? 85 : 30,
      status,
      availableToHelp: true,
      currentlyHelping: null
    }
    this.peerProfiles.set(userId, profile)
    console.log(`🤖 [Agent 2] Fake peer injected: ${userName} (${status})`)
  }

  updatePeerStatus(userId: string, sectionId: string, understandingScore: number) {
    const profile = this.peerProfiles.get(userId)
    if (!profile) return

    profile.sectionId = sectionId
    profile.understandingScore = understandingScore

    // Update status based on score
    if (understandingScore < 40) {
      profile.status = 'struggling'
    } else if (understandingScore > 70) {
      profile.status = 'proficient'
    } else {
      profile.status = 'neutral'
    }
  }

  // ============================================================================
  // PEER MATCHING
  // ============================================================================

  findPeersForHelp(userId: string, sectionId: string): PeerMatch[] {
    const helpee = this.peerProfiles.get(userId)
    if (!helpee) return []


    // ✅ DEBUG: Log all registered peers
    console.log(`🔍 [Agent 2] Finding peers for ${userId} in section ${sectionId}`)
    console.log(`📋 [Agent 2] All registered peers:`, Array.from(this.peerProfiles.entries()))
    const matches: PeerMatch[] = []

    // NEW: Find other struggling peers for group study
    const strugglingPeers: PeerProfile[] = []

    this.peerProfiles.forEach((peer, peerId) => {
      if (
        peerId !== userId &&
        peer.sectionId === sectionId &&
        peer.status === 'struggling'
      ) {
        console.log(`    ✅ Found struggling peer: ${peer.userName}`)
        strugglingPeers.push(peer)
      }
    })

    // If others are struggling, suggest group collaboration
    if (strugglingPeers.length >= 1) {
      console.log(`🤝 [Agent 2] Found ${strugglingPeers.length} struggling peers - suggesting group study`)

      matches.push({
        matchId: `group-${Date.now()}`,
        helper: strugglingPeers[0],
        helpee,
        sectionId,
        matchReason: `${strugglingPeers.length + 1} students struggling with this section - learn together!`,
        matchScore: 60,
        suggestedApproach: 'group'
      })
    }

    // Find proficient peers in same section
    this.peerProfiles.forEach((peer, peerId) => {
      if (
        peerId !== userId &&
        peer.sectionId === sectionId &&
        peer.status === 'proficient' &&
        peer.availableToHelp &&
        !peer.currentlyHelping
      ) {
        const matchScore = this.calculateMatchScore(helpee, peer)

        matches.push({
          matchId: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          helper: peer,
          helpee,
          sectionId,
          matchReason: this.getMatchReason(helpee, peer),
          matchScore,
          suggestedApproach: this.suggestApproach(matchScore)
        })
      }
    })

    // Sort by match score
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3)
  }

  private calculateMatchScore(helpee: PeerProfile, helper: PeerProfile): number {
    // Higher score = better match
    let score = 0

    // Score based on understanding gap (not too large, not too small)
    const gap = helper.understandingScore - helpee.understandingScore
    if (gap > 20 && gap < 40) {
      score += 50 // Ideal gap
    } else if (gap >= 40) {
      score += 30 // Large gap (helper might be too advanced)
    } else {
      score += 20 // Small gap
    }

    // Bonus if helper is available
    if (helper.availableToHelp) {
      score += 30
    }

    // Bonus if same section
    if (helper.sectionId === helpee.sectionId) {
      score += 20
    }

    return Math.min(score, 100)
  }

  private getMatchReason(helpee: PeerProfile, helper: PeerProfile): string {
    const gap = helper.understandingScore - helpee.understandingScore

    // A Google workspace/doc type reasoning approach
    // We infer understanding contextually based on their scoring gap without exposing the raw score
    if (gap > 40) {
      return `${helper.userName} recently reviewed this section smoothly and may have valuable insights.`
    } else if (gap > 20) {
      return `${helper.userName} navigated this section with high engagement and minimal struggle.`
    } else {
      return `${helper.userName} recently worked through this exact section and can relate to your analysis.`
    }
  }

  private suggestApproach(matchScore: number): 'ai-first' | 'peer-first' | 'group' {
    if (matchScore > 70) {
      return 'peer-first' // Good match, go straight to peer
    } else if (matchScore > 40) {
      return 'ai-first' // Medium match, try AI first then peer
    } else {
      return 'group' // Low match, suggest group discussion
    }
  }

  // ============================================================================
  // COLLABORATION SESSION MANAGEMENT
  // ============================================================================

  startCollaboration(match: PeerMatch, type: 'peer-tutoring' | 'group-discussion' | 'ai-mediated'): string {
    const sessionId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const session: CollaborationSession = {
      sessionId,
      participants: [match.helper.userId, match.helpee.userId],
      sectionId: match.sectionId,
      startTime: Date.now(),
      helpType: type
    }

    this.activeCollaborations.set(sessionId, session)

    // Update peer statuses
    const helper = this.peerProfiles.get(match.helper.userId)
    if (helper) {
      helper.currentlyHelping = match.helpee.userId
    }

    console.log(`🤖 [Agent 2] Collaboration started: ${match.helper.userName} → ${match.helpee.userName}`)

    // Emit event for other agents
    this.emitEvent('collaboration-started', { sessionId, match, type })

    return sessionId
  }

  endCollaboration(sessionId: string, outcome: 'success' | 'partial' | 'failed') {
    const session = this.activeCollaborations.get(sessionId)
    if (!session) return

    session.endTime = Date.now()
    session.outcome = outcome

    // Free up helpers
    session.participants.forEach(userId => {
      const peer = this.peerProfiles.get(userId)
      if (peer) {
        peer.currentlyHelping = null
      }
    })

    this.activeCollaborations.delete(sessionId)

    console.log(`🤖 [Agent 2] Collaboration ended: ${outcome}`)

    // Emit event
    this.emitEvent('collaboration-ended', { sessionId, outcome, duration: (session.endTime || 0) - session.startTime })
  }

  private emitEvent(eventType: string, data: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`agent2:${eventType}`, { detail: data }))
    }
  }

  // ============================================================================
  // SMART RECOMMENDATIONS
  // ============================================================================

  generateCollaborationOptions(userId: string, sectionId: string) {
    const matches = this.findPeersForHelp(userId, sectionId)

    const options = [
      {
        type: 'ai',
        title: 'Ask AI Explainer',
        description: 'Get an instant explanation from AI',
        priority: matches.length === 0 ? 'high' : 'medium',
        available: true
      }
    ]

    // Add peer options
    matches.forEach((match, idx) => {
      options.push({
        type: 'peer',
        title: `Connect with ${match.helper.userName}`,
        description: match.matchReason,
        priority: idx === 0 ? 'high' : 'medium',
        available: match.helper.availableToHelp,
        matchScore: match.matchScore
      } as any) // ← Add this
    })

    // Add group option if multiple peers available
    if (matches.length >= 2) {
      options.push({
        type: 'group',
        title: 'Join group discussion',
        description: `${matches.length} others are also working on this section`,
        priority: 'low',
        available: true
      })
    }

    return options
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  getCollaborationStats() {
    const totalCollaborations = this.matchHistory.length
    const activeNow = this.activeCollaborations.size

    const successfulCollabs = this.matchHistory.filter(m => {
      const session = this.activeCollaborations.get(m.matchId)
      return session?.outcome === 'success' || session?.outcome === 'partial'
    }).length

    return {
      total: totalCollaborations,
      active: activeNow,
      successful: successfulCollabs,
      successRate: totalCollaborations > 0 ? Math.round((successfulCollabs / totalCollaborations) * 100) : 0,
      availablePeers: Array.from(this.peerProfiles.values()).filter(p => p.availableToHelp).length
    }
  }

  getActiveCollaborations(): CollaborationSession[] {
    return Array.from(this.activeCollaborations.values())
  }

  getPeerStatus(userId: string): PeerProfile | undefined {
    return this.peerProfiles.get(userId)
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  findBestMatch(userId: string, sectionId: string): PeerMatch | null {
    const matches = this.findPeersForHelp(userId, sectionId)
    return matches.length > 0 ? matches[0] : null
  }

  canUserGetHelp(userId: string, sectionId: string): boolean {
    const matches = this.findPeersForHelp(userId, sectionId)
    return matches.length > 0
  }

  getAvailableHelpers(sectionId: string): PeerProfile[] {
    return Array.from(this.peerProfiles.values()).filter(
      p => p.sectionId === sectionId && p.status === 'proficient' && p.availableToHelp
    )
  }

  getStrugglingPeers(sectionId: string): PeerProfile[] {
    return Array.from(this.peerProfiles.values()).filter(
      p => p.sectionId === sectionId && p.status === 'struggling'
    )
  }
}

// Export singleton instance
export const agent2_collaborationOrchestrator = new Agent2_CollaborationOrchestrator()

// Export types
export type { Agent2_CollaborationOrchestrator }