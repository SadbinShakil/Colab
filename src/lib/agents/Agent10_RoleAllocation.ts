// lib/agents/Agent10_RoleAllocation.ts

import type { PDFSection } from '../pdfHeadingExtractor'

/**
 * AGENT 10: Role Allocation (A10)
 *
 * Assigns each paper section to the participant best positioned to read it
 * critically, based on semantic analysis of their pre-session reflection.
 *
 * Sections with no matching participant are assigned to CoRead AI, which
 * pre-generates a brief (main argument + critical questions + a watchout)
 * so the section is never a blind spot in the reading session.
 *
 * This replaces the previous keyword-matching approach. The allocation is
 * now performed by GPT-4o via /api/role-allocation, which reasons over the
 * full reflection text and section content — not just title word overlap.
 *
 * Trigger: Session start (Phase I → Phase II transition)
 * Output: RoleAssignment[] logged to Firebase interventions/
 */

export interface RoleAssignment {
  sectionId: string
  sectionName: string
  userId: string
  userName: string
  isAI: boolean
  confidence: number           // 0–100 for display; mapped from 'high'|'medium'|'low'
  confidenceLabel: 'high' | 'medium' | 'low'
  rationale: string            // specific to the reflection — not generic
  inferredAngle: string        // reading stance this person brings
  /** Only present for AI-assigned sections */
  aiBrief?: {
    mainArgument: string
    criticalQuestions: string[]
    watchOut: string
  }
}

class Agent10_RoleAllocation {
  private agentId = 'A10'
  private isActive = false

  activate() {
    this.isActive = true
    console.log('[A10] Role Allocation Agent activated')
  }

  deactivate() {
    this.isActive = false
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Role Allocation',
      active: this.isActive,
      description: 'Assigns sections to participants based on semantic reflection analysis; AI covers gaps',
    }
  }

  /**
   * Main entry point — called by SectionAssignmentPanel.
   *
   * Calls /api/role-allocation with structured reflection + section data.
   * Returns RoleAssignment[] with per-section rationale and AI briefs where needed.
   */
  async allocateRoles(
    sections: PDFSection[],
    reflections: Map<string, { type: string; content: string; userName: string }>,
    paperTitle?: string
  ): Promise<RoleAssignment[]> {
    if (reflections.size === 0) {
      console.warn('[A10] No reflections available — skipping allocation')
      return []
    }

    const reflectionEntries = Array.from(reflections.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      content: data.content,
    }))

    const sectionEntries = sections.map(s => ({
      id: s.heading.id,
      name: s.heading.text,
      // Use the first ~400 chars of body text for semantic grounding, not just the title
      preview: (s.content ?? '').slice(0, 400),
    }))

    console.log(`[A10] Requesting allocation: ${reflectionEntries.length} participants × ${sectionEntries.length} sections`)

    const res = await fetch('/api/role-allocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reflections: reflectionEntries,
        sections: sectionEntries,
        paperTitle,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[A10] API error:', err)
      throw new Error('Role allocation API returned ' + res.status)
    }

    const data = await res.json()
    const apiAssignments = data.assignments ?? []

    const CONFIDENCE_MAP: Record<string, number> = { high: 92, medium: 68, low: 40 }

    const assignments: RoleAssignment[] = apiAssignments.map((a: {
      sectionId: string
      sectionName: string
      assignedTo: string
      assignedName: string
      rationale: string
      inferredAngle: string
      confidence: string
      aiBrief?: { mainArgument: string; criticalQuestions: string[]; watchOut: string } | null
    }) => ({
      sectionId: a.sectionId,
      sectionName: a.sectionName,
      userId: a.assignedTo,
      userName: a.assignedName,
      isAI: a.assignedTo === 'ai',
      confidence: CONFIDENCE_MAP[a.confidence] ?? 60,
      confidenceLabel: a.confidence as 'high' | 'medium' | 'low',
      rationale: a.rationale,
      inferredAngle: a.inferredAngle,
      aiBrief: a.aiBrief ?? undefined,
    }))

    const human = assignments.filter(a => !a.isAI)
    const ai = assignments.filter(a => a.isAI)
    console.log(`[A10] Allocation complete: ${human.length} human, ${ai.length} AI-covered`)

    return assignments
  }
}

export const agent10_roleAllocation = new Agent10_RoleAllocation()
