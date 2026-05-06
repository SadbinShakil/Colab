// lib/agents/Agent6_ContentComprehension.ts
'use client'

/**
 * AGENT 6: Content Comprehension
 *
 * Provides section-constrained AI explanations via y = LLM(q | C_s).
 * Abstains and routes to peer if grounding validation fails.
 *
 * Activation: "Explain" click on ImplicitHelpCard, or A7 escalation
 * Trigger for A2: grounded === false → peer routing
 */

import type { A6ExplainRequest, A6ExplainResponse } from '@/app/api/a6-explain/route'

export interface ExplanationRequest {
  requestId: string
  userId: string
  content: string          // selected text or section passage
  sectionId: string
  sectionText: string      // full C_s — the current section text
  requestType: 'explain' | 'paraphrase' | 'analogy' | 'example' | 'question'
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  dsAtTrigger: number
  timestamp: number
}

export interface ExplanationResponse {
  requestId: string
  explanation: string
  grounded: boolean        // false → caller routes to peer
  type: 'simple' | 'detailed' | 'analogy' | 'example'
  confidence: number
  followUpSuggestions: string[]
  timestamp: number
}

export interface ComprehensionContext {
  sectionId: string
  userUnderstanding: number
  confusionPoints: string[]
  previousExplanations: number
  strugglingWith: string[]
}

class Agent6_ContentComprehension {
  private agentId = 'A6'
  private isActive = false
  private explanationHistory: Map<string, ExplanationResponse[]> = new Map()
  private userLevels: Map<string, 'beginner' | 'intermediate' | 'advanced'> = new Map()

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  activate() {
    this.isActive = true
    console.log('🤖 [A6] Content Comprehension activated')
  }

