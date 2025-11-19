// lib/interactionCollector.ts
'use client'

import { GazePoint } from './eyeTracking'

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export interface InteractionSession {
  sessionId: string
  userId: string
  userName: string
  documentId: string
  startTime: number
  endTime?: number
  lastActiveTime: number
  
  // Aggregated data
  gazeData: GazePoint[]
  highlights: HighlightEvent[]
  annotations: AnnotationEvent[]
  stuckMarkers: StuckMarkerEvent[]
  pageVisits: PageVisit[]
  sectionInteractions: Map<string, SectionInteraction>
  
  // Computed metrics
  totalActiveTime: number
  totalIdleTime: number
  pagesVisited: number[]
  completionPercentage: number
}

export interface HighlightEvent {
  id: string
  text: string
  page: number
  position: { x: number; y: number }
  author: string
  authorId: string
  timestamp: number
  reason: 'confusion' | 'understood' | 'clarification' | 'important' | 'question' | 'disagree'
  reasonLabel: string
  sectionId?: string
}

export interface AnnotationEvent {
  id: string
  type: 'comment' | 'note'
  text: string
  page: number
  position: { x: number; y: number; width: number; height: number }
  author: string
  timestamp: number
  sectionId?: string
}

export interface StuckMarkerEvent {
  id: string
  page: number
  position: { x: number; y: number }
  text: string
  timestamp: number
  resolved?: boolean
  resolvedAt?: number
}

export interface PageVisit {
  page: number
  startTime: number
  endTime?: number
  duration: number
  revisit: boolean
  scrollDepth?: number
}

export interface SectionInteraction {
  sectionId: string
  sectionName: string
  firstVisitTime: number
  lastVisitTime: number
  totalTimeSpent: number
  visitCount: number
  highlightCount: number
  annotationCount: number
  stuckMarkerCount: number
  confusionHighlights: number
  understoodHighlights: number
  gazeFixations: number
  
  // Computed scores
  struggleScore: number  // 0-100, higher = more struggle
  understandingScore: number  // 0-100, higher = better understanding
  engagementScore: number  // 0-100, higher = more engaged
}

// ============================================================================
// INTERACTION COLLECTOR CLASS
// ============================================================================

class InteractionCollectorService {
  private currentSession: InteractionSession | null = null
  private idleTimeout: NodeJS.Timeout | null = null
  private readonly IDLE_THRESHOLD = 60000 // 1 minute
  private readonly STORAGE_KEY = 'litsense_interaction_data'
  
  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================
  
  startSession(userId: string, userName: string, documentId: string): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.currentSession = {
      sessionId,
      userId,
      userName,
      documentId,
      startTime: Date.now(),
      lastActiveTime: Date.now(),
      gazeData: [],
      highlights: [],
      annotations: [],
      stuckMarkers: [],
      pageVisits: [],
      sectionInteractions: new Map(),
      totalActiveTime: 0,
      totalIdleTime: 0,
      pagesVisited: [],
      completionPercentage: 0
    }
    
    console.log('📊 [InteractionCollector] Session started:', sessionId)
    this.startIdleDetection()
    this.saveToStorage()
    
