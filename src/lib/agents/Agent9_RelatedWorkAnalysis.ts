'use client'

/**
 * AGENT 9: Related Work Analysis
 *
 * Role: Analyzes the current section and finds real related/prior work
 * that the reader should know about, using the /api/related-work endpoint.
 *
 * Activation: Triggered when user highlights text or requests related papers
 * for a section.
 */

export interface RelatedPaper {
  title: string
  authors: string[]
  year: string
  venue: string
  relevance: 'highly-relevant' | 'relevant' | 'background'
  relationship: 'builds-upon' | 'contrasts-with' | 'validates' | 'alternative-approach' | 'foundational'
  summary: string
}

export interface RelatedWorkResult {
  relatedPapers: RelatedPaper[]
  keyThemes: string[]
  researchGap: string
  sectionId: string
  timestamp: number
}

class Agent9_RelatedWorkAnalysis {
  private agentId = 'agent-9-related-work'
  private isActive = false
  private resultCache: Map<string, RelatedWorkResult> = new Map()
  private pendingAnalyses: Set<string> = new Set()

  // Document context — set once when document loads
  private documentTitle: string = ''
  private documentAuthors: string = ''
  private documentAbstract: string = ''

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 9] Related Work Analysis activated')
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 9] Related Work Analysis deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Related Work Analysis',
      active: this.isActive,
      type: 'on-demand',
      description: 'Finds real related papers for the current section using AI',
      cachedSections: this.resultCache.size
    }
  }

  /**
   * Set document metadata so analysis is more precise
   */
  setDocumentContext(title: string, authors: string, abstract: string) {
    this.documentTitle = title
    this.documentAuthors = authors
    this.documentAbstract = abstract
    console.log(`📄 [Agent 9] Document context set: "${title}"`)
  }

  /**
   * Analyze a section for related work.
   * Emits agent9:related-work-found event when complete.
   */
  async analyzeSection(
    sectionId: string,
    sectionContent: string
  ): Promise<RelatedWorkResult | null> {
    if (!this.isActive) return null
    if (sectionContent.length < 100) return null

    // Return cached result if available
    const cached = this.resultCache.get(sectionId)
    if (cached) return cached

    // Prevent duplicate in-flight requests
    if (this.pendingAnalyses.has(sectionId)) return null
    this.pendingAnalyses.add(sectionId)

    console.log(`🔍 [Agent 9] Analyzing section "${sectionId}" for related work...`)

    try {
      const response = await fetch('/api/related-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionContent,
          documentTitle: this.documentTitle,
          documentAuthors: this.documentAuthors,
          documentAbstract: this.documentAbstract
        })
      })

      if (!response.ok) {
        console.error('[Agent 9] Related work API error:', response.status)
        return null
      }

      const data = await response.json()

      const result: RelatedWorkResult = {
        relatedPapers: data.relatedPapers || [],
        keyThemes: data.keyThemes || [],
        researchGap: data.researchGap || '',
        sectionId,
        timestamp: Date.now()
      }

      this.resultCache.set(sectionId, result)

      // Emit event for UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agent9:related-work-found', {
          detail: result
        }))
      }

      console.log(`✅ [Agent 9] Found ${result.relatedPapers.length} related papers for section "${sectionId}"`)
      return result

    } catch (error) {
      console.error('[Agent 9] Related work analysis failed:', error)
      return null
    } finally {
      this.pendingAnalyses.delete(sectionId)
    }
  }

  /**
   * Returns cached related work for a section
   */
  getRelatedWork(sectionId: string): RelatedWorkResult | null {
    return this.resultCache.get(sectionId) || null
  }

  /**
   * Returns all analyzed sections
   */
  getAllResults(): RelatedWorkResult[] {
    return Array.from(this.resultCache.values())
  }

  /**
   * Legacy compatibility: synchronous stub for direct calls
   * Use analyzeSection() for real results
   */
  findRelatedAndComparison(sectionContent: string): RelatedPaper[] {
    const cached = Array.from(this.resultCache.values())
    if (cached.length > 0) {
      return cached[cached.length - 1].relatedPapers
    }
    return []
  }
}

export const agent9_relatedWorkAnalysis = new Agent9_RelatedWorkAnalysis()
