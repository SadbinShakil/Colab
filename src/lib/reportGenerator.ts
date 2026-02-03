// lib/reportGenerator.ts
'use client'

import { interactionCollector, type InteractionSession, type SectionInteraction } from './interactionCollector'


/**
 * Comprehensive Session Report Generator
 * 
 * Analyzes ALL real data from the session:
 * - User reflections
 * - Reading patterns (gaze, highlights, time spent)
 * - Confusion points and struggle zones
 * - AI interactions and help provided
 * - Collaboration metrics
 * - Section assignments and completion
 */

export interface ComprehensiveReport {
    // Session Metadata
    sessionId: string
    documentId: string
    userId: string
    userName: string
    startTime: number
    endTime: number
    duration: number // in minutes

    // User Profile
    userProfile: {
        reflection: {
            type: 'text' | 'audio' | 'file'
            content: string
            expertise: string[]
            interests: string[]
            goals: string[]
            knowledgeLevel: 'beginner' | 'intermediate' | 'advanced'
        } | null
        assignedSections: number
        completedSections: number
    }

    // Reading Analytics
    readingAnalytics: {
        totalTimeSpent: number // minutes
        averageFixationDuration: number // ms
        totalFixations: number
        readingSpeed: number // words per minute (estimated)
        focusScore: number // 0-100
        engagementLevel: 'low' | 'medium' | 'high'

        // Section-wise breakdown
        sectionMetrics: {
            sectionId: string
            sectionName: string
            timeSpent: number // seconds
            visitCount: number
            fixationCount: number
            avgFixationDuration: number
            completed: boolean
        }[]
    }

    // Struggle & Confusion Analysis
    struggleAnalysis: {
        totalStruggleEvents: number
        struggleSections: {
            sectionId: string
            sectionName: string
            severity: 'low' | 'medium' | 'high'
            indicators: {
                confusionHighlights: number
                stuckMarkers: number
                revisitCount: number
                timeSpent: number
            }
            aiHelpProvided: boolean
            resolved: boolean
        }[]

        confusionPoints: {
            text: string
            section: string
            timestamp: number
            resolved: boolean
        }[]
    }

    // Understanding & Mastery
    understanding: {
        understoodHighlights: number
        insightfulHighlights: number
        questionsAsked: number
        questionsAnswered: number

        masteredConcepts: string[]
        partiallyUnderstood: string[]
        needsReview: string[]

        understandingScore: number // 0-100
    }

    // AI Assistance
    aiAssistance: {
        totalInteractions: number
        helpRequests: number
        implicitHelp: number
        explicitHelp: number

        agentActivations: {
            agentId: string
            agentName: string
            activationCount: number
            helpfulnessRating: number
        }[]

        keyInsights: string[]
        summariesGenerated: number
    }

    // Collaboration Metrics
    collaboration: {
        peersInteracted: number
        messagesExchanged: number
        annotationsShared: number
        sectionsCollaborated: string[]

        teamSynergy: number // 0-100
        contributionLevel: 'observer' | 'participant' | 'leader'
    }

    // Key Achievements
    achievements: {
        breakthroughs: {
            concept: string
            timestamp: number
            confidence: number
        }[]

        milestones: {
            type: 'first_section' | 'half_complete' | 'all_complete' | 'expert_level'
            timestamp: number
            description: string
        }[]
    }

    // Recommendations
    recommendations: {
        sectionsToReview: string[]
        conceptsToReinforce: string[]
        nextSteps: string[]
        strengthAreas: string[]
        improvementAreas: string[]
    }
}

class ReportGenerator {
    /**
     * Generate comprehensive session report from real data
     */
    generateReport(
        sessionData: SessionData,
        reflection: { type: string; content: string } | null,
        assignments: any[],
        collaborationData: any
    ): ComprehensiveReport {
        const now = Date.now()
        const duration = sessionData.endTime
            ? (sessionData.endTime - sessionData.startTime) / 60000
            : (now - sessionData.startTime) / 60000

        return {
            // Session Metadata
            sessionId: sessionData.sessionId,
            documentId: sessionData.documentId,
            userId: sessionData.userId,
            userName: sessionData.userName,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime || now,
            duration: Math.round(duration),

            // User Profile
            userProfile: this.analyzeUserProfile(reflection, assignments),

            // Reading Analytics
            readingAnalytics: this.analyzeReadingPatterns(sessionData),

            // Struggle Analysis
            struggleAnalysis: this.analyzeStruggle(sessionData),

            // Understanding
            understanding: this.analyzeUnderstanding(sessionData),

            // AI Assistance
            aiAssistance: this.analyzeAIAssistance(sessionData),

            // Collaboration
            collaboration: this.analyzeCollaboration(sessionData, collaborationData),

            // Achievements
            achievements: this.identifyAchievements(sessionData),

            // Recommendations
            recommendations: this.generateRecommendations(sessionData)
        }
    }

