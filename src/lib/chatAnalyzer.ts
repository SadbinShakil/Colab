import { WikiEntry, InsightEntry } from '@/components/CollectiveWikiPanel'

// Common filler words that should not be extracted as terms
const FILLER_TERMS = new Set([
  'it', 'this', 'that', 'there', 'here', 'they', 'we', 'he', 'she',
  'the', 'a', 'an', 'what', 'which', 'where', 'when', 'how', 'why',
  'so', 'but', 'and', 'or', 'not', 'just', 'also', 'very', 'really',
  'thing', 'stuff', 'something', 'anything', 'everything', 'nothing'
])

/**
 * Analyzes a chat message for definitions and insights.
 * Returns the detected type and structured data if found.
 */
export function analyzeChatMessage(
  message: string,
  userId: string,
  userName: string
): { type: 'definition'; data: WikiEntry } | { type: 'insight'; data: InsightEntry } | { type: null } {
  const trimmed = message.trim()
  if (trimmed.length < 10) return { type: null }

  // =====================================================================
  // 1. DEFINITION DETECTION
  // Covers: "X is Y", "X means Y", "X refers to Y", "X is defined as Y",
  //         "X, which is Y", "X = Y (math)", "by X we mean Y"
  // =====================================================================
  const definitionPatterns: RegExp[] = [
    // "X is defined as Y"
    /([A-Za-z][A-Za-z0-9\s\-]{2,40}?)\s+(?:is|are)\s+defined\s+as\s+(.{10,200})/i,
    // "X means Y" or "X means that Y"
    /([A-Za-z][A-Za-z0-9\s\-]{2,40}?)\s+means\s+(?:that\s+)?(.{10,200})/i,
    // "X refers to Y"
    /([A-Za-z][A-Za-z0-9\s\-]{2,40}?)\s+refers?\s+to\s+(.{10,200})/i,
    // "X is basically Y" / "X is essentially Y"
    /([A-Za-z][A-Za-z0-9\s\-]{2,40}?)\s+is\s+(?:basically|essentially|simply|just)\s+(.{10,200})/i,
    // "By X we mean Y" / "By X, I mean Y"
    /by\s+['""]?([A-Za-z][A-Za-z0-9\s\-]{2,40}?)['""]?\s*,?\s+(?:we|I)\s+mean\s+(.{10,200})/i,
    // "X, which is Y" (parenthetical definition)
    /([A-Za-z][A-Za-z0-9\s\-]{2,40}?),\s+which\s+(?:is|are)\s+(.{10,200})/i,
    // "X: Y" (colon-based definition in academic writing)
    /^([A-Za-z][A-Za-z0-9\s\-]{2,40}):\s+(.{15,200})$/,
  ]

  for (const pattern of definitionPatterns) {
    const match = trimmed.match(pattern)
    if (!match) continue

    const term = match[1].trim().replace(/\s+/g, ' ')
    const definition = match[2].trim().replace(/[.!?]+$/, '').trim()

    // Quality filters
    if (term.length < 2 || term.length > 60) continue
    if (definition.length < 8) continue
    if (FILLER_TERMS.has(term.toLowerCase())) continue
    // Avoid extracting full sentences as "terms"
    if (term.split(' ').length > 8) continue

    return {
      type: 'definition',
      data: {
        id: `def-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        term,
        definition,
        source: 'chat',
        verifiedBy: [],
        confidence: 0.75,
        timestamp: Date.now(),
        context: trimmed
      } as WikiEntry
    }
  }

  // =====================================================================
  // 2. INSIGHT DETECTION
  // Covers: "I realized/noticed/think...", "key point/takeaway is...",
  //         "important thing is...", "the idea is that...", "so basically..."
  // =====================================================================
  const insightPatterns: RegExp[] = [
    /(?:I\s+)?realized\s+(?:that\s+)?(.{15,300})/i,
    /(?:I\s+)?noticed\s+(?:that\s+)?(.{15,300})/i,
    /(?:I\s+)?think\s+(?:the\s+)?(?:key|main|important|core)\s+(?:point|idea|thing|concept)\s+(?:here\s+)?(?:is\s+)?(?:that\s+)?(.{15,300})/i,
    /key\s+(?:takeaway|insight|idea|point)\s+(?:here\s+)?(?:is\s+)?(?:that\s+)?(.{15,300})/i,
    /important\s+(?:note|thing|point|insight):\s*(.{15,300})/i,
    /the\s+(?:main|key|core|whole)\s+(?:idea|point|insight|concept)\s+(?:here\s+)?(?:is\s+)?(?:that\s+)?(.{15,300})/i,
    /so\s+basically(?:,)?\s+(?:this\s+means\s+)?(.{20,300})/i,
    /in\s+other\s+words,?\s+(.{15,300})/i,
    /what\s+this\s+(?:really\s+)?means\s+is\s+(?:that\s+)?(.{15,300})/i,
    /the\s+(?:insight|takeaway)\s+(?:is\s+)?(?:that\s+)?(.{15,300})/i,
  ]

  for (const pattern of insightPatterns) {
    const match = trimmed.match(pattern)
    if (!match) continue

    const content = match[1].trim().replace(/[.!?]+$/, '').trim()
    if (content.length < 15) continue

    // Derive smart tags from content
    const tags = deriveInsightTags(content)

    return {
      type: 'insight',
      data: {
        id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        content,
        authorName: userName,
        likes: 0,
        tags,
        timestamp: Date.now()
      } as InsightEntry
    }
  }

  return { type: null }
}

/**
 * Derives relevant tags from insight content using keyword matching.
 */
function deriveInsightTags(content: string): string[] {
  const lower = content.toLowerCase()
  const tags: string[] = []

  if (/method|approach|technique|algorithm|framework/i.test(lower)) tags.push('methodology')
  if (/result|finding|show|demonstrate|prove|evidence/i.test(lower)) tags.push('findings')
  if (/limitation|weakness|problem|issue|challenge|drawback/i.test(lower)) tags.push('limitations')
  if (/future|next|extension|improve|open question/i.test(lower)) tags.push('future-work')
  if (/compare|versus|vs|better|worse|outperform|baseline/i.test(lower)) tags.push('comparison')
  if (/define|definition|concept|term|notation|symbol/i.test(lower)) tags.push('concept')
  if (/math|equation|formula|proof|theorem|calcul/i.test(lower)) tags.push('math')
  if (/data|dataset|experiment|train|test|eval/i.test(lower)) tags.push('experimental')

  if (tags.length === 0) tags.push('discussion')

  return tags
}
