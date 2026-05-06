// lib/agents/Agent4_AnnotationsAnalysis.ts
'use client'

import { interactionCollector, type HighlightEvent, type AnnotationEvent } from '../interactionCollector'

/**
 * AGENT 4: Annotations Analysis
 * 
 * Role: Analyzes highlights and annotations to identify topics, patterns, and insights
 * 
 * Responsibilities:
 * - Analyze highlight patterns (confusion vs understanding)
 * - Extract topics from annotations
 * - Identify collaborative opportunities (similar highlights)
 * - Detect annotation clusters
 * 
 * Activation: Event-based (when annotations added)
 */

export interface TopicCluster {
  topic: string
  keywords: string[]
  highlightCount: number
  annotationCount: number
  sections: string[]
  sentiment: 'confused' | 'understood' | 'mixed'
}

export interface CollaborationOpportunity {
  type: 'similar-confusion' | 'complementary-understanding' | 'shared-interest'
  sectionId: string
  usersInvolved: string[]
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface AnnotationPattern {
  pattern: 'heavy-confusion' | 'active-learning' | 'passive-reading' | 'selective-focus'
  evidence: string[]
  confidence: number
}

class Agent4_AnnotationsAnalysis {
  private agentId = 'agent-4-annotations-analysis'
  private isActive = false

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 4] Annotations Analysis activated')
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 4] Annotations Analysis deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Annotations Analysis',
      active: this.isActive,
      type: 'event-based',
      description: 'Analyzes highlights and annotations for topics and patterns'
    }
  }

  // ============================================================================
  // TOPIC EXTRACTION
  // ============================================================================

  extractTopics(highlights: HighlightEvent[], annotations: AnnotationEvent[]): TopicCluster[] {
    const topicMap = new Map<string, TopicCluster>()
    
    // Simple keyword extraction from highlight text
    highlights.forEach(h => {
      const keywords = this.extractKeywords(h.text)
      
      keywords.forEach(keyword => {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, {
            topic: keyword,
            keywords: [keyword],
            highlightCount: 0,
            annotationCount: 0,
            sections: [],
            sentiment: 'mixed'
          })
        }
        
        const cluster = topicMap.get(keyword)!
        cluster.highlightCount++
        
        if (h.sectionId && !cluster.sections.includes(h.sectionId)) {
          cluster.sections.push(h.sectionId)
        }
        
        // Update sentiment based on reason
        if (h.reason === 'confusion') {
          cluster.sentiment = 'confused'
        } else if (h.reason === 'understood' && cluster.sentiment !== 'confused') {
          cluster.sentiment = 'understood'
        }
      })
    })
    
    // Add annotation topics
    annotations.forEach(a => {
      const keywords = this.extractKeywords(a.text)
      
      keywords.forEach(keyword => {
        const cluster = topicMap.get(keyword)
        if (cluster) {
          cluster.annotationCount++
        }
      })
    })
    
    // Filter and sort
    return Array.from(topicMap.values())
      .filter(c => c.highlightCount + c.annotationCount > 1)
      .sort((a, b) => (b.highlightCount + b.annotationCount) - (a.highlightCount + a.annotationCount))
      .slice(0, 10) // Top 10 topics
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (split by spaces, filter common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'these', 'those']
    
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 3) // Top 3 keywords per text
  }

  // ============================================================================
  // COLLABORATION OPPORTUNITIES
  // ============================================================================

  findCollaborationOpportunities(currentUserId: string): CollaborationOpportunity[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []
    
    const opportunities: CollaborationOpportunity[] = []
    
    // Find sections with confusion where others might help
    session.sectionInteractions.forEach((section, sectionId) => {
      if (section.confusionHighlights > 2) {
        opportunities.push({
          type: 'similar-confusion',
          sectionId,
          usersInvolved: [currentUserId],
          description: `${section.confusionHighlights} confusion highlights in ${section.sectionName}`,
          priority: section.struggleScore > 70 ? 'high' : 'medium'
        })
      }
      
      // Find shared interests (multiple highlights)
      if (section.highlightCount > 3) {
        opportunities.push({
          type: 'shared-interest',
          sectionId,
          usersInvolved: [currentUserId],
          description: `High interest in ${section.sectionName}`,
          priority: 'low'
        })
      }
    })
    
    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // ============================================================================
  // ANNOTATION PATTERNS
  // ============================================================================

  detectAnnotationPatterns(highlights: HighlightEvent[], annotations: AnnotationEvent[]): AnnotationPattern[] {
    const patterns: AnnotationPattern[] = []
    
    const confusionRatio = highlights.filter(h => h.reason === 'confusion').length / (highlights.length || 1)
    const understoodRatio = highlights.filter(h => h.reason === 'understood').length / (highlights.length || 1)
    const annotationRatio = annotations.length / (highlights.length || 1)
    
    // Heavy confusion pattern
    if (confusionRatio > 0.5) {
      patterns.push({
        pattern: 'heavy-confusion',
        evidence: [
          `${Math.round(confusionRatio * 100)}% of highlights are confusion-based`,
          `${highlights.filter(h => h.reason === 'confusion').length} confusion highlights`
        ],
        confidence: confusionRatio
      })
    }
    
    // Active learning pattern
    if (annotationRatio > 0.3 && understoodRatio > 0.3) {
      patterns.push({
        pattern: 'active-learning',
        evidence: [
          `${annotations.length} annotations added`,
          `${Math.round(understoodRatio * 100)}% understood highlights`
        ],
        confidence: Math.min(annotationRatio, understoodRatio)
      })
    }
    
    // Passive reading pattern
    if (highlights.length < 3 && annotations.length === 0) {
      patterns.push({
        pattern: 'passive-reading',
        evidence: [
          `Only ${highlights.length} highlights`,
          'No annotations added'
        ],
        confidence: 0.7
      })
    }
    
    // Selective focus pattern
    const uniqueSections = new Set(highlights.map(h => h.sectionId)).size
    if (uniqueSections <= 2 && highlights.length > 5) {
      patterns.push({
        pattern: 'selective-focus',
        evidence: [
          `${highlights.length} highlights in only ${uniqueSections} sections`,
          'Focused on specific areas'
        ],
        confidence: 0.8
      })
    }
    
    return patterns
  }

  // ============================================================================
  // HIGHLIGHT ANALYSIS
  // ============================================================================

  analyzeHighlightDistribution() {
    const session = interactionCollector.getCurrentSession()
    if (!session) return null
    
    const distribution = {
      confusion: session.highlights.filter(h => h.reason === 'confusion').length,
      understood: session.highlights.filter(h => h.reason === 'understood').length,
      clarification: session.highlights.filter(h => h.reason === 'clarification').length,
      important: session.highlights.filter(h => h.reason === 'important').length,
      question: session.highlights.filter(h => h.reason === 'question').length,
      disagree: session.highlights.filter(h => h.reason === 'disagree').length
    }
    
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    
    return {
      counts: distribution,
      percentages: {
        confusion: Math.round((distribution.confusion / total) * 100) || 0,
        understood: Math.round((distribution.understood / total) * 100) || 0,
        clarification: Math.round((distribution.clarification / total) * 100) || 0,
        important: Math.round((distribution.important / total) * 100) || 0,
        question: Math.round((distribution.question / total) * 100) || 0,
        disagree: Math.round((distribution.disagree / total) * 100) || 0
      },
      dominantType: Object.entries(distribution).reduce((a, b) => a[1] > b[1] ? a : b)[0] as string
    }
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  analyze() {
    if (!this.isActive) {
      this.activate()
    }
    
    const session = interactionCollector.getCurrentSession()
    if (!session) return null
    
    const topics = this.extractTopics(session.highlights, session.annotations)
    const patterns = this.detectAnnotationPatterns(session.highlights, session.annotations)
    const opportunities = this.findCollaborationOpportunities(session.userId)
    const distribution = this.analyzeHighlightDistribution()
    
    return {
      topics,
      patterns,
      opportunities,
      distribution,
      summary: {
        totalHighlights: session.highlights.length,
        totalAnnotations: session.annotations.length,
        topTopics: topics.slice(0, 3).map(t => t.topic),
        primaryPattern: patterns[0]?.pattern || 'none'
      }
    }
  }

  getTopConfusedTopics(): TopicCluster[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []
    
    const topics = this.extractTopics(session.highlights, session.annotations)
    return topics.filter(t => t.sentiment === 'confused').slice(0, 5)
  }

  getTopUnderstoodTopics(): TopicCluster[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []

    const topics = this.extractTopics(session.highlights, session.annotations)
    return topics.filter(t => t.sentiment === 'understood').slice(0, 5)
  }

  // ============================================================================
  // DIVERGENCE DETECTION (cross-reader annotation divergence)
  // ============================================================================

  /**
   * Detect divergence pairs across all peer highlights.
   * Returns passages where two readers marked the same text with different reasons.
   * Uses token-level Jaccard similarity >= 0.35 as the overlap threshold.
   */
  detectDivergenceAcrossPeers(
    localHighlights: Array<{ id: string; text: string; reason: string; sectionId: string; pageNumber: number; userId: string; userName: string }>,
    peerHighlights: Array<{ id: string; text: string; reason: string; sectionId: string; pageNumber: number; userId: string; userName: string }>
  ): Array<{
    localId: string; peerId: string;
    sharedPassage: string; overlapScore: number;
    localReason: string; peerReason: string;
    sectionId: string; pageNumber: number;
    localUserName: string; peerUserName: string;
  }> {
    const OVERLAP_THRESHOLD = 0.35
    const results: typeof this._divergenceResultType[] = []
    const seen = new Set<string>()

    function jaccard(a: string, b: string): number {
      const tokA = new Set(a.toLowerCase().split(/\s+/).filter(t => t.length > 3))
      const tokB = new Set(b.toLowerCase().split(/\s+/).filter(t => t.length > 3))
      if (tokA.size === 0 || tokB.size === 0) return 0
      const intersection = [...tokA].filter(t => tokB.has(t)).length
      const union = new Set([...tokA, ...tokB]).size
      return intersection / union
    }

    function longestPhrase(a: string, b: string): string {
      const wordsA = a.split(/\s+/)
      const wordsB = new Set(b.split(/\s+/))
      let best: string[] = [], cur: string[] = []
      for (const w of wordsA) {
        if (wordsB.has(w)) { cur.push(w); if (cur.length > best.length) best = [...cur] }
        else cur = []
      }
      return best.join(' ')
    }

    for (const local of localHighlights) {
      for (const peer of peerHighlights) {
        if (local.userId === peer.userId) continue
        if (local.reason === peer.reason) continue
        if (Math.abs((local.pageNumber || 0) - (peer.pageNumber || 0)) > 1) continue
        const key = [local.id, peer.id].sort().join(':')
        if (seen.has(key)) continue
        const score = jaccard(local.text, peer.text)
        if (score >= OVERLAP_THRESHOLD) {
          seen.add(key)
          results.push({
            localId: local.id,
            peerId: peer.id,
            sharedPassage: longestPhrase(local.text, peer.text),
            overlapScore: score,
            localReason: local.reason,
            peerReason: peer.reason,
            sectionId: local.sectionId,
            pageNumber: local.pageNumber || 0,
            localUserName: local.userName,
            peerUserName: peer.userName,
          })
        }
      }
    }
    return results.sort((a, b) => b.overlapScore - a.overlapScore)
  }

  // TypeScript helper — never instantiated, only used for return type inference
  private _divergenceResultType = {} as {
    localId: string; peerId: string;
    sharedPassage: string; overlapScore: number;
    localReason: string; peerReason: string;
    sectionId: string; pageNumber: number;
    localUserName: string; peerUserName: string;
  }

  /**
   * Analyze the distribution of epistemic tags across all marginal notes for this session.
   * Returns counts per tag and the dominant epistemic concern.
   */
  analyzeEpistemicTagDistribution(
    notes: Array<{ epistemicTag?: string | null; sectionId?: string | null }>
  ): {
    counts: Record<string, number>;
    dominant: string | null;
    sectionBreakdown: Record<string, Record<string, number>>;
  } {
    const counts: Record<string, number> = {
      Claim: 0, Evidence: 0, Gap: 0, Assumption: 0, Contradiction: 0, untagged: 0,
    }
    const sectionBreakdown: Record<string, Record<string, number>> = {}

    for (const note of notes) {
      const tag = note.epistemicTag || 'untagged'
      counts[tag] = (counts[tag] || 0) + 1
      if (note.sectionId) {
        if (!sectionBreakdown[note.sectionId]) sectionBreakdown[note.sectionId] = {}
        sectionBreakdown[note.sectionId][tag] = (sectionBreakdown[note.sectionId][tag] || 0) + 1
      }
    }

    const tagged = Object.entries(counts).filter(([k]) => k !== 'untagged')
    const dominant = tagged.length > 0
      ? tagged.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : null

    return { counts, dominant, sectionBreakdown }
  }
}

// Export singleton instance
export const agent4_annotationsAnalysis = new Agent4_AnnotationsAnalysis()

// Export types
export type { Agent4_AnnotationsAnalysis }