    return sessionId
  }
  
  endSession() {
    if (!this.currentSession) return
    
    this.currentSession.endTime = Date.now()
    this.currentSession.totalActiveTime = this.calculateActiveTime()
    this.stopIdleDetection()
    
    console.log('📊 [InteractionCollector] Session ended:', this.currentSession.sessionId)
    this.saveToStorage()
    
    // Archive session
    this.archiveSession(this.currentSession)
    this.currentSession = null
  }
  
  private startIdleDetection() {
    // Reset idle timer on any activity
    const resetIdleTimer = () => {
      if (this.currentSession) {
        this.currentSession.lastActiveTime = Date.now()
      }
      
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout)
      }
      
      this.idleTimeout = setTimeout(() => {
        console.log('💤 [InteractionCollector] User went idle')
      }, this.IDLE_THRESHOLD)
    }
    
    // Listen for activity
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', resetIdleTimer)
      window.addEventListener('keydown', resetIdleTimer)
      window.addEventListener('scroll', resetIdleTimer)
      window.addEventListener('click', resetIdleTimer)
    }
  }
  
  private stopIdleDetection() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
    }
  }
  
  private calculateActiveTime(): number {
    if (!this.currentSession) return 0
    
    const totalTime = Date.now() - this.currentSession.startTime
    const idleTime = this.currentSession.totalIdleTime
    return totalTime - idleTime
  }
  
  // ========================================================================
  // DATA COLLECTION METHODS
  // ========================================================================
  
  trackGazePoint(gazePoint: GazePoint) {
    if (!this.currentSession) return
    
    this.currentSession.gazeData.push(gazePoint)
    
    // Keep only last 5000 points to avoid memory issues
    if (this.currentSession.gazeData.length > 5000) {
      this.currentSession.gazeData.shift()
    }
    
    // Auto-save every 100 gaze points
    if (this.currentSession.gazeData.length % 100 === 0) {
      this.saveToStorage()
    }
  }
  
  trackHighlight(highlight: Omit<HighlightEvent, 'timestamp'>) {
    if (!this.currentSession) return
    
    const highlightEvent: HighlightEvent = {
      ...highlight,
      timestamp: Date.now()
    }
    
    this.currentSession.highlights.push(highlightEvent)
    
    // Update section interaction
    if (highlight.sectionId) {
      this.updateSectionInteraction(highlight.sectionId, 'highlight', highlight.reason)
    }
    
    console.log('🖍️ [InteractionCollector] Highlight tracked:', highlightEvent.reason)
    this.saveToStorage()
  }
  
  trackAnnotation(annotation: Omit<AnnotationEvent, 'timestamp'>) {
    if (!this.currentSession) return
    
    const annotationEvent: AnnotationEvent = {
      ...annotation,
      timestamp: Date.now()
    }
    
    this.currentSession.annotations.push(annotationEvent)
    
    // Update section interaction
    if (annotation.sectionId) {
      this.updateSectionInteraction(annotation.sectionId, 'annotation')
    }
    
    console.log('📝 [InteractionCollector] Annotation tracked')
    this.saveToStorage()
  }
  
  trackStuckMarker(marker: Omit<StuckMarkerEvent, 'timestamp'>) {
    if (!this.currentSession) return
    
    const stuckEvent: StuckMarkerEvent = {
      ...marker,
      timestamp: Date.now()
    }
    
    this.currentSession.stuckMarkers.push(stuckEvent)
    
    console.log('🆘 [InteractionCollector] Stuck marker tracked')
    this.saveToStorage()
  }
  
  trackPageVisit(page: number, sectionId?: string) {
    if (!this.currentSession) return
    
    // Check if this is a revisit
    const previousVisits = this.currentSession.pageVisits.filter(v => v.page === page)
    const isRevisit = previousVisits.length > 0
    
    // End previous page visit
    const currentVisits = this.currentSession.pageVisits.filter(v => !v.endTime)
    currentVisits.forEach(visit => {
      visit.endTime = Date.now()
      visit.duration = visit.endTime - visit.startTime
    })
    
    // Start new page visit
    const pageVisit: PageVisit = {
      page,
      startTime: Date.now(),
      duration: 0,
      revisit: isRevisit
    }
    
    this.currentSession.pageVisits.push(pageVisit)
    
    // Track unique pages
    if (!this.currentSession.pagesVisited.includes(page)) {
      this.currentSession.pagesVisited.push(page)
    }
    
    // Update section interaction
    if (sectionId) {
      this.updateSectionInteraction(sectionId, 'visit')
    }
    
    console.log(`📄 [InteractionCollector] Page visit tracked: ${page} (revisit: ${isRevisit})`)
    this.saveToStorage()
  }
  
  private updateSectionInteraction(
    sectionId: string, 
    type: 'visit' | 'highlight' | 'annotation' | 'stuck',
    reason?: string
  ) {
    if (!this.currentSession) return
    
    let section = this.currentSession.sectionInteractions.get(sectionId)
    
    if (!section) {
      section = {
        sectionId,
        sectionName: sectionId,
        firstVisitTime: Date.now(),
        lastVisitTime: Date.now(),
        totalTimeSpent: 0,
        visitCount: 0,
        highlightCount: 0,
        annotationCount: 0,
        stuckMarkerCount: 0,
        confusionHighlights: 0,
        understoodHighlights: 0,
        gazeFixations: 0,
        struggleScore: 0,
        understandingScore: 0,
        engagementScore: 0
      }
      this.currentSession.sectionInteractions.set(sectionId, section)
    }
    
    // Update based on type
    section.lastVisitTime = Date.now()
    
    switch (type) {
      case 'visit':
        section.visitCount++
        break
      case 'highlight':
        section.highlightCount++
        if (reason === 'confusion') section.confusionHighlights++
        if (reason === 'understood') section.understoodHighlights++
        break
      case 'annotation':
        section.annotationCount++
        break
      case 'stuck':
        section.stuckMarkerCount++
        break
    }
    
    // Recalculate scores
    this.calculateSectionScores(section)
  }
  
  private calculateSectionScores(section: SectionInteraction) {
    // Struggle Score (0-100, higher = more struggle)
    let struggleScore = 0
    struggleScore += section.confusionHighlights * 15
    struggleScore += section.stuckMarkerCount * 25
    struggleScore += Math.min(section.visitCount - 1, 5) * 10 // Revisits
    struggleScore = Math.min(struggleScore, 100)
    
    // Understanding Score (0-100, higher = better understanding)
    let understandingScore = 50 // Start neutral
    understandingScore += section.understoodHighlights * 20
    understandingScore -= section.confusionHighlights * 15
    understandingScore -= section.stuckMarkerCount * 20
    understandingScore = Math.max(0, Math.min(understandingScore, 100))
    
    // Engagement Score (0-100, higher = more engaged)
    let engagementScore = 0
    engagementScore += Math.min(section.highlightCount, 5) * 10
    engagementScore += Math.min(section.annotationCount, 5) * 15
    engagementScore += Math.min(section.visitCount, 3) * 10
    engagementScore = Math.min(engagementScore, 100)
    
    section.struggleScore = Math.round(struggleScore)
    section.understandingScore = Math.round(understandingScore)
    section.engagementScore = Math.round(engagementScore)
  }
  
  // ========================================================================
  // DATA RETRIEVAL
  // ========================================================================
  
  getCurrentSession(): InteractionSession | null {
    return this.currentSession
  }
  
  getSectionAnalysis(sectionId: string): SectionInteraction | undefined {
    if (!this.currentSession) return undefined
    return this.currentSession.sectionInteractions.get(sectionId)
  }
  
  getAllSectionAnalysis(): SectionInteraction[] {
    if (!this.currentSession) return []
    return Array.from(this.currentSession.sectionInteractions.values())
  }
  
  getStrugglingSections(): SectionInteraction[] {
    return this.getAllSectionAnalysis()
      .filter(s => s.struggleScore > 60)
      .sort((a, b) => b.struggleScore - a.struggleScore)
  }
  
  getUnderstoodSections(): SectionInteraction[] {
    return this.getAllSectionAnalysis()
      .filter(s => s.understandingScore > 70)
      .sort((a, b) => b.understandingScore - a.understandingScore)
  }
  
  getSessionSummary() {
    if (!this.currentSession) return null
    
    const totalPages = this.currentSession.pagesVisited.length
    const totalHighlights = this.currentSession.highlights.length
    const totalAnnotations = this.currentSession.annotations.length
    const totalStuckMarkers = this.currentSession.stuckMarkers.length
    
    const confusionCount = this.currentSession.highlights.filter(h => h.reason === 'confusion').length
    const understoodCount = this.currentSession.highlights.filter(h => h.reason === 'understood').length
    
    const activeTime = this.calculateActiveTime()
    const avgTimePerPage = totalPages > 0 ? activeTime / totalPages : 0
    
    return {
      sessionId: this.currentSession.sessionId,
      duration: activeTime,
      pagesVisited: totalPages,
      highlights: totalHighlights,
      annotations: totalAnnotations,
      stuckMarkers: totalStuckMarkers,
      confusionCount,
      understoodCount,
      avgTimePerPage,
      completionPercentage: this.currentSession.completionPercentage
    }
  }
  
  // ========================================================================
  // PERSISTENCE (localStorage)
  // ========================================================================
  
  private saveToStorage() {
    if (typeof window === 'undefined' || !this.currentSession) return
    
    try {
      // Convert Map to array for JSON serialization
      const sessionData = {
        ...this.currentSession,
        sectionInteractions: Array.from(this.currentSession.sectionInteractions.entries())
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('❌ [InteractionCollector] Failed to save to storage:', error)
    }
  }
  
  loadFromStorage(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return false
      
      const sessionData = JSON.parse(stored)
      
      // Restore Map from array
      sessionData.sectionInteractions = new Map(sessionData.sectionInteractions)
      
      this.currentSession = sessionData
      console.log('✅ [InteractionCollector] Session loaded from storage')
      return true
    } catch (error) {
      console.error('❌ [InteractionCollector] Failed to load from storage:', error)
      return false
    }
  }
  
  private archiveSession(session: InteractionSession) {
    if (typeof window === 'undefined') return
    
    try {
      const archiveKey = `${this.STORAGE_KEY}_archive`
      const stored = localStorage.getItem(archiveKey)
      const archive = stored ? JSON.parse(stored) : []
      
      // Convert Map to array for serialization
      const sessionData = {
        ...session,
        sectionInteractions: Array.from(session.sectionInteractions.entries())
      }
      
      archive.push(sessionData)
      
      // Keep only last 10 sessions
      if (archive.length > 10) {
        archive.shift()
      }
      
      localStorage.setItem(archiveKey, JSON.stringify(archive))
      console.log('📦 [InteractionCollector] Session archived')
    } catch (error) {
      console.error('❌ [InteractionCollector] Failed to archive session:', error)
    }
  }
  
  clearStorage() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('🗑️ [InteractionCollector] Storage cleared')
  }
  
  // ========================================================================
  // EXPORT DATA
  // ========================================================================
  
  exportSessionData(): string {
    if (!this.currentSession) return ''
    
    const sessionData = {
      ...this.currentSession,
      sectionInteractions: Array.from(this.currentSession.sectionInteractions.entries())
    }
    
    return JSON.stringify(sessionData, null, 2)
  }
  
  downloadSessionData() {
    if (typeof window === 'undefined' || !this.currentSession) return
    
    const data = this.exportSessionData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `litsense-session-${this.currentSession.sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Export singleton instance
export const interactionCollector = new InteractionCollectorService()

// Export types
export type { InteractionCollectorService }