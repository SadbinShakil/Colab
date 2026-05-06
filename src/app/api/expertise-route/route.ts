import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/expertise-route
 *
 * Expertise-aware peer matching for Agent 2 (CollaborationOrchestrator).
 *
 * Replaces the D_s-only peer routing with a multi-factor match:
 *   1. Expertise complementarity — does the peer's background cover the section the helpee is stuck on?
 *   2. Reading goal alignment — a peer reading for "methodology" explains methodology better
 *   3. Section familiarity — is the peer currently in or past this section?
 *   4. D_s gap — helper must have meaningfully lower D_s (>0.15 below helpee)
 *      OR a high explainerScore (>60) that compensates for moderate D_s gap
 *
 * Only eligible peers are passed to GPT-4o — pre-filtering happens in TypeScript
 * so the model focuses on reasoning about the match, not scanning all candidates.
 *
 * The suggestedPrompt names a specific concept and section — never generic.
 */

interface HelpeeProfile {
  userId: string
  userName: string
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: string
  priorKnowledge: string
  currentSection: string
  currentSectionName: string
  currentSectionText: string
  dsScore: number
}

interface PeerProfile {
  userId: string
  userName: string
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: string
  priorKnowledge: string
  currentSection: string
  currentSectionName: string
  dsScore: number
  explainerScore: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      helpee,
      peers,
      documentTitle,
    }: {
      helpee: HelpeeProfile
      peers: PeerProfile[]
      documentTitle: string
    } = await request.json()

    if (!helpee || !helpee.userId) {
      return NextResponse.json({ error: 'helpee is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const allPeers: PeerProfile[] = peers || []

    // --- Pre-filter: only pass eligible peers to the model ---
    // A peer is eligible if they have either:
    //   (a) meaningfully lower D_s than the helpee (gap > 0.15), OR
    //   (b) a high explainerScore (> 60) indicating teaching ability
    // Experts with D_s < tau_e (0.35) are always eligible regardless of gap.
    const eligiblePeers = allPeers.filter((p) => {
      const dsGapSufficient = p.dsScore < helpee.dsScore - 0.15
      const strongExplainer = p.explainerScore > 60
      const expertFluency = p.dsScore < 0.35
      return dsGapSufficient || strongExplainer || expertFluency
    })

    // If no eligible peer exists, short-circuit — return null match without calling GPT-4o
    if (eligiblePeers.length === 0) {
      return NextResponse.json({
        success: true,
        match: null,
        explanation: `No peer has a sufficiently lower D_s score (>${(helpee.dsScore - 0.15).toFixed(2)} required) or high explainer score. AI explanation is the appropriate next step.`,
        timestamp: new Date().toISOString(),
      })
    }

    // --- Build peer profiles for the prompt ---
    const peerBlock = eligiblePeers
      .map(
        (p) =>
          `• ${p.userName} [${p.userId}]
    Expertise: ${p.expertiseLevel} · Goal: ${p.readingGoal}
    Background: "${p.priorKnowledge}"
    Currently reading: ${p.currentSectionName}
    D_s: ${p.dsScore.toFixed(2)} · ExplainerScore: ${p.explainerScore}/100`
      )
      .join('\n\n')

    const sectionContext = helpee.currentSectionText
      ? helpee.currentSectionText.substring(0, 800)
      : 'Section text not available.'

    const systemPrompt = `You are the peer routing component of CoRead, a mixed-initiative collaborative reading system for PhD researchers.

Your task: select the best peer to help a struggling reader, and generate a specific, actionable routing message.

Selection criteria (in priority order):
1. Expertise complementarity — does the peer's background directly cover the concepts in the section the helpee is stuck on? Read their priorKnowledge carefully against the section text.
2. Reading goal alignment — a peer reading for "methodology" is better placed to explain methodology than someone reading for "overview"
3. D_s gap — a larger gap means the peer is more fluent; a high explainerScore compensates for a moderate gap
4. Section familiarity — a peer who has already read this section is preferred

Rules:
- Base every judgment on the section text and peer profiles provided — not on generic domain knowledge
- The reason must name a specific concept from the section text and link it to the peer's background
- The suggestedPrompt must name the exact concept or subsection — never "ask your peer to help you understand this section"
- If no peer is clearly better than the others, choose the one with the highest explainerScore and explain why
- If all eligible peers are poor matches despite eligibility, set approachType to "ai-first" and explain honestly
- matchScore: 0–100 representing the quality of this match; use the full range

Return valid JSON only. No markdown, no preamble.`

    const userPrompt = `Paper: "${documentTitle}"

STRUGGLING READER:
Name: ${helpee.userName}
Expertise: ${helpee.expertiseLevel} · Goal: ${helpee.readingGoal}
Background: "${helpee.priorKnowledge}"
Stuck in: ${helpee.currentSectionName} (D_s: ${helpee.dsScore.toFixed(2)})

SECTION TEXT (first 800 chars):
${sectionContext}

ELIGIBLE PEERS:
${peerBlock}

Select the best peer for ${helpee.userName} and explain specifically why their background makes them the right person for this section.

Return this exact JSON:
{
  "match": {
    "userId": "string",
    "userName": "string",
    "matchScore": 0,
    "reason": "specific: name the concept from the section text and why this peer's background covers it",
    "suggestedPrompt": "exact message to send: 'Ask [Name] to explain [specific concept] in [section name]'",
    "approachType": "peer-first | ai-first | group"
  },
  "explanation": "1–2 sentences: why this match (or why the next-best alternative was rejected)"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    let result: {
      match: {
        userId: string
        userName: string
        matchScore: number
        reason: string
        suggestedPrompt: string
        approachType: 'peer-first' | 'ai-first' | 'group'
      } | null
      explanation: string
    }

    try {
      result = JSON.parse(raw)
    } catch {
      console.error('[expertise-route] JSON parse failure, raw:', raw.substring(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse model response', raw: raw.substring(0, 500) },
        { status: 500 }
      )
    }

    // Validate that the returned userId is actually one of the eligible peers
    // (guard against model hallucinating a userId)
    if (result.match) {
      const matchedPeer = eligiblePeers.find((p) => p.userId === result.match!.userId)
      if (!matchedPeer) {
        // Model returned an invalid userId — fall back to highest explainerScore
        const fallback = eligiblePeers.sort((a, b) => b.explainerScore - a.explainerScore)[0]
        result.match = {
          userId: fallback.userId,
          userName: fallback.userName,
          matchScore: fallback.explainerScore,
          reason: `Fallback: ${fallback.userName} has the highest explainer score among eligible peers (${fallback.explainerScore}/100).`,
          suggestedPrompt: `Ask ${fallback.userName} to explain ${helpee.currentSectionName}.`,
          approachType: 'peer-first',
        }
        result.explanation = 'Model returned an unrecognised peer ID — matched to highest-scoring eligible peer.'
      }
    }

    return NextResponse.json({
      success: true,
      helpee: { userId: helpee.userId, userName: helpee.userName, dsScore: helpee.dsScore },
      eligiblePeerCount: eligiblePeers.length,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[expertise-route]', error)
    return NextResponse.json(
      {
        error: 'Expertise routing failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
