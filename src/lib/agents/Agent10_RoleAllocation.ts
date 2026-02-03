// lib/agents/Agent10_RoleAllocation.ts
'use client'

import type { PDFSection } from '../pdfHeadingExtractor'

/**
 * AGENT 10: Smart Role Allocation
 * 
 * Role: Intelligently assigns reading experts based on deep reflection analysis
 * 
 * Responsibilities:
 * - Advanced NLP-style analysis of user reflections
 * - Detect expertise levels, interests, and learning goals
 * - Match users to sections based on knowledge gaps and strengths
 * - Assign AI to sections where no one has interest/expertise
 * - Balance workload across team members
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

interface UserProfile {
    id: string
    name: string
    content: string
    expertise: string[]
    interests: string[]
    goals: string[]
    knowledgeLevel: 'beginner' | 'intermediate' | 'advanced'
    preferredTopics: string[]
}

class Agent10_RoleAllocation {
    private agentId = 'agent-10-role-allocation'
    private isActive = false

    // Enhanced keyword dictionaries for better matching
    private expertiseIndicators = [
        'experience', 'worked', 'familiar', 'know', 'understand', 'studied',
        'research', 'background', 'expertise', 'proficient', 'skilled',
        'developed', 'implemented', 'published', 'thesis', 'dissertation'
    ]

    private interestIndicators = [
        'interested', 'curious', 'want', 'would like', 'excited', 'eager',
        'looking forward', 'hope', 'wish', 'intrigued', 'fascinated',
        'passionate', 'love', 'enjoy', 'keen'
    ]

    private goalIndicators = [
        'learn', 'understand', 'improve', 'develop', 'master', 'explore',
        'discover', 'find out', 'figure out', 'get better', 'enhance',
        'strengthen', 'build', 'acquire', 'gain'
    ]

    private beginnerPhrases = [
        'new to', 'never', 'don\'t know', 'unfamiliar', 'beginner',
        'just starting', 'no experience', 'first time', 'learning'
    ]

    private advancedPhrases = [
        'expert', 'advanced', 'deep understanding', 'extensive experience',
        'years of', 'specialized', 'mastered', 'proficient'
    ]

    activate() {
        this.isActive = true
        console.log('🤖 [Agent 10] Smart Role Allocation Agent activated')
    }

    deactivate() {
        this.isActive = false
    }

    getStatus() {
        return {
            agentId: this.agentId,
            name: 'Smart Role Allocation',
            active: this.isActive,
            description: 'Intelligently assigns reading experts based on deep reflection analysis'
        }
    }

    /**
     * Performs advanced reflection analysis to build user profiles
     */
    private analyzeReflection(userId: string, userName: string, content: string): UserProfile {
        const lowerContent = content.toLowerCase()
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)

        const profile: UserProfile = {
            id: userId,
            name: userName,
            content: lowerContent,
            expertise: [],
            interests: [],
            goals: [],
            knowledgeLevel: 'intermediate',
            preferredTopics: []
        }

        // Extract expertise areas
        this.expertiseIndicators.forEach(indicator => {
            sentences.forEach(sentence => {
                const lowerSentence = sentence.toLowerCase()
                if (lowerSentence.includes(indicator)) {
                    // Extract the topic mentioned with the expertise indicator
                    const topics = this.extractTopics(sentence)
                    profile.expertise.push(...topics)
                }
            })
        })

        // Extract interests
        this.interestIndicators.forEach(indicator => {
            sentences.forEach(sentence => {
                const lowerSentence = sentence.toLowerCase()
                if (lowerSentence.includes(indicator)) {
                    const topics = this.extractTopics(sentence)
                    profile.interests.push(...topics)
                }
            })
        })

        // Extract learning goals
        this.goalIndicators.forEach(indicator => {
            sentences.forEach(sentence => {
                const lowerSentence = sentence.toLowerCase()
                if (lowerSentence.includes(indicator)) {
                    const topics = this.extractTopics(sentence)
                    profile.goals.push(...topics)
                }
            })
        })

        // Determine knowledge level
        const hasBeginnerPhrases = this.beginnerPhrases.some(phrase => lowerContent.includes(phrase))
        const hasAdvancedPhrases = this.advancedPhrases.some(phrase => lowerContent.includes(phrase))

        if (hasAdvancedPhrases) {
            profile.knowledgeLevel = 'advanced'
        } else if (hasBeginnerPhrases) {
            profile.knowledgeLevel = 'beginner'
        }

        // Combine all topics
        profile.preferredTopics = [
            ...new Set([...profile.expertise, ...profile.interests, ...profile.goals])
        ]

        console.log(`👤 [Agent 10] Profile for ${userName}:`, {
            expertise: profile.expertise.slice(0, 3),
            interests: profile.interests.slice(0, 3),
            goals: profile.goals.slice(0, 3),
            level: profile.knowledgeLevel
        })

        return profile
    }

    /**
     * Extract meaningful topics from a sentence
     */
    private extractTopics(sentence: string): string[] {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him',
            'them', 'us', 'am', 'very', 'about', 'how', 'what', 'when', 'where'
        ])

        const words = sentence
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(word =>
                word.length > 3 &&
                !stopWords.has(word) &&
                !/^\d+$/.test(word)
            )

        // Extract multi-word phrases (bigrams)
        const phrases: string[] = []
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`
            if (this.isRelevantPhrase(bigram)) {
                phrases.push(bigram)
            }
        }

        return [...words, ...phrases].slice(0, 5)
    }

    /**
     * Check if a phrase is relevant (contains technical/academic terms)
     */
    private isRelevantPhrase(phrase: string): boolean {
        const technicalTerms = [
            'machine learning', 'data science', 'neural network', 'deep learning',
            'natural language', 'computer vision', 'eye tracking', 'gaze tracking',
            'user interface', 'human computer', 'collaborative reading', 'ai agent',
            'information retrieval', 'knowledge graph', 'semantic analysis',
            'cognitive load', 'reading comprehension', 'text mining', 'data visualization'
        ]
        return technicalTerms.some(term => phrase.includes(term))
    }

    /**
     * Calculate match score between user profile and section
     */
    private calculateMatchScore(profile: UserProfile, section: PDFSection): {
        score: number
        reason: string
        category: 'expertise' | 'interest' | 'goal' | 'none'
    } {
        const sectionText = section.heading.text.toLowerCase()
        const sectionKeywords = this.extractKeywords(sectionText)

        let expertiseScore = 0
        let interestScore = 0
        let goalScore = 0
        let matchedTerms: string[] = []

        // Check expertise match (highest priority)
        profile.expertise.forEach(exp => {
            if (sectionKeywords.some(kw => exp.includes(kw) || kw.includes(exp))) {
                expertiseScore += 50
                matchedTerms.push(exp)
            }
        })

        // Check interest match (medium priority)
        profile.interests.forEach(interest => {
            if (sectionKeywords.some(kw => interest.includes(kw) || kw.includes(interest))) {
                interestScore += 35
                matchedTerms.push(interest)
            }
        })

        // Check goal match (learning opportunity - lower priority)
        profile.goals.forEach(goal => {
            if (sectionKeywords.some(kw => goal.includes(kw) || kw.includes(goal))) {
                goalScore += 20
                matchedTerms.push(goal)
            }
        })

        // Bonus for knowledge level alignment
        let levelBonus = 0
        if (sectionText.includes('introduction') || sectionText.includes('background')) {
            levelBonus = profile.knowledgeLevel === 'beginner' ? 15 : 5
        } else if (sectionText.includes('method') || sectionText.includes('result')) {
            levelBonus = profile.knowledgeLevel === 'advanced' ? 15 :
                profile.knowledgeLevel === 'intermediate' ? 10 : 0
        }

        const totalScore = expertiseScore + interestScore + goalScore + levelBonus
        let category: 'expertise' | 'interest' | 'goal' | 'none' = 'none'
        let reason = ''

        if (expertiseScore > 0) {
            category = 'expertise'
            reason = `${profile.name} has expertise in: ${matchedTerms.slice(0, 2).join(', ')}`
        } else if (interestScore > 0) {
            category = 'interest'
            reason = `${profile.name} expressed interest in: ${matchedTerms.slice(0, 2).join(', ')}`
        } else if (goalScore > 0) {
            category = 'goal'
            reason = `${profile.name} wants to learn about: ${matchedTerms.slice(0, 2).join(', ')}`
        }

        return { score: totalScore, reason, category }
    }

    /**
     * Performs "Smart Assignment" of roles based on deep reflection analysis
     */
    allocateRoles(
        sections: PDFSection[],
        reflections: Map<string, { type: string; content: string; userName: string }>,
        currentUserId: string,
        currentUserName: string
    ): RoleAssignment[] {
        console.log('🧠 [Agent 10] Starting Advanced Smart Role Allocation...')
        console.log(`📊 Analyzing ${reflections.size} user reflections across ${sections.length} sections`)

        const assignments: RoleAssignment[] = []

        // Build user profiles from reflections
        const userProfiles: UserProfile[] = Array.from(reflections.entries()).map(([id, data]) =>
            this.analyzeReflection(id, data.userName, data.content)
        )

        console.log(`👥 Built ${userProfiles.length} user profiles`)

        // Track assignments per user for workload balancing
        const userWorkload = new Map<string, number>()
        userProfiles.forEach(profile => userWorkload.set(profile.id, 0))

        // Assign sections
        sections.forEach(section => {
            let bestMatch: {
                userId: string
                userName: string
                score: number
                reason: string
                category: string
            } | null = null

            // Find best matching user for this section
            userProfiles.forEach(profile => {
                const match = this.calculateMatchScore(profile, section)

                // Apply workload balancing penalty
                const currentWorkload = userWorkload.get(profile.id) || 0
                const workloadPenalty = currentWorkload * 5 // Reduce score by 5 per existing assignment
                const adjustedScore = Math.max(0, match.score - workloadPenalty)

                if (adjustedScore > 0 && (!bestMatch || adjustedScore > bestMatch.score)) {
                    bestMatch = {
                        userId: profile.id,
                        userName: profile.name,
                        score: adjustedScore,
                        reason: match.reason,
                        category: match.category
                    }
                }
            })

            // Make assignment decision
            if (bestMatch && bestMatch.score >= 20) {
                // Assign to human expert
                assignments.push({
                    sectionId: section.heading.id,
                    sectionName: section.heading.text,
                    userId: bestMatch.userId,
                    userName: bestMatch.userName,
                    isAI: false,
                    confidence: Math.min(100, bestMatch.score),
                    reason: bestMatch.reason
                })

                // Update workload
                userWorkload.set(bestMatch.userId, (userWorkload.get(bestMatch.userId) || 0) + 1)

                console.log(`✅ Assigned "${section.heading.text}" to ${bestMatch.userName} (${bestMatch.category}, score: ${bestMatch.score})`)
            } else {
                // 🤖 COGNITIVE GAP DETECTED: Assign AI
                const aiReason = bestMatch
                    ? `Low confidence match (score: ${bestMatch.score}). AI will provide comprehensive coverage.`
                    : `No team member indicated expertise or interest in this topic. AI auditor will ensure comprehension.`

                assignments.push({
                    sectionId: section.heading.id,
                    sectionName: section.heading.text,
                    userId: 'lit-sense-ai',
                    userName: 'LitSense AI Auditor',
                    isAI: true,
                    confidence: 100,
                    reason: aiReason
                })

                console.log(`🤖 Assigned "${section.heading.text}" to AI (${aiReason})`)
            }
        })

        // Summary statistics
        const humanAssignments = assignments.filter(a => !a.isAI)
        const aiAssignments = assignments.filter(a => a.isAI)
        const avgConfidence = humanAssignments.reduce((sum, a) => sum + a.confidence, 0) / (humanAssignments.length || 1)

        console.log(`\n📊 [Agent 10] Allocation Summary:`)
        console.log(`   Total Sections: ${assignments.length}`)
        console.log(`   Human Assigned: ${humanAssignments.length} (avg confidence: ${avgConfidence.toFixed(1)}%)`)
        console.log(`   AI Assigned: ${aiAssignments.length} (covering knowledge gaps)`)

        // Log workload distribution
        console.log(`\n👥 Workload Distribution:`)
        userProfiles.forEach(profile => {
            const count = userWorkload.get(profile.id) || 0
            console.log(`   ${profile.name}: ${count} sections`)
        })

        return assignments
    }

    /**
     * Extract keywords from text (improved version)
     */
    private extractKeywords(text: string): string[] {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'
        ])

        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word))
    }
}

export const agent10_roleAllocation = new Agent10_RoleAllocation()
