// lib/agents/Agent7_ImplicitAssistance.ts
'use client'

import type { StruggleSignal, BreakthroughSignal } from './Agent1_UnderstandingDetection'
import type { AnnotationPattern } from './Agent4_AnnotationsAnalysis'

/**
 * AGENT 7: Implicit Assistance
 * 
 * Role: Generates smart notifications and gentle nudges without explicit user requests
 * 
 * Responsibilities:
 * - Generate awareness notifications ("Emma also struggling")
 * - Detect confusion loops ("3 others went back")
 * - Breakthrough sharing ("Help Emma?")
 * - Slow zone detection
 * - Smart suggestions
 * 
 * Activation: Event-based (triggered by other agents)
 */

export interface SmartNotification {
  id: string
  type: 'struggle-awareness' | 'confusion-loop' | 'breakthrough-sharing' | 'peer-suggestion' | 'slow-zone' | 'encouragement' | 'pulse'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  actionable?: string
  actionButton?: {
    label: string
    action: string
  }
  secondaryButton?: {
    label: string
    action: string
  }
  timestamp: number
  sectionId?: string
  dismissed?: boolean
  targetUserId?: string
  targetUserIds?: string[]
  invitationData?: any
  sectionName?: string // ✅ ADD: Specific section name
  text?: string // ✅ Unique text context for the struggle
}

export interface ImplicitSuggestion {
  type: 'take-break' | 'review-section' | 'connect-peer' | 'use-explainer' | 'mark-understood' | 'visual-breakdown'
  reason: string
  confidence: number
  urgent: boolean
}

