import { WikiEntry, InsightEntry } from '@/components/CollectiveWikiPanel'

// Validates if a message looks like a definition or insight
export function analyzeChatMessage(
    message: string,
    userId: string,
    userName: string
): { type: 'definition' | 'insight' | null; data?: any } {
    // 1. Definition Patterns (Regex Heuristics)
    // "X is Y", "X means Y", "X = Y"
    const definitionPatterns = [
        /([A-Za-z0-9\s]+)\s+is\s+defined\s+as\s+([^.]+)/i,
        /([A-Za-z0-9\s]+)\s+means\s+([^.]+)/i,
        /([A-Za-z0-9\s]+)\s*=\s*([^.]+)/
    ]

    for (const pattern of definitionPatterns) {
        const match = message.match(pattern)
        if (match && match[1].length < 30 && match[2].length > 5) {
            // Filter out common false positives (e.g., "It is...")
            const term = match[1].trim()
            if (['it', 'this', 'that', 'there', 'here'].includes(term.toLowerCase())) continue

            return {
                type: 'definition',
                data: {
                    id: `def-${Date.now()}`,
                    term: term,
                    definition: match[2].trim(),
                    source: 'chat',
                    verifiedBy: [],
                    confidence: 0.7,
                    timestamp: Date.now(),
                    context: message
                } as WikiEntry
            }
        }
    }

    // 2. Insight Patterns
    // "I realized that...", "Key takeaway is...", "Important note:"
    const insightPatterns = [
        /I\s+realized\s+that\s+([^.]+)/i,
        /key\s+takeaway\s+is\s+([^.]+)/i,
        /important\s+note\s*:?\s+([^.]+)/i,
        /basically\s*,?\s+([^.]+)/i
    ]

    for (const pattern of insightPatterns) {
        const match = message.match(pattern)
        if (match && match[1].length > 10) {
            return {
                type: 'insight',
                data: {
                    id: `ins-${Date.now()}`,
                    content: match[1].trim(),
                    authorName: userName,
                    likes: 0,
                    tags: ['discussion'], // Placeholder tags
                    timestamp: Date.now()
                } as InsightEntry
            }
        }
    }

    return { type: null }
}
