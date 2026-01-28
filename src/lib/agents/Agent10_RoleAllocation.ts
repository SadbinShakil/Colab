// lib/agents/Agent10_RoleAllocation.ts
'use client'

import type { PDFSection } from '../pdfHeadingExtractor'

/**
 * AGENT 10: Role Allocation
 * 
 * Role: Assigns reading experts based on initial reflection analysis
 * 
 * Responsibilities:
 * - Analyze user reflections against PDF structure
 * - Detect "Cognitive Gaps" in the team
 * - Auto-assign roles for optimal coverage
 * - Assign AI to unassigned or complex sections
 */

export interface RoleAssignment {
    sectionId: string
    sectionName: string
    userId: string
    userName: string
    isAI: boolean
    confidence: number
    reason: string
}

class Agent10_RoleAllocation {
    private agentId = 'agent-10-role-allocation'
    private isActive = false

    activate() {
        this.isActive = true
        console.log('🤖 [Agent 10] Role Allocation Agent activated')
    }

    deactivate() {
        this.isActive = false
    }

    getStatus() {
        return {
            agentId: this.agentId,
            name: 'Role Allocation',
            active: this.isActive,
            description: 'Assigns reading experts based on reflections'
        }
    }

    /**
     * Performs "Smart Assignment" of roles based on reflections
     */
    allocateRoles(
        sections: PDFSection[],
        reflections: Map<string, { type: string; content: string; userName: string }>,
        currentUserId: string,
        currentUserName: string
    ): RoleAssignment[] {
        console.log('🧠 [Agent 10] Starting Smart Role Allocation...')

        const assignments: RoleAssignment[] = []
        const allUsers = Array.from(reflections.entries()).map(([id, data]) => ({
            id,
            name: data.userName,
            content: data.content.toLowerCase()
        }))

        // Add current user if not in reflections (usually is, but let's be safe)
        if (!reflections.has(currentUserId)) {
            // If current user hasn't submitted yet or isn't in collaborator reflections map
            // but they should be for the local agent to work
        }

        sections.forEach(section => {
            const sectionText = section.heading.text.toLowerCase()
            let bestMatchUserId: string | null = null
            let highestScore = 0
            let matchReason = ''

            // Analysis Loop: Match users to sections
            allUsers.forEach(user => {
                let score = 0
                const keywords = this.extractKeywords(sectionText)

                keywords.forEach(kw => {
                    if (user.content.includes(kw)) score += 25
                })

                // Bonus for "Abstract" and "Introduction" for everyone
                if (sectionText.includes('abstract') || sectionText.includes('introduction')) {
                    score += 10
                }

                if (score > highestScore) {
                    highestScore = score
                    bestMatchUserId = user.id
                    matchReason = `Keyword match found in ${user.name}'s reflection`
                }
            })

            // Role Assignment Decision
            if (bestMatchUserId && highestScore >= 25) {
                assignments.push({
                    sectionId: section.heading.id,
                    sectionName: section.heading.text,
                    userId: bestMatchUserId,
                    userName: reflections.get(bestMatchUserId)?.userName || 'Unknown',
                    isAI: false,
                    confidence: highestScore,
                    reason: matchReason
                })
            } else {
                // 🚨 COGNITIVE GAP DETECTED: No human expert
                // Assign AI to fill the gap
                assignments.push({
                    sectionId: section.heading.id,
                    sectionName: section.heading.text,
                    userId: 'lit-sense-ai',
                    userName: 'LitSense AI Auditor',
                    isAI: true,
                    confidence: 100,
                    reason: 'No user indicated prior expertise in this section; AI auditor assigned to ensure comprehension.'
                })
            }
        })

        console.log(`✅ [Agent 10] Allocated ${assignments.length} roles. AI covering ${assignments.filter(a => a.isAI).length} gaps.`)
        return assignments
    }

    private extractKeywords(text: string): string[] {
        const common = ['the', 'and', 'a', 'of', 'to', 'in', 'is', 'for']
        return text.split(/\s+/).filter(word => word.length > 3 && !common.includes(word))
    }
}

export const agent10_roleAllocation = new Agent10_RoleAllocation()