class Agent7_ImplicitAssistance {
  private agentId = 'agent-7-implicit-assistance'
  private isActive = false
  private notifications: SmartNotification[] = []
  private dismissedNotifications: Set<string> = new Set()

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 7] Implicit Assistance activated')

    // Listen for events from other agents
    this.setupEventListeners()
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 7] Implicit Assistance deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Implicit Assistance',
      active: this.isActive,
      type: 'event-based',
      description: 'Generates smart notifications and gentle nudges',
      activeNotifications: this.notifications.filter(n => !n.dismissed).length
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners() {
    if (typeof window === 'undefined') return

    // Listen to Agent 1 events
    window.addEventListener('agent1:struggle-detected', ((e: CustomEvent) => {
      this.onStruggleDetected(e.detail)
    }) as EventListener)

    window.addEventListener('agent1:breakthrough-detected', ((e: CustomEvent) => {
      this.onBreakthroughDetected(e.detail)
    }) as EventListener)
  }

  // ============================================================================
  // NOTIFICATION GENERATION
  // ============================================================================

  onStruggleDetected(signal: StruggleSignal) {
    if (!this.isActive) return

    // ✅ DISABLED: Notifications are now generated directly by aiCoordinationCore
    // This prevents duplicate notifications and ensures thresholds are respected
    // The coordination core calls generateNotification() with proper targeting

    console.log('📊 [Agent 7] Struggle signal received (notifications handled by coordination core):', signal)

    // ❌ COMMENTED OUT: This was causing immediate notifications on every struggle signal
    // The coordination core now handles notification generation after checking thresholds

    /*
    // ✅ CRITICAL: Only notify the struggling user!
    const strugglingUserId = (signal as any).userId
    
    if (!strugglingUserId) {
      console.warn('⚠️ [Agent 7] No userId in struggle signal - skipping notification')
      return
    }
    
    // Generate struggle awareness notification FOR THE STRUGGLING USER
    const notification: SmartNotification = {
      id: `struggle-${signal.sectionId}-${Date.now()}`,
      type: 'struggle-awareness',
      priority: signal.severity === 'high' ? 'high' : 'medium',
      title: 'Others find this tricky too',
      message: `${signal.sectionName} is challenging for many readers. You're not alone!`,
      actionable: 'Consider using the AI explainer or asking collaborators',
      actionButton: {
        label: 'Get Help',
        action: 'open-stuck-here'
      },
      timestamp: Date.now(),
      sectionId: signal.sectionId,
      targetUserId: strugglingUserId  // ✅ ADD: Only this user sees it
    }
    
    console.log(`📢 [Agent 7] Notification for user ${strugglingUserId}:`, notification.title)
    this.addNotification(notification)
    
    // Generate confusion loop notification if applicable
    if (signal.indicators.revisitCount >= 3) {
      const loopNotification: SmartNotification = {
        id: `loop-${signal.sectionId}-${Date.now()}`,
        type: 'confusion-loop',
        priority: 'high',
        title: 'Confusion loop detected',
        message: `You've revisited this section ${signal.indicators.revisitCount} times. Try a different approach?`,
        actionable: '3 other readers had the same pattern',
        actionButton: {
          label: 'Get AI Explanation',
          action: 'open-explainer'
        },
        timestamp: Date.now(),
        sectionId: signal.sectionId,
        targetUserId: strugglingUserId  // ✅ ADD: Only this user sees it
      }
      
      this.addNotification(loopNotification)
    }
    */
  }

  onBreakthroughDetected(signal: BreakthroughSignal) {
    if (!this.isActive) return

    // Generate breakthrough sharing notification
    const notification: SmartNotification = {
      id: `breakthrough-${signal.sectionId}-${Date.now()}`,
      type: 'breakthrough-sharing',
      priority: 'medium',
      title: '🎉 Great progress!',
      message: `You went from ${signal.scoreBefore} to ${signal.scoreAfter} understanding in ${Math.round(signal.timeToBreakthrough / 60000)} minutes!`,
      // ❌ REMOVED: Hardcoded "Emma" reference - should use real peer data from Agent 2
      // actionable: 'Emma is still struggling with this section. Want to help?',
      // actionButton: {
      //   label: 'Help Emma',
      //   action: 'connect-peer'
      // },
      timestamp: Date.now(),
      sectionId: signal.sectionId
    }

    this.addNotification(notification)
  }


  generateSlowZoneNotification(sectionId: string, sectionName: string, timeSpent: number) {
    const notification: SmartNotification = {
      id: `slow-${sectionId}-${Date.now()}`,
      type: 'slow-zone',
      priority: 'low',
      title: 'Taking your time here',
      message: `You've spent ${Math.round(timeSpent / 60000)} minutes on ${sectionName}`,
      actionable: 'This is normal for complex sections',
      timestamp: Date.now(),
      sectionId
    }

    this.addNotification(notification)
  }

  generateNotification(config: {
    type: SmartNotification['type']
    title: string
    message: string
    priority: 'high' | 'medium' | 'low'
    sectionId?: string
    actionButton?: { label: string; action: string }
    secondaryButton?: { label: string; action: string }
    targetUserId?: string
    targetUserIds?: string[]
    invitationData?: any
    sectionName?: string // ✅ ADD parameter
    text?: string // ✅ ADD specific text context
  }) {
    // 🛡️ DE-BOUNCE: Check if a similar notification already exists and is active
    const duplicate = this.notifications.find(n =>
      !n.dismissed &&
      n.type === config.type &&
      (Date.now() - n.timestamp < 30000) // Prevent same type within 30s
    )

    if (duplicate) {
      console.log(`🚫 [Agent 7] Suppressing duplicate notification: ${config.title}`)
      return
    }

    const notification: SmartNotification = {
      id: `custom-${Date.now()}`,
      type: config.type,
      priority: config.priority,
      title: config.title,
      message: config.message,
      actionable: config.message,
      actionButton: config.actionButton,
      secondaryButton: config.secondaryButton,
      timestamp: Date.now(),
      sectionId: config.sectionId,
      targetUserId: config.targetUserId,
      targetUserIds: config.targetUserIds,
      invitationData: config.invitationData,
      sectionName: config.sectionName, // ✅ ADD assignment
      text: config.text // ✅ Pass specific text
    }

    this.addNotification(notification)
  }

  generateEncouragement() {
    const encouragements = [
      'You\'re making steady progress!',
      'Keep going, you\'re doing great!',
      'Complex papers take time - you\'re on track',
      'Every section you complete is progress!'
    ]

    const notification: SmartNotification = {
      id: `encourage-${Date.now()}`,
      type: 'encouragement',
      priority: 'low',
      title: encouragements[Math.floor(Math.random() * encouragements.length)],
      message: 'Research reading is challenging work',
      timestamp: Date.now()
    }

    this.addNotification(notification)
  }

  // ============================================================================
  // IMPLICIT SUGGESTIONS
  // ============================================================================

  generateSuggestions(
    struggleSignals: StruggleSignal[],
    patterns: AnnotationPattern[],
    sessionDuration: number
  ): ImplicitSuggestion[] {
    const suggestions: ImplicitSuggestion[] = []

    // 1. Session Duration Logic
    if (sessionDuration > 45 * 60 * 1000) {
      suggestions.push({
        type: 'take-break',
        reason: 'Long reading session detected. Your cognitive load might be high.',
        confidence: 0.9,
        urgent: sessionDuration > 90 * 60 * 1000
      })
    }

    // 2. Behavioral Pattern Logic (GOOGLE-LEVEL)
    const activeStruggle = struggleSignals.find(s => s.detected)

    // Check Agent 1 Behavioral Patterns through the signal data
    // If we want to be precise, we'd pass the patterns explicitly, 
    // but for now we'll infer from the signal indicators
    if (activeStruggle) {
      if (activeStruggle.indicators.revisitCount >= 3) {
        suggestions.push({
          type: 'review-section',
          reason: 'You have revisited this section multiple times. Would you like a fresh perspective?',
          confidence: 0.95,
          urgent: true
        })
      }

      if (activeStruggle.severity === 'high') {
        suggestions.push({
          type: 'connect-peer',
          reason: 'This section is complex. A collaborator who has mastered it is online.',
          confidence: 0.85,
          urgent: true
        })
      }
    }

    // 3. Annotation Pattern Logic
    const confusionPattern = patterns.find(p => p.pattern === 'heavy-confusion')
    if (confusionPattern) {
      suggestions.push({
        type: 'use-explainer',
        reason: 'The concentration of confusion highlights suggests an AI walkthrough would be beneficial.',
        confidence: confusionPattern.confidence,
        urgent: confusionPattern.confidence > 0.8
      })
    }

    return suggestions.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      return b.confidence - a.confidence
    })
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  private addNotification(notification: SmartNotification) {
    // Don't add if this exact notification ID was already dismissed
    if (this.dismissedNotifications.has(notification.id)) {
      console.log(`⏭️ [Agent 7] Skipping notification ${notification.id} - already dismissed`)
      return
    }

    // ✅ FIX: Allow new notifications even if similar ones exist, as long as they're dismissed
    // Only prevent duplicates if there's an ACTIVE (non-dismissed) notification of the same type and section
    const activeDuplicate = this.notifications.some(n =>
      n.type === notification.type &&
      n.sectionId === notification.sectionId &&
      n.targetUserId === notification.targetUserId && // Also match target user
      !n.dismissed &&
      (Date.now() - n.timestamp) < 60000 // Only consider duplicates within last minute
    )

    if (activeDuplicate) {
      console.log(`⏭️ [Agent 7] Skipping duplicate notification - active one exists`)
      return
    }

    // Remove old dismissed notifications of the same type/section to prevent memory buildup
    // Keep only the last 50 notifications
    if (this.notifications.length > 50) {
      const dismissed = this.notifications.filter(n => n.dismissed)
      if (dismissed.length > 0) {
        // Remove oldest dismissed notifications
        dismissed.sort((a, b) => a.timestamp - b.timestamp)
        const toRemove = dismissed.slice(0, dismissed.length - 25) // Keep last 25 dismissed
        toRemove.forEach(n => {
          const index = this.notifications.findIndex(notif => notif.id === n.id)
          if (index >= 0) {
            this.notifications.splice(index, 1)
            this.dismissedNotifications.delete(n.id)
          }
        })
      }
    }

    this.notifications.push(notification)
    console.log('🔔 [Agent 7] Notification generated:', notification.title, `(ID: ${notification.id})`)

    // Emit event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agent7:notification', { detail: notification }))
    }
  }

  dismissNotification(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.dismissed = true
      this.dismissedNotifications.add(notificationId)
    }
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  getActiveNotifications(): SmartNotification[] {
    return this.notifications.filter(n => !n.dismissed)
  }

  getNotificationsByPriority(priority: 'high' | 'medium' | 'low'): SmartNotification[] {
    return this.notifications.filter(n => !n.dismissed && n.priority === priority)
  }

  getNotificationsForSection(sectionId: string): SmartNotification[] {
    return this.notifications.filter(n => !n.dismissed && n.sectionId === sectionId)
  }

  clearAllNotifications() {
    this.notifications.forEach(n => {
      n.dismissed = true
      this.dismissedNotifications.add(n.id)
    })
  }

  getNotificationStats() {
    return {
      total: this.notifications.length,
      active: this.notifications.filter(n => !n.dismissed).length,
      dismissed: this.dismissedNotifications.size,
      byType: {
        struggleAwareness: this.notifications.filter(n => n.type === 'struggle-awareness').length,
        confusionLoop: this.notifications.filter(n => n.type === 'confusion-loop').length,
        breakthrough: this.notifications.filter(n => n.type === 'breakthrough-sharing').length,
        peerSuggestion: this.notifications.filter(n => n.type === 'peer-suggestion').length,
        slowZone: this.notifications.filter(n => n.type === 'slow-zone').length,
        encouragement: this.notifications.filter(n => n.type === 'encouragement').length
      }
    }
  }
}

// Export singleton instance
export const agent7_implicitAssistance = new Agent7_ImplicitAssistance()

// Export types
export type { Agent7_ImplicitAssistance }