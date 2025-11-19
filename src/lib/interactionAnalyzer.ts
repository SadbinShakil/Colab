// lib/interactionAnalyzer.ts
'use client'

import { InteractionSession, SectionInteraction } from './interactionCollector'

// ============================================================================
// ANALYSIS RESULT TYPES
// ============================================================================

export interface AnalysisResult {
  sessionId: string
  timestamp: number
  
  // Overall metrics
  overallStruggleScore: number
  overallUnderstandingScore: number
  overallEngagementScore: number
  readingEfficiency: number
  
  // Patterns detected
  patterns: DetectedPattern[]
  
  // Recommendations
  recommendations: Recommendation[]
  
  // Section analysis
  strugglingSections: SectionAnalysis[]
  understoodSections: SectionAnalysis[]
  skippedSections: SectionAnalysis[]
  
  // Reading behavior
  readingPattern: 'linear' | 'jumping' | 'selective' | 'thorough'
  focusAreas: string[]
  weakAreas: string[]
  
  // Time analysis
  timeDistribution: TimeDistribution
  
  // Predictions
  predictedDifficultySections: string[]
  suggestedNextActions: string[]
}

export interface DetectedPattern {
  type: 'struggle' | 'mastery' | 'confusion' | 'engagement' | 'disengagement'
  description: string
  evidence: string[]
  confidence: number
  sectionIds: string[]
}

export interface Recommendation {
  type: 'intervention' | 'suggestion' | 'praise' | 'warning'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: string
  sectionId?: string
}

export interface SectionAnalysis {
  sectionId: string
  sectionName: string
  struggleScore: number
  understandingScore: number
  engagementScore: number
  timeSpent: number
  revisits: number
  highlightRatio: {
    confusion: number
    understood: number
    other: number
  }
  summary: string
}

export interface TimeDistribution {
  totalActiveTime: number
  avgTimePerSection: number
  longestSection: { sectionId: string; duration: number }
  shortestSection: { sectionId: string; duration: number }
  timeBySection: Array<{ sectionId: string; time: number }>
}

// ============================================================================
// INTERACTION ANALYZER CLASS
// ============================================================================

class InteractionAnalyzerService {
  
  // ========================================================================
  // MAIN ANALYSIS METHOD
  // ========================================================================
  
  analyzeSession(session: InteractionSession): AnalysisResult {
    console.log('🔍 [InteractionAnalyzer] Analyzing session:', session.sessionId)
    
    const sections = Array.from(session.sectionInteractions.values())
    
    // Calculate overall scores
    const overallStruggleScore = this.calculateOverallStruggle(sections)
    const overallUnderstandingScore = this.calculateOverallUnderstanding(sections)
    const overallEngagementScore = this.calculateOverallEngagement(sections)
    const readingEfficiency = this.calculateReadingEfficiency(session)
    
    // Detect patterns
    const patterns = this.detectPatterns(session, sections)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(session, sections, patterns)
    
    // Categorize sections
    const strugglingSections = this.analyzeStrugglingSections(sections)
    const understoodSections = this.analyzeUnderstoodSections(sections)
    const skippedSections = this.analyzeSkippedSections(sections)
    
    // Analyze reading behavior
    const readingPattern = this.determineReadingPattern(session)
    const focusAreas = this.identifyFocusAreas(sections)
    const weakAreas = this.identifyWeakAreas(sections)
    
    // Time analysis
    const timeDistribution = this.analyzeTimeDistribution(session, sections)
    
    // Predictions
    const predictedDifficultySections = this.predictDifficultSections(sections)
    const suggestedNextActions = this.suggestNextActions(session, sections, patterns)
    
    const result: AnalysisResult = {
      sessionId: session.sessionId,
      timestamp: Date.now(),
      overallStruggleScore,
      overallUnderstandingScore,
      overallEngagementScore,
      readingEfficiency,
      patterns,
      recommendations,
      strugglingSections,
      understoodSections,
      skippedSections,
      readingPattern,
      focusAreas,
      weakAreas,
      timeDistribution,
      predictedDifficultySections,
      suggestedNextActions
    }
    
    console.log('✅ [InteractionAnalyzer] Analysis complete')
    return result
  }
  
  // ========================================================================
  // OVERALL SCORE CALCULATIONS
  // ========================================================================
  
  private calculateOverallStruggle(sections: SectionInteraction[]): number {
    if (sections.length === 0) return 0
    
    const totalStruggle = sections.reduce((sum, s) => sum + s.struggleScore, 0)
    return Math.round(totalStruggle / sections.length)
  }
  
  private calculateOverallUnderstanding(sections: SectionInteraction[]): number {
    if (sections.length === 0) return 50
    
    const totalUnderstanding = sections.reduce((sum, s) => sum + s.understandingScore, 0)
    return Math.round(totalUnderstanding / sections.length)
  }
  