  deactivate() {
    this.isActive = false
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Content Comprehension',
      active: this.isActive,
      type: 'event-based',
      description: 'Section-constrained explanations with grounding validation',
      totalExplanations: Array.from(this.explanationHistory.values())
        .reduce((sum, arr) => sum + arr.length, 0),
    }
  }

  // ── Core: y = LLM(q | C_s) ────────────────────────────────────────────────

  async generateExplanation(request: ExplanationRequest): Promise<ExplanationResponse> {
    console.log(`🤖 [A6] Generating ${request.requestType} for user=${request.userId} section=${request.sectionId} ds=${request.dsAtTrigger}`)

    // Always log activation before making the call
    this.emitEvent('explanation-requested', {
      requestId: request.requestId,
      userId: request.userId,
      sectionId: request.sectionId,
      requestType: request.requestType,
      dsAtTrigger: request.dsAtTrigger,
      timestamp: request.timestamp,
    })

    const payload: A6ExplainRequest = {
      query: request.content,
      sectionText: request.sectionText,
      sectionId: request.sectionId,
      userId: request.userId,
      requestType: request.requestType,
      userLevel: request.userLevel,
      dsAtTrigger: request.dsAtTrigger,
    }

    let apiResponse: A6ExplainResponse

    try {
      const res = await fetch('/api/a6-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`A6 API returned ${res.status}`)
      }

      apiResponse = await res.json()
    } catch (err) {
      console.error('[A6] API call failed:', err)
      // Fail safe: abstain and route to peer
      const failResponse: ExplanationResponse = {
        requestId: request.requestId,
        explanation: '',
        grounded: false,
        type: 'simple',
        confidence: 0,
        followUpSuggestions: [],
        timestamp: Date.now(),
      }
      this.emitEvent('grounding-failed', { requestId: request.requestId, reason: 'API error' })
      return failResponse
    }

    const response: ExplanationResponse = {
      requestId: request.requestId,
      explanation: apiResponse.explanation,
      grounded: apiResponse.grounded,
      type: request.requestType === 'analogy' ? 'analogy'
          : request.requestType === 'example' ? 'example'
          : request.userLevel === 'beginner' ? 'simple' : 'detailed',
      confidence: apiResponse.confidence,
      followUpSuggestions: apiResponse.followUpSuggestions,
      timestamp: Date.now(),
    }

    if (!response.grounded) {
      // Grounding failed — log and signal A2 to route to peer
      console.log(`🤖 [A6] Grounding failed — routing to peer. reason=${apiResponse.groundingFailureReason}`)
      this.emitEvent('grounding-failed', {
        requestId: request.requestId,
        userId: request.userId,
        sectionId: request.sectionId,
        reason: apiResponse.groundingFailureReason,
        dsAtTrigger: request.dsAtTrigger,
      })
      return response
    }

    // Store in history
    const history = this.explanationHistory.get(request.userId) || []
    history.push(response)
    this.explanationHistory.set(request.userId, history)

    this.emitEvent('explanation-generated', {
      requestId: request.requestId,
      userId: request.userId,
      sectionId: request.sectionId,
      grounded: true,
      dsAtTrigger: request.dsAtTrigger,
    })

    return response
  }

  // ── User level inference ───────────────────────────────────────────────────

  setUserLevel(userId: string, level: 'beginner' | 'intermediate' | 'advanced') {
    this.userLevels.set(userId, level)
  }

  inferUserLevel(context: ComprehensionContext): 'beginner' | 'intermediate' | 'advanced' {
    if (context.userUnderstanding < 40) return 'beginner'
    if (context.userUnderstanding < 70) return 'intermediate'
    return 'advanced'
  }

  getUserLevel(userId: string): 'beginner' | 'intermediate' | 'advanced' {
    return this.userLevels.get(userId) || 'intermediate'
  }

  // ── Context helpers ────────────────────────────────────────────────────────

  prepareContext(sectionId: string, userId: string): ComprehensionContext {
    return {
      sectionId,
      userUnderstanding: 50,
      confusionPoints: [],
      previousExplanations: this.explanationHistory.get(userId)?.length || 0,
      strugglingWith: [],
    }
  }

  suggestExplanationType(context: ComprehensionContext): 'explain' | 'analogy' | 'example' {
    if (context.previousExplanations === 0) return 'explain'
    if (context.userUnderstanding < 40) return 'analogy'
    return 'example'
  }

  // ── Quick helpers (keep same public API as before) ─────────────────────────

  async explainText(userId: string, text: string, sectionId: string, sectionText: string, dsAtTrigger = 0): Promise<string> {
    const request: ExplanationRequest = {
      requestId: `req-${Date.now()}`,
      userId,
      content: text,
      sectionId,
      sectionText,
      requestType: 'explain',
      userLevel: this.getUserLevel(userId),
      dsAtTrigger,
      timestamp: Date.now(),
    }
    const response = await this.generateExplanation(request)
    return response.explanation
  }

  async getAnalogy(userId: string, concept: string, sectionId: string, sectionText: string, dsAtTrigger = 0): Promise<string> {
    const request: ExplanationRequest = {
      requestId: `req-${Date.now()}`,
      userId,
      content: concept,
      sectionId,
      sectionText,
      requestType: 'analogy',
      userLevel: this.getUserLevel(userId),
      dsAtTrigger,
      timestamp: Date.now(),
    }
    const response = await this.generateExplanation(request)
    return response.explanation
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  getExplanationHistory(userId: string): ExplanationResponse[] {
    return this.explanationHistory.get(userId) || []
  }

  getRecentExplanations(userId: string, count = 5): ExplanationResponse[] {
    return (this.explanationHistory.get(userId) || []).slice(-count)
  }

  getTotalExplanations(userId: string): number {
    return this.explanationHistory.get(userId)?.length || 0
  }

  getExplanationStats() {
    const totalUsers = this.explanationHistory.size
    const totalExplanations = Array.from(this.explanationHistory.values())
      .reduce((sum, arr) => sum + arr.length, 0)
    return {
      totalUsers,
      totalExplanations,
      avgExplanationsPerUser: totalUsers > 0 ? Math.round(totalExplanations / totalUsers) : 0,
    }
  }

  trackExplanationHelpfulness(requestId: string, helpful: boolean) {
    console.log(`🤖 [A6] Explanation ${requestId} marked ${helpful ? 'helpful' : 'not helpful'}`)
    this.emitEvent('helpfulness-rated', { requestId, helpful })
  }

  // ── Event bus ──────────────────────────────────────────────────────────────

  private emitEvent(eventType: string, data: unknown) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`agent6:${eventType}`, { detail: data }))
    }
  }
}

export const agent6_contentComprehension = new Agent6_ContentComprehension()
export type { Agent6_ContentComprehension }