    private analyzeUserProfile(reflection: any, assignments: any[]) {
        if (!reflection) {
            return {
                reflection: null,
                assignedSections: assignments.length,
                completedSections: assignments.filter(a => a.status === 'completed').length
            }
        }

        // Extract expertise, interests, goals from reflection
        const content = reflection.content.toLowerCase()
        const expertise = this.extractKeywords(content, ['experience', 'worked', 'familiar', 'know'])
        const interests = this.extractKeywords(content, ['interested', 'curious', 'want', 'excited'])
        const goals = this.extractKeywords(content, ['learn', 'understand', 'improve', 'master'])

        // Determine knowledge level
        let knowledgeLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
        if (content.includes('new to') || content.includes('beginner') || content.includes('never')) {
            knowledgeLevel = 'beginner'
        } else if (content.includes('expert') || content.includes('advanced') || content.includes('years of')) {
            knowledgeLevel = 'advanced'
        }

        return {
            reflection: {
                type: reflection.type,
                content: reflection.content,
                expertise,
                interests,
                goals,
                knowledgeLevel
            },
            assignedSections: assignments.length,
            completedSections: assignments.filter(a => a.status === 'completed').length
        }
    }

    private analyzeReadingPatterns(sessionData: SessionData) {
        const sections = Array.from(sessionData.sectionInteractions.values())

        // Calculate total metrics
        const totalTimeSpent = sections.reduce((sum, s) => sum + s.totalTimeSpent, 0) / 60000 // to minutes
        const totalFixations = sections.reduce((sum, s) => sum + s.fixationCount, 0)
        const avgFixationDuration = totalFixations > 0
            ? sections.reduce((sum, s) => sum + (s.avgFixationDuration || 0), 0) / sections.length
            : 0

        // Estimate reading speed (rough calculation)
        const estimatedWords = sections.length * 300 // assume 300 words per section
        const readingSpeed = totalTimeSpent > 0 ? Math.round(estimatedWords / totalTimeSpent) : 0

        // Calculate focus score
        const focusScore = this.calculateFocusScore(sections)

        // Determine engagement level
        let engagementLevel: 'low' | 'medium' | 'high' = 'medium'
        if (focusScore > 75) engagementLevel = 'high'
        else if (focusScore < 40) engagementLevel = 'low'

        // Section-wise metrics
        const sectionMetrics = sections.map(section => ({
            sectionId: section.sectionId,
            sectionName: section.sectionName,
            timeSpent: Math.round(section.totalTimeSpent / 1000),
            visitCount: section.visitCount,
            fixationCount: section.fixationCount,
            avgFixationDuration: Math.round(section.avgFixationDuration || 0),
            completed: section.completed || false
        }))

        return {
            totalTimeSpent: Math.round(totalTimeSpent),
            averageFixationDuration: Math.round(avgFixationDuration),
            totalFixations,
            readingSpeed,
            focusScore,
            engagementLevel,
            sectionMetrics
        }
    }

    private analyzeStruggle(sessionData: SessionData) {
        const sections = Array.from(sessionData.sectionInteractions.values())

        // Find struggle sections
        const struggleSections = sections
            .filter(s => s.struggleScore > 30)
            .map(s => {
                let severity: 'low' | 'medium' | 'high' = 'low'
                if (s.struggleScore > 70) severity = 'high'
                else if (s.struggleScore > 50) severity = 'medium'

                return {
                    sectionId: s.sectionId,
                    sectionName: s.sectionName,
                    severity,
                    indicators: {
                        confusionHighlights: s.confusionHighlights,
                        stuckMarkers: s.stuckMarkerCount,
                        revisitCount: s.visitCount - 1,
                        timeSpent: Math.round(s.totalTimeSpent / 1000)
                    },
                    aiHelpProvided: s.aiHelpReceived || false,
                    resolved: s.struggleScore < 50
                }
            })

        // Extract confusion points from highlights
        const confusionPoints = sessionData.highlights
            .filter(h => h.reason === 'confused')
            .map(h => ({
                text: h.text.substring(0, 100),
                section: h.sectionId || 'Unknown',
                timestamp: h.timestamp,
                resolved: false // Could be enhanced with resolution tracking
            }))

        return {
            totalStruggleEvents: struggleSections.length,
            struggleSections,
            confusionPoints
        }
    }

