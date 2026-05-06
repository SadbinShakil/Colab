/**
 * API Route: /api/a3-discussion
 *
 * Agent 3 — Discussion Facilitator
 *
 * Generates section-aware discussion prompts for group/peer chat.
 * Prompts are grounded in the actual section content — not generic templates.
 *
 * POST { sectionText, sectionName, chatType, participantCount, confusionContext }
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a discussion facilitator embedded in CoRead, a collaborative reading system for PhD researchers and professors.

Your goal: generate discussion prompts that make expert co-readers sharper than they would be reading alone. This means surfacing tensions, not consensus.

Rules — non-negotiable:
- Every prompt must be directly answerable using ONLY the provided section text
- Every prompt must contain a specific technical term, equation number, figure/table reference, or verbatim phrase from the text
- Prompts must force critical engagement: evidence-to-claim gaps, implicit assumptions, methodological choices, alternative interpretations
- For peer-to-peer: prompt one reader to challenge a specific claim and the other to defend or qualify it — not just to explain
- For group: surface genuine interpretive disagreements or probe a claim that reasonable experts might assess differently
- Target: a prompt that a program committee member would ask in a paper review, not a question a student would ask in a seminar
- NEVER generate prompts that are answerable by a single lookup ("What does X mean?", "What did the authors find?")
- If the section has a key result, equation, or design choice — make that the target. Don't summarize around it.
- PhD-level language throughout. No hedging.
- Keep each prompt under 35 words`

export interface A3DiscussionRequest {
  sectionText: string
  sectionName: string
  chatType: 'peer-to-peer' | 'group'
  participantCount: number
  confusionContext?: {
    confusionHighlights: number
    stuckMarkers: number
    avgDsScore: number
  }
}

export interface DiscussionPrompt {
  text: string
  type: 'clarification' | 'explanation' | 'comparison' | 'elaboration' | 'synthesis'
  groundingQuote: string  // Short quote from section text that anchors this prompt
  priority: number
}

export async function POST(request: NextRequest) {
  try {
    const body: A3DiscussionRequest = await request.json()
    const { sectionText, sectionName, chatType, participantCount, confusionContext } = body

    if (!sectionText || sectionText.length < 50) {
      return NextResponse.json({ error: 'sectionText is required and must be non-trivial' }, { status: 400 })
    }

    // Demo mode — derive grounded-looking questions from the actual section text
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      const snippet = sectionText.slice(0, 300).replace(/\s+/g, ' ').trim()
      const firstSentence = snippet.split(/[.!?]/)[0]?.trim() ?? snippet.slice(0, 80)
      const prompts: DiscussionPrompt[] = [
        { text: `The authors claim "${firstSentence.slice(0, 60)}…" — what evidence in this section directly supports that claim, and is it sufficient?`, type: 'clarification', groundingQuote: firstSentence.slice(0, 40), priority: 1 },
        { text: `What is the load-bearing assumption in §${sectionName} — the one the entire argument collapses without?`, type: 'elaboration', groundingQuote: sectionName, priority: 2 },
        { text: `Which methodological choice in this section would a reviewer most likely push back on, and what would the counterargument be?`, type: 'comparison', groundingQuote: '', priority: 3 },
      ]
      return NextResponse.json({ prompts })
    }

    const C_s = sectionText.slice(0, 6000)

    const confusionNote = confusionContext
      ? `Context: ${confusionContext.confusionHighlights} confusion highlights, ${confusionContext.stuckMarkers} stuck markers, average struggle score ${confusionContext.avgDsScore.toFixed(2)}.`
      : ''

    const userPrompt = `Section: "${sectionName}"

Section text:
"""
${C_s}
"""

${confusionNote}

Generate 3 discussion prompts for a ${chatType} chat among ${participantCount} readers of this section.
${chatType === 'peer-to-peer'
  ? 'Focus on helping one reader explain their understanding to another.'
  : 'Focus on surfacing different perspectives or complementary insights across the group.'}

Return a JSON array with exactly 3 objects:
[
  {
    "text": "the prompt question",
    "type": "clarification|explanation|comparison|elaboration|synthesis",
    "groundingQuote": "a short phrase (max 15 words) from the section text that this prompt relates to",
    "priority": 1
  }
]

Return ONLY the JSON array.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() || '[]'
    let prompts: DiscussionPrompt[] = []

    try {
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : (parsed.prompts || parsed.questions || [])
      prompts = arr.slice(0, 3).map((p: any, i: number) => ({
        text: p.text || '',
        type: p.type || 'clarification',
        groundingQuote: p.groundingQuote || '',
        priority: i + 1,
      }))
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    console.log(`[A3] Generated ${prompts.length} discussion prompts for section "${sectionName}"`)
    return NextResponse.json({ prompts })

  } catch (error) {
    console.error('[A3] Error:', error)
    return NextResponse.json(
      { error: `A3 request failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