  private calculateOverallEngagement(sections: SectionInteraction[]): number {
    if (sections.length === 0) return 0
    
    const totalEngagement = sections.reduce((sum, s) => sum + s.engagementScore, 0)
    return Math.round(totalEngagement / sections.length)
  }
  
  private calculateReadingEfficiency(session: InteractionSession): number {
    const pagesRead = session.pagesVisited.length
    const timeSpent = Date.now() - session.startTime
    const minutesSpent = timeSpent / 60000
    
    if (minutesSpent === 0) return 0
    
    const pagesPerMinute = pagesRead / minutesSpent
    const highlightsPerPage = session.highlights.length / (pagesRead || 1)
    
    // Efficiency score: balance between speed and engagement
    const speedScore = Math.min(pagesPerMinute * 20, 50)
    const engagementScore = Math.min(highlightsPerPage * 10, 50)
    
    return Math.round(speedScore + engagementScore)
  }
  
  // ========================================================================
  // PATTERN DETECTION
  // ========================================================================
  
  private detectPatterns(session: InteractionSession, sections: SectionInteraction[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    
    // Pattern 1: Struggle with specific sections
    const strugglingCount = sections.filter(s => s.struggleScore > 70).length
    if (strugglingCount > 0) {
      patterns.push({
        type: 'struggle',
        description: `Struggling with ${strugglingCount} section(s)`,
        evidence: sections
          .filter(s => s.struggleScore > 70)
          .map(s => `${s.sectionName}: ${s.confusionHighlights} confusion highlights, ${s.stuckMarkerCount} stuck markers`),
        confidence: Math.min(strugglingCount * 0.3, 1),
        sectionIds: sections.filter(s => s.struggleScore > 70).map(s => s.sectionId)
      })
    }
    
    // Pattern 2: Quick mastery
    const masteryCount = sections.filter(s => s.understandingScore > 80 && s.visitCount === 1).length
    if (masteryCount > 0) {
      patterns.push({
        type: 'mastery',
        description: `Quick understanding of ${masteryCount} section(s)`,
        evidence: sections
          .filter(s => s.understandingScore > 80 && s.visitCount === 1)
          .map(s => `${s.sectionName}: ${s.understoodHighlights} understood highlights, visited once`),
        confidence: Math.min(masteryCount * 0.25, 1),
        sectionIds: sections.filter(s => s.understandingScore > 80 && s.visitCount === 1).map(s => s.sectionId)
      })
    }
    
    // Pattern 3: Confusion followed by understanding
    const confusionToUnderstanding = session.highlights.filter((h, i) => {
      if (h.reason !== 'understood') return false
      const prevHighlights = session.highlights.slice(Math.max(0, i - 3), i)
      return prevHighlights.some(ph => ph.reason === 'confusion' && ph.sectionId === h.sectionId)
    })
    
    if (confusionToUnderstanding.length > 0) {
      patterns.push({
        type: 'mastery',
        description: 'Breakthrough moments detected',
        evidence: [`Found ${confusionToUnderstanding.length} instances of confusion → understanding`],
        confidence: 0.8,
        sectionIds: [...new Set(confusionToUnderstanding.map(h => h.sectionId || ''))]
      })
    }
    
    // Pattern 4: High engagement
    const highEngagement = sections.filter(s => s.engagementScore > 80).length
    if (highEngagement > 0) {
      patterns.push({
        type: 'engagement',
        description: `Highly engaged with ${highEngagement} section(s)`,
        evidence: sections
          .filter(s => s.engagementScore > 80)
          .map(s => `${s.sectionName}: ${s.highlightCount} highlights, ${s.annotationCount} notes`),
        confidence: Math.min(highEngagement * 0.25, 1),
        sectionIds: sections.filter(s => s.engagementScore > 80).map(s => s.sectionId)
      })
    }
    
    // Pattern 5: Multiple revisits (struggling)
    const multipleRevisits = sections.filter(s => s.visitCount > 3)
    if (multipleRevisits.length > 0) {
      patterns.push({
        type: 'confusion',
        description: `Repeatedly revisiting ${multipleRevisits.length} section(s)`,
        evidence: multipleRevisits.map(s => `${s.sectionName}: visited ${s.visitCount} times`),
        confidence: 0.85,
        sectionIds: multipleRevisits.map(s => s.sectionId)
      })
    }
    
    return patterns
  }
  
  // ========================================================================
  // RECOMMENDATIONS
  // ========================================================================
  
  private generateRecommendations(
    session: InteractionSession,
    sections: SectionInteraction[],
    patterns: DetectedPattern[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // Recommend help for struggling sections
    const strugglingPattern = patterns.find(p => p.type === 'struggle')
    if (strugglingPattern && strugglingPattern.sectionIds.length > 0) {
      const sectionId = strugglingPattern.sectionIds[0]
      const section = sections.find(s => s.sectionId === sectionId)
      
      recommendations.push({
        type: 'intervention',
        priority: 'high',
        title: 'Consider getting help',
        description: `You've shown signs of struggle with "${section?.sectionName || 'this section'}". This is completely normal for complex research papers!`,
        actionable: 'Try using the AI explainer or discuss with collaborators',
        sectionId
      })
    }
    
    // Praise for mastery
    const masteryPattern = patterns.find(p => p.type === 'mastery')
    if (masteryPattern && masteryPattern.sectionIds.length > 0) {
      recommendations.push({
        type: 'praise',
        priority: 'low',
        title: 'Great progress!',
        description: `You're understanding sections quickly. You've mastered ${masteryPattern.sectionIds.length} section(s) on first read.`,
        actionable: 'Keep up the good work!'
      })
    }
    
    // Suggest taking breaks
    const sessionDuration = Date.now() - session.startTime
    if (sessionDuration > 45 * 60 * 1000) { // 45 minutes
      recommendations.push({
        type: 'suggestion',
        priority: 'medium',
        title: 'Consider taking a break',
        description: 'You\'ve been reading for over 45 minutes. Research shows breaks improve comprehension.',
        actionable: 'Take a 5-10 minute break to refresh'
      })
    }
    
    // Suggest reviewing confused sections
    const confusedSections = sections.filter(s => s.confusionHighlights > s.understoodHighlights)
    if (confusedSections.length > 0) {
      recommendations.push({
        type: 'suggestion',
        priority: 'medium',
        title: 'Review confused sections',
        description: `You have ${confusedSections.length} section(s) with more confusion than understanding highlights.`,
        actionable: 'Re-read these sections or ask for help',
        sectionId: confusedSections[0].sectionId
      })
    }
    
    // Encourage collaboration
    if (session.stuckMarkers.length > 2) {
      recommendations.push({
        type: 'suggestion',
        priority: 'high',
        title: 'Connect with collaborators',
        description: `You've marked ${session.stuckMarkers.length} "stuck here" points. Your collaborators might have insights!`,
        actionable: 'Share your stuck points in the chat'
      })
    }
    
    return recommendations
  }
  
  // ========================================================================
  // SECTION ANALYSIS
  // ========================================================================
  
  private analyzeStrugglingSections(sections: SectionInteraction[]): SectionAnalysis[] {
    return sections
      .filter(s => s.struggleScore > 60)
      .sort((a, b) => b.struggleScore - a.struggleScore)
      .map(s => this.createSectionAnalysis(s, 'struggling'))
  }
  
  private analyzeUnderstoodSections(sections: SectionInteraction[]): SectionAnalysis[] {
    return sections
      .filter(s => s.understandingScore > 70)
      .sort((a, b) => b.understandingScore - a.understandingScore)
      .map(s => this.createSectionAnalysis(s, 'understood'))
  }
  
  private analyzeSkippedSections(sections: SectionInteraction[]): SectionAnalysis[] {
    return sections
      .filter(s => s.visitCount === 0 || s.totalTimeSpent < 10000) // Less than 10 seconds
      .map(s => this.createSectionAnalysis(s, 'skipped'))
  }
  
  private createSectionAnalysis(section: SectionInteraction, type: string): SectionAnalysis {
    const totalHighlights = section.highlightCount || 1 // Avoid division by zero
    
    let summary = ''
    if (type === 'struggling') {
      summary = `High struggle detected: ${section.confusionHighlights} confusion highlights, ${section.stuckMarkerCount} stuck markers, ${section.visitCount} visits`
    } else if (type === 'understood') {
      summary = `Good understanding: ${section.understoodHighlights} understood highlights, quick comprehension`
    } else {
      summary = `Minimal engagement: ${section.visitCount} visits, ${section.totalTimeSpent}ms spent`
    }
    
    return {
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      struggleScore: section.struggleScore,
      understandingScore: section.understandingScore,
      engagementScore: section.engagementScore,
      timeSpent: section.totalTimeSpent,
      revisits: section.visitCount - 1,
      highlightRatio: {
        confusion: Math.round((section.confusionHighlights / totalHighlights) * 100),
        understood: Math.round((section.understoodHighlights / totalHighlights) * 100),
        other: Math.round(((totalHighlights - section.confusionHighlights - section.understoodHighlights) / totalHighlights) * 100)
      },
      summary
    }
  }
  
  // ========================================================================
  // READING BEHAVIOR ANALYSIS
  // ========================================================================
  
  private determineReadingPattern(session: InteractionSession): 'linear' | 'jumping' | 'selective' | 'thorough' {
    const pages = session.pagesVisited.sort((a, b) => a - b)
    
    // Check if reading linearly
    let isLinear = true
    for (let i = 1; i < pages.length; i++) {
      if (pages[i] !== pages[i - 1] + 1 && pages[i] !== pages[i - 1]) {
        isLinear = false
        break
      }
    }
    
    if (isLinear) return 'linear'
    
    // Check engagement level
    const avgHighlightsPerPage = session.highlights.length / (pages.length || 1)
    const avgAnnotationsPerPage = session.annotations.length / (pages.length || 1)
    
    if (avgHighlightsPerPage > 3 || avgAnnotationsPerPage > 2) {
      return 'thorough'
    }
    
    // Check for jumping
    const pageVisits = session.pageVisits
    let jumpCount = 0
    for (let i = 1; i < pageVisits.length; i++) {
      const jump = Math.abs(pageVisits[i].page - pageVisits[i - 1].page)
      if (jump > 2) jumpCount++
    }
    
    if (jumpCount > pageVisits.length * 0.3) {
      return 'jumping'
    }
    
    return 'selective'
  }
  
  private identifyFocusAreas(sections: SectionInteraction[]): string[] {
    return sections
      .filter(s => s.totalTimeSpent > 60000 || s.highlightCount > 5) // 1 min or 5+ highlights
      .sort((a, b) => b.totalTimeSpent - a.totalTimeSpent)
      .slice(0, 3)
      .map(s => s.sectionName)
  }
  
  private identifyWeakAreas(sections: SectionInteraction[]): string[] {
    return sections
      .filter(s => s.struggleScore > 70)
      .sort((a, b) => b.struggleScore - a.struggleScore)
      .slice(0, 3)
      .map(s => s.sectionName)
  }
  
  // ========================================================================
  // TIME ANALYSIS
  // ========================================================================
  
  private analyzeTimeDistribution(session: InteractionSession, sections: SectionInteraction[]): TimeDistribution {
    const totalActiveTime = Date.now() - session.startTime
    const avgTimePerSection = sections.length > 0 ? totalActiveTime / sections.length : 0
    
    const sortedByTime = [...sections].sort((a, b) => b.totalTimeSpent - a.totalTimeSpent)
    
    const longestSection = sortedByTime[0]
      ? { sectionId: sortedByTime[0].sectionId, duration: sortedByTime[0].totalTimeSpent }
      : { sectionId: '', duration: 0 }
    
    const shortestSection = sortedByTime[sortedByTime.length - 1]
      ? { sectionId: sortedByTime[sortedByTime.length - 1].sectionId, duration: sortedByTime[sortedByTime.length - 1].totalTimeSpent }
      : { sectionId: '', duration: 0 }
    
    const timeBySection = sections.map(s => ({
      sectionId: s.sectionId,
      time: s.totalTimeSpent
    }))
    
    return {
      totalActiveTime,
      avgTimePerSection,
      longestSection,
      shortestSection,
      timeBySection
    }
  }
  
  // ========================================================================
  // PREDICTIONS
  // ========================================================================
  
  private predictDifficultSections(sections: SectionInteraction[]): string[] {
    // Predict which sections will be difficult based on patterns
    return sections
      .filter(s => s.struggleScore > 50 || s.confusionHighlights > 2)
      .sort((a, b) => b.struggleScore - a.struggleScore)
      .slice(0, 3)
      .map(s => s.sectionId)
  }
  
  private suggestNextActions(
    session: InteractionSession,
    sections: SectionInteraction[],
    patterns: DetectedPattern[]
  ): string[] {
    const suggestions: string[] = []
    
    // Based on struggle
    if (patterns.some(p => p.type === 'struggle')) {
      suggestions.push('Use AI explainer on difficult sections')
      suggestions.push('Ask collaborators for help')
    }
    
    // Based on engagement
    if (patterns.some(p => p.type === 'engagement')) {
      suggestions.push('Continue with current reading approach')
    }
    
    // Based on confusion
    if (session.stuckMarkers.length > 0) {
      suggestions.push('Review "stuck here" markers before moving forward')
    }
    
    // Based on reading pattern
    const completedPages = session.pagesVisited.length
    if (completedPages > 0) {
      suggestions.push('Continue to next section')
    } else {
      suggestions.push('Start reading from the beginning')
    }
    
    // Time-based
    const sessionDuration = Date.now() - session.startTime
    if (sessionDuration > 60 * 60 * 1000) { // 1 hour
      suggestions.push('Consider taking a break')
    }
    
    return suggestions.slice(0, 5) // Return top 5
  }
}

// Export singleton instance
export const interactionAnalyzer = new InteractionAnalyzerService()

// Export types
export type { InteractionAnalyzerService }