    private analyzeUnderstanding(sessionData: SessionData) {
        const sections = Array.from(sessionData.sectionInteractions.values())

        // Count highlights by type
        const understoodHighlights = sessionData.highlights.filter(h => h.reason === 'understood').length
        const insightfulHighlights = sessionData.highlights.filter(h => h.reason === 'insightful').length

        // Extract mastered concepts from understood highlights
        const masteredConcepts = sessionData.highlights
            .filter(h => h.reason === 'understood')
            .map(h => h.text.substring(0, 50))
            .slice(0, 5)

        // Sections with partial understanding
        const partiallyUnderstood = sections
            .filter(s => s.understoodHighlights > 0 && s.confusionHighlights > 0)
            .map(s => s.sectionName)

        // Sections needing review
        const needsReview = sections
            .filter(s => s.struggleScore > 60)
            .map(s => s.sectionName)

        // Calculate overall understanding score
        const understandingScore = this.calculateUnderstandingScore(sections, sessionData.highlights)

        return {
            understoodHighlights,
            insightfulHighlights,
            questionsAsked: sessionData.annotations.filter(a => a.content.includes('?')).length,
            questionsAnswered: 0, // Could be enhanced with answer tracking
            masteredConcepts,
            partiallyUnderstood,
            needsReview,
            understandingScore
        }
    }

    private analyzeAIAssistance(sessionData: SessionData) {
        // This would be enhanced with actual AI interaction tracking
        return {
            totalInteractions: 0,
            helpRequests: 0,
            implicitHelp: 0,
            explicitHelp: 0,
            agentActivations: [],
            keyInsights: [],
            summariesGenerated: 0
        }
    }

    private analyzeCollaboration(sessionData: SessionData, collaborationData: any) {
        return {
            peersInteracted: collaborationData?.peersInteracted || 0,
            messagesExchanged: collaborationData?.messagesExchanged || 0,
            annotationsShared: sessionData.annotations.length,
            sectionsCollaborated: [],
            teamSynergy: 0,
            contributionLevel: 'participant' as const
        }
    }

    private identifyAchievements(sessionData: SessionData) {
        const breakthroughs: any[] = []
        const milestones: any[] = []

        // Check for section completion milestones
        const sections = Array.from(sessionData.sectionInteractions.values())
        const completedCount = sections.filter(s => s.completed).length

        if (completedCount >= 1) {
            milestones.push({
                type: 'first_section',
                timestamp: Date.now(),
                description: 'Completed first section'
            })
        }

        if (completedCount >= sections.length / 2) {
            milestones.push({
                type: 'half_complete',
                timestamp: Date.now(),
                description: 'Completed half of assigned sections'
            })
        }

        if (completedCount === sections.length && sections.length > 0) {
            milestones.push({
                type: 'all_complete',
                timestamp: Date.now(),
                description: 'Completed all assigned sections'
            })
        }

        return { breakthroughs, milestones }
    }

    private generateRecommendations(sessionData: SessionData) {
        const sections = Array.from(sessionData.sectionInteractions.values())

        // Sections to review (high struggle)
        const sectionsToReview = sections
            .filter(s => s.struggleScore > 60)
            .map(s => s.sectionName)

        // Concepts to reinforce (partial understanding)
        const conceptsToReinforce = sections
            .filter(s => s.understoodHighlights > 0 && s.confusionHighlights > 0)
            .map(s => s.sectionName)

        // Strength areas (high understanding, low struggle)
        const strengthAreas = sections
            .filter(s => s.understandingScore > 70 && s.struggleScore < 30)
            .map(s => s.sectionName)

        // Improvement areas
        const improvementAreas = sections
            .filter(s => s.struggleScore > 50)
            .map(s => s.sectionName)

        return {
            sectionsToReview,
            conceptsToReinforce,
            nextSteps: [
                sectionsToReview.length > 0 ? `Review ${sectionsToReview.length} challenging sections` : 'Continue with current pace',
                'Discuss confusing concepts with peers',
                'Request AI assistance for complex topics'
            ],
            strengthAreas,
            improvementAreas
        }
    }

    // Helper methods
    private extractKeywords(text: string, indicators: string[]): string[] {
        const keywords: string[] = []
        const sentences = text.split(/[.!?]+/)

        indicators.forEach(indicator => {
            sentences.forEach(sentence => {
                if (sentence.toLowerCase().includes(indicator)) {
                    const words = sentence.split(/\s+/).filter(w => w.length > 4)
                    keywords.push(...words.slice(0, 3))
                }
            })
        })

        return [...new Set(keywords)].slice(0, 5)
    }

    private calculateFocusScore(sections: SectionInteraction[]): number {
        if (sections.length === 0) return 0

        const avgUnderstanding = sections.reduce((sum, s) => sum + s.understandingScore, 0) / sections.length
        const avgStruggle = sections.reduce((sum, s) => sum + s.struggleScore, 0) / sections.length

        // Focus score = understanding - (struggle / 2)
        return Math.max(0, Math.min(100, avgUnderstanding - (avgStruggle / 2)))
    }

    private calculateUnderstandingScore(sections: SectionInteraction[], highlights: any[]): number {
        if (sections.length === 0) return 0

        const understoodCount = highlights.filter(h => h.reason === 'understood').length
        const confusedCount = highlights.filter(h => h.reason === 'confused').length
        const total = understoodCount + confusedCount

        if (total === 0) return 50 // neutral

        return Math.round((understoodCount / total) * 100)
    }
}

export const reportGenerator = new ReportGenerator()
