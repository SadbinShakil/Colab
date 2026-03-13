// Contextual AI Support Service
// Monitors user behavior and offers help when they're struggling with a section

interface StrugglePattern {
  sectionId: string
  sectionText: string
  struggleType: 'highlighting' | 'time_spent' | 'revisiting' | 'annotations' | 'skimming'
  confidence: number
  timestamp: Date
  userActions: UserAction[]
}

interface UserAction {
  type: 'highlight' | 'comment' | 'time_spent' | 'revisit' | 'scroll'
  timestamp: Date
  location: { page: number; x: number; y: number }
  metadata?: any
}

interface ContextualHelp {
  sectionId: string
  originalText: string
  explanation: string
  simplifiedVersion: string
  keyConcepts: string[]
  relatedConcepts: string[]
  examples: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

class ContextualAIService {
  public struggleThresholds = {
    highlightCount: 2,        // 2+ highlights in same section
    timeSpent: 120000,        // 2 minutes on one section
    revisitCount: 2,          // 2+ returns to same section
    annotationDensity: 0.2,   // 20%+ of section has annotations
    scrollIntensity: 5        // 5+ scroll actions in same section
  }

  private userBehavior: Map<string, UserAction[]> = new Map()
  private strugglePatterns: StrugglePattern[] = []
  private notifiedSections: Set<string> = new Set()
  private isEnabled: boolean = true

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('litsense_struggle_thresholds')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          this.struggleThresholds = { ...this.struggleThresholds, ...parsed }
          console.log('⚙️ [ContextualAI] Loaded settings:', this.struggleThresholds)
        } catch (e) {
          console.error('Failed to parse struggle thresholds', e)
        }
      }
    }
  }

  public updateThresholds(newThresholds: Partial<typeof ContextualAIService.prototype.struggleThresholds>) {
    this.struggleThresholds = { ...this.struggleThresholds, ...newThresholds }
    if (typeof window !== 'undefined') {
      localStorage.setItem('litsense_struggle_thresholds', JSON.stringify(this.struggleThresholds))
    }
    console.log('⚙️ [ContextualAI] Updated thresholds:', this.struggleThresholds)
  }

  // Monitor user highlighting behavior
  trackHighlight(sectionId: string, text: string, location: { page: number; x: number; y: number }) {
    console.log('🎨 [ContextualAI] Tracking highlight:', { sectionId, text: text.substring(0, 50), location })

    const action: UserAction = {
      type: 'highlight',
      timestamp: new Date(),
      location,
      metadata: { text: text.substring(0, 100) }
    }

    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor time spent on sections
  trackTimeSpent(sectionId: string, duration: number, location: { page: number; x: number; y: number }) {
    console.log('⏰ [ContextualAI] Tracking time spent:', { sectionId, duration, location })

    const action: UserAction = {
      type: 'time_spent',
      timestamp: new Date(),
      location,
      metadata: { duration }
    }

    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor revisiting behavior
  trackRevisit(sectionId: string, location: { page: number; x: number; y: number }) {
    console.log('🔄 [ContextualAI] Tracking revisit:', { sectionId, location })

    const action: UserAction = {
      type: 'revisit',
      timestamp: new Date(),
      location
    }

    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor annotation density
  trackAnnotation(sectionId: string, text: string, location: { page: number; x: number; y: number }) {
    console.log('💭 [ContextualAI] Tracking annotation:', { sectionId, text: text.substring(0, 50), location })

    const action: UserAction = {
      type: 'comment',
      timestamp: new Date(),
      location,
      metadata: { text: text.substring(0, 100) }
    }

    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  // Monitor scrolling behavior within sections
  trackScroll(sectionId: string, location: { page: number; x: number; y: number }, scrollDirection: 'up' | 'down') {
    console.log('📜 [ContextualAI] Tracking scroll:', { sectionId, scrollDirection, location })

    const action: UserAction = {
      type: 'scroll',
      timestamp: new Date(),
      location,
      metadata: { direction: scrollDirection }
    }

    this.addUserAction(sectionId, action)
    this.analyzeStrugglePatterns(sectionId)
  }

  private addUserAction(sectionId: string, action: UserAction) {
    if (!this.userBehavior.has(sectionId)) {
      this.userBehavior.set(sectionId, [])
    }
    this.userBehavior.get(sectionId)!.push(action)
  }

  private analyzeStrugglePatterns(sectionId: string) {
    const actions = this.userBehavior.get(sectionId) || []
    const recentActions = actions.filter(a =>
      Date.now() - a.timestamp.getTime() < 600000 // Last 10 minutes
    )

    console.log('🔍 [ContextualAI] Analyzing section:', sectionId, 'Recent actions:', recentActions.length)

    // Check for struggle patterns
    const highlightCount = recentActions.filter(a => a.type === 'highlight').length
    const totalTimeSpent = recentActions
      .filter(a => a.type === 'time_spent')
      .reduce((sum, a) => sum + (a.metadata?.duration || 0), 0)
    const revisitCount = recentActions.filter(a => a.type === 'revisit').length
    const annotationCount = recentActions.filter(a => a.type === 'comment').length
    const scrollCount = recentActions.filter(a => a.type === 'scroll').length

    console.log('📊 [ContextualAI] Pattern counts:', {
      highlightCount,
      totalTimeSpent,
      revisitCount,
      annotationCount,
      scrollCount,
      thresholds: this.struggleThresholds
    })

    let struggleType: StrugglePattern['struggleType'] | 'skimming' | null = null
    let confidence = 0

    if (highlightCount >= this.struggleThresholds.highlightCount) {
      struggleType = 'highlighting'
      confidence = Math.min(0.95, highlightCount / this.struggleThresholds.highlightCount * 0.5)
    } else if (totalTimeSpent >= this.struggleThresholds.timeSpent) {
      struggleType = 'time_spent'
      confidence = Math.min(0.95, totalTimeSpent / this.struggleThresholds.timeSpent * 0.5)
    } else if (revisitCount >= this.struggleThresholds.revisitCount) {
      struggleType = 'revisiting'
      confidence = Math.min(0.95, revisitCount / this.struggleThresholds.revisitCount * 0.5)
    } else if (annotationCount >= this.struggleThresholds.annotationDensity * 10) {
      struggleType = 'annotations'
      confidence = Math.min(0.95, annotationCount / (this.struggleThresholds.annotationDensity * 10) * 0.5)
    } else if (scrollCount >= this.struggleThresholds.scrollIntensity) {
      // Skimming behavior: High scrolling, low time spent, no highlights
      struggleType = 'skimming' as any
      confidence = Math.min(0.85, scrollCount / this.struggleThresholds.scrollIntensity * 0.4)
      console.log('� [ContextualAI] Skimming behavior detected!', { scrollCount, threshold: this.struggleThresholds.scrollIntensity })
    }

    if (struggleType && confidence > 0.6) {
      console.log('🚨 [ContextualAI] STRUGGLE PATTERN DETECTED!', { struggleType, confidence, sectionId })

      const pattern: StrugglePattern = {
        sectionId,
        sectionText: this.getSectionText(sectionId),
        struggleType,
        confidence,
        timestamp: new Date(),
        userActions: recentActions
      }

      this.strugglePatterns.push(pattern)
      this.notifyStruggleDetected(pattern)
    } else {
      console.log('✅ [ContextualAI] No struggle pattern detected yet', {
        struggleType,
        confidence,
        required: 0.6,
        counts: { highlightCount, totalTimeSpent, revisitCount, annotationCount }
      })
    }
  }

  private getSectionText(sectionId: string): string {
    // This would get the actual text content of the section
    // For now, return a placeholder
    return `Section ${sectionId} content...`
  }

  private notifyStruggleDetected(pattern: StrugglePattern) {
    // ✅ Check if already notified for this section
    if (this.notifiedSections.has(pattern.sectionId)) {
      console.log('🔇 [ContextualAI] Already notified for section:', pattern.sectionId)
      return
    }

    console.log('🔢 [ContextualAI] First-time notification for section:', pattern.sectionId)

    // ✅ Mark as notified BEFORE dispatching event
    this.notifiedSections.add(pattern.sectionId)

    // Emit event for UI to show help popup
    if (typeof window !== 'undefined') {
      console.log('🌐 [ContextualAI] Window available, dispatching struggle-detected event')
      try {
        const event = new CustomEvent('struggle-detected', {
          detail: pattern
        })
        console.log('📡 [ContextualAI] Event created:', event)
        window.dispatchEvent(event)
        console.log('✅ [ContextualAI] Event dispatched successfully')
      } catch (error) {
        console.error('❌ [ContextualAI] Error dispatching event:', error)
      }
    } else {
      console.log('⚠️ [ContextualAI] Window not available for event dispatch')
    }
  }

  // Clear notifications when user accepts help or resets
  clearNotifications(sectionId?: string) {
    if (sectionId) {
      this.notifiedSections.delete(sectionId)
      console.log('🧹 [ContextualAI] Cleared notification for section:', sectionId)
    } else {
      this.notifiedSections.clear()
      console.log('🧹 [ContextualAI] Cleared all notifications')
    }
  }

  // Check if user needs help with a specific section
  needsHelp(sectionId: string): boolean {
    const recentPatterns = this.strugglePatterns.filter(p =>
      p.sectionId === sectionId &&
      Date.now() - p.timestamp.getTime() < 300000 // Last 5 minutes
    )
    return recentPatterns.length > 0
  }

  // Get contextual help for a section
  // Get contextual help for a section
  async getContextualHelp(sectionId: string, sectionText: string): Promise<ContextualHelp> {
    try {
      // Call the AI Help API
      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Explain this section: ${sectionText.substring(0, 100)}...`,
          documentContent: sectionText,
          documentTitle: 'Research Paper',
          userId: 'user', // You might want to pass real user ID if available
          userName: 'User'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI help');
      }

      const data = await response.json();
      const answer = data.response.answer;

      // Parse the answer to fit the ContextualHelp structure if possible
      // For now, we'll put the whole answer in 'explanation'
      // You could prompt the AI to return JSON to map fields better

      return {
        sectionId,
        originalText: sectionText,
        explanation: answer,
        simplifiedVersion: "See explanation above.",
        keyConcepts: [], // You could extract these from the AI response
        relatedConcepts: [],
        examples: [],
        difficulty: 'intermediate'
      };
    } catch (error) {
      console.error('Error getting contextual help:', error);
      // Fallback
      return {
        sectionId,
        originalText: sectionText,
        explanation: "Sorry, I couldn't generate an explanation at this time.",
        simplifiedVersion: "",
        keyConcepts: [],
        relatedConcepts: [],
        examples: [],
        difficulty: 'intermediate'
      };
    }
  }

  // Clear struggle patterns when user accepts help
  clearStrugglePatterns(sectionId: string) {
    this.strugglePatterns = this.strugglePatterns.filter(p => p.sectionId !== sectionId)
    this.userBehavior.delete(sectionId)
  }

  // Disable/enable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // Get current struggle patterns
  getStrugglePatterns(): StrugglePattern[] {
    return [...this.strugglePatterns]
  }
}

// Export singleton instance
export const contextualAI = new ContextualAIService()

// Export types for components
export type { StrugglePattern, UserAction, ContextualHelp }
