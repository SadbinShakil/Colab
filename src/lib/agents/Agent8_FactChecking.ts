'use client'

/**
 * AGENT 8: Fact Checking
 *
 * Role: Verifies claims made in the document and discussions against AI knowledge.
 *
 * Responsibilities:
 * - Extract claims from highlighted text
 * - Verify validity via the /api/fact-check endpoint
 * - Flag potential inaccuracies to the user
 * - Store results to avoid duplicate checks
 */

export interface FactCheckResult {
  claim: string
  verdict: 'supported' | 'refuted' | 'uncertain' | 'context-dependent'
  confidence: number
  explanation: string
  caveats?: string
  timestamp: number
}

class Agent8_FactChecking {
  private agentId = 'agent-8-fact-checking'
  private isActive = false
  private resultCache: Map<string, FactCheckResult> = new Map()
  private pendingChecks: Set<string> = new Set()

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 8] Fact Checking activated')
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 8] Fact Checking deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Fact Checking',
      active: this.isActive,
      type: 'on-demand',
      description: 'Verifies claims and flags inaccuracies using AI',
      cachedResults: this.resultCache.size
    }
  }

  /**
   * Checks a claim via the AI fact-check API.
   * Returns cached result immediately if available.
   * Emits agent8:fact-check-complete event when done.
   */
  async checkClaim(
    claim: string,
    documentContext?: string,
    documentTitle?: string
  ): Promise<FactCheckResult | null> {
    if (!this.isActive) return null

    // Return cached result if available
    const cached = this.resultCache.get(claim)
    if (cached) return cached

    // Prevent duplicate in-flight requests for same claim
    if (this.pendingChecks.has(claim)) return null
    this.pendingChecks.add(claim)

    try {
      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, documentContext, documentTitle })
      })

      if (!response.ok) {
        console.error('[Agent 8] Fact-check API error:', response.status)
        return null
      }

      const data = await response.json()

      const result: FactCheckResult = {
        claim,
        verdict: data.verdict || 'uncertain',
        confidence: data.confidence ?? 0.5,
        explanation: data.explanation || 'No explanation provided',
        caveats: data.caveats,
        timestamp: Date.now()
      }

      // Cache the result
      this.resultCache.set(claim, result)

      // Emit event for the UI to consume
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agent8:fact-check-complete', {
          detail: result
        }))
      }

      console.log(`✅ [Agent 8] Fact check complete — "${claim.substring(0, 60)}": ${result.verdict} (${(result.confidence * 100).toFixed(0)}% confidence)`)
      return result

    } catch (error) {
      console.error('[Agent 8] Fact-check failed:', error)
      return null
    } finally {
      this.pendingChecks.delete(claim)
    }
  }

  /**
   * Returns all cached fact-check results
   */
  getCachedResults(): FactCheckResult[] {
    return Array.from(this.resultCache.values())
  }

  /**
   * Returns results for claims that were refuted or uncertain
   */
  getFlaggedClaims(): FactCheckResult[] {
    return Array.from(this.resultCache.values()).filter(
      r => r.verdict === 'refuted' || (r.verdict === 'uncertain' && r.confidence < 0.4)
    )
  }

  clearCache() {
    this.resultCache.clear()
  }
}

export const agent8_factChecking = new Agent8_FactChecking()
