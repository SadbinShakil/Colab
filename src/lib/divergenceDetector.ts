// src/lib/divergenceDetector.ts
// Detects annotation divergence: same passage highlighted by two readers with different interpretations.
// Used by ApryseWebViewer to trigger annotation-divergence API and generate discussion prompts.

export interface LocalHighlight {
  id: string
  quoteText: string      // the selected text
  reason: string         // why they highlighted it (confusion, question, disagree, important, etc.)
  sectionId: string
  pageNumber: number
  userId: string
  userName: string
  timestamp: number
  // bounding box — optional, for visual overlap
  bbox?: { x1: number; y1: number; x2: number; y2: number; page: number }
}

export interface DivergenceSignal {
  localHighlight: LocalHighlight
  peerHighlight: LocalHighlight
  overlapScore: number       // 0-1, Jaccard similarity of token sets
  sharedPassage: string      // the overlapping text fragment
  divergenceType: 'interpretation' | 'emphasis' | 'stance'
}

// Token-level Jaccard similarity between two strings
function jaccardSimilarity(a: string, b: string): number {
  const tokA = new Set(a.toLowerCase().split(/\s+/).filter(t => t.length > 3))
  const tokB = new Set(b.toLowerCase().split(/\s+/).filter(t => t.length > 3))
  if (tokA.size === 0 || tokB.size === 0) return 0
  const intersection = [...tokA].filter(t => tokB.has(t)).length
  const union = new Set([...tokA, ...tokB]).size
  return intersection / union
}

// Largest common substring (word-level) between two strings
function longestCommonPhrase(a: string, b: string): string {
  const wordsA = a.split(/\s+/)
  const wordsB = new Set(b.split(/\s+/))
  const common: string[] = []
  let current: string[] = []
  for (const w of wordsA) {
    if (wordsB.has(w)) {
      current.push(w)
      if (current.length > common.length) common.splice(0, common.length, ...current)
    } else {
      current = []
    }
  }
  return common.join(' ')
}

// Map reason to divergence type
function classifyDivergence(reasonA: string, reasonB: string): DivergenceSignal['divergenceType'] {
  const stanceReasons = new Set(['disagree', 'question', 'concern'])
  const emphasisReasons = new Set(['important', 'clarification', 'understood'])
  if (stanceReasons.has(reasonA) !== stanceReasons.has(reasonB)) return 'stance'
  if (emphasisReasons.has(reasonA) !== emphasisReasons.has(reasonB)) return 'emphasis'
  return 'interpretation'
}

// OVERLAP_THRESHOLD: minimum Jaccard similarity to flag as divergence
const OVERLAP_THRESHOLD = 0.35

/**
 * Compare a local highlight against a list of peer highlights.
 * Returns the first divergence found (highest overlap score), or null if none.
 */
export function detectDivergence(
  local: LocalHighlight,
  peerHighlights: LocalHighlight[]
): DivergenceSignal | null {
  let best: DivergenceSignal | null = null
  let bestScore = OVERLAP_THRESHOLD

  for (const peer of peerHighlights) {
    // Must be from a different user
    if (peer.userId === local.userId) continue
    // Must be on same page or adjacent
    if (Math.abs(peer.pageNumber - local.pageNumber) > 1) continue
    // Must be different reason (if same reason, not really a divergence)
    if (peer.reason === local.reason) continue

    const score = jaccardSimilarity(local.quoteText, peer.quoteText)
    if (score > bestScore) {
      bestScore = score
      const sharedPassage = longestCommonPhrase(local.quoteText, peer.quoteText)
      best = {
        localHighlight: local,
        peerHighlight: peer,
        overlapScore: score,
        sharedPassage,
        divergenceType: classifyDivergence(local.reason, peer.reason),
      }
    }
  }
  return best
}

/**
 * Batch check: given all highlights in a session, find all divergence pairs.
 * Deduplicates by (idA, idB) pair so each divergence appears once.
 */
export function detectAllDivergences(highlights: LocalHighlight[]): DivergenceSignal[] {
  const seen = new Set<string>()
  const results: DivergenceSignal[] = []

  for (let i = 0; i < highlights.length; i++) {
    for (let j = i + 1; j < highlights.length; j++) {
      const a = highlights[i]
      const b = highlights[j]
      if (a.userId === b.userId) continue
      if (a.reason === b.reason) continue
      if (Math.abs(a.pageNumber - b.pageNumber) > 1) continue

      const key = [a.id, b.id].sort().join(':')
      if (seen.has(key)) continue

      const score = jaccardSimilarity(a.quoteText, b.quoteText)
      if (score >= OVERLAP_THRESHOLD) {
        seen.add(key)
        results.push({
          localHighlight: a,
          peerHighlight: b,
          overlapScore: score,
          sharedPassage: longestCommonPhrase(a.quoteText, b.quoteText),
          divergenceType: classifyDivergence(a.reason, b.reason),
        })
      }
    }
  }
  // Sort by overlap score descending
  return results.sort((a, b) => b.overlapScore - a.overlapScore)
}
