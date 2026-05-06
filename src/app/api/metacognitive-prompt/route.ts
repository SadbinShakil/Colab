import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/metacognitive-prompt
 *
 * Implements Socratic metacognitive scaffolding — before giving a reader
 * an AI explanation, we ask them a reflective question grounded in the
 * section text. This is rooted in Vygotsky's ZPD and Schraw's metacognition
 * research: self-explanation before receiving help produces better retention.
 *
 * Called when D_s crosses tau_fire (0.72) but BEFORE showing the full
 * explanation card. The reader is prompted to articulate their current
 * mental model first. Their response is logged and passed to A6 as context,
 * which produces a much more targeted explanation.
 *
 * POST { sectionText, sectionName, passageText, userId, confusionType? }
 * Returns: 1 primary Socratic question + 2 alternative framings + reflection starters
 */

export interface MetacognitivePromptRequest {
  sectionText: string        // C_s — current section
  sectionName: string
  passageText: string        // specific passage triggering confusion
  userId: string
  confusionType?: 'math' | 'concept' | 'methodology' | 'claim' | 'figure' | 'general'
  previousAttempts?: number  // how many times has this reader been stuck here
}

export interface MetacognitivePromptResponse {
  primaryQuestion: string       // the main Socratic question to show
  alternativeFramings: string[] // 2 different angles on the same question
  reflectionStarters: string[]  // sentence starters to help them articulate
  hypothesisPrompt: string      // "Before seeing an explanation, what's your current hypothesis?"
  selfCheckItems: string[]      // 2–3 checkboxes: "I understand X", "I don't follow Y"
  escalationHint: string        // what kind of help to suggest after reflection
}

const METACOGNITIVE_SYSTEM = `You are a PhD thesis advisor using the Socratic method to help a researcher understand a difficult passage.

Your goal: ask ONE precise, grounded question that forces the reader to articulate their current mental model before receiving an AI explanation. The question should:
- Be specific to the actual text, not generic ("What confuses you?" is banned)
- Identify the exact conceptual gap the reader is likely to have
- Be answerable in 1–3 sentences by someone who has read the section carefully
- Push the reader to connect this to what they already know

If the confusion involves math: ask them to state what they think the variables represent.
If the confusion involves a claim: ask them to state what evidence they'd need to believe it.
If the confusion involves methodology: ask them what the key design choice is and why it was made.`

export async function POST(request: NextRequest) {
  try {
    const body: MetacognitivePromptRequest = await request.json()
    const { sectionText, sectionName, passageText, confusionType = 'general', previousAttempts = 0 } = body

    if (!sectionText || !passageText) {
      return NextResponse.json({ error: 'sectionText and passageText required' }, { status: 400 })
    }

    const escalationContext = previousAttempts >= 2
      ? 'This reader has been stuck here multiple times. Push harder on the prerequisite gap.'
      : ''

    const prompt = `Section: "${sectionName}"
Confusion type: ${confusionType}
${escalationContext}

The difficult passage:
"""
${passageText.slice(0, 800)}
"""

Surrounding section context:
"""
${sectionText.slice(0, 2000)}
"""

Generate a JSON response:
{
  "primaryQuestion": "<single Socratic question, ≤2 sentences, grounded in the exact text>",
  "alternativeFramings": [
    "<alternative angle 1 — different cognitive approach to the same gap>",
    "<alternative angle 2 — from a different disciplinary perspective>"
  ],
  "reflectionStarters": [
    "<sentence starter 1, e.g. 'I think the authors are claiming that...' or 'What confuses me is that X seems to contradict...'>",
    "<sentence starter 2>",
    "<sentence starter 3>"
  ],
  "hypothesisPrompt": "<one sentence: 'Before reading an explanation, write your best guess of what [specific thing] means'>",
  "selfCheckItems": [
    "<thing they might understand, phrased as 'I can state what X is'>",
    "<thing they likely don't understand yet, phrased as 'I cannot yet explain why Y'>",
    "<optional third item if highly complex section>"
  ],
  "escalationHint": "<one of: 'peer' | 'math-walkthrough' | 'analogy' | 'prerequisite' | 'example' — what kind of help is most likely needed>"
}

Return ONLY valid JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: METACOGNITIVE_SYSTEM },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 500,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')

    const result: MetacognitivePromptResponse = {
      primaryQuestion: parsed.primaryQuestion || 'What is your current understanding of this passage?',
      alternativeFramings: Array.isArray(parsed.alternativeFramings) ? parsed.alternativeFramings.slice(0, 2) : [],
      reflectionStarters: Array.isArray(parsed.reflectionStarters) ? parsed.reflectionStarters.slice(0, 3) : [],
      hypothesisPrompt: parsed.hypothesisPrompt || 'Before seeing an explanation, write your best hypothesis.',
      selfCheckItems: Array.isArray(parsed.selfCheckItems) ? parsed.selfCheckItems.slice(0, 3) : [],
      escalationHint: parsed.escalationHint || 'analogy',
    }

    return NextResponse.json({ success: true, prompt: result })
  } catch (error) {
    console.error('[metacognitive-prompt POST]', error)
    return NextResponse.json({ error: 'Failed to generate metacognitive prompt' }, { status: 500 })
  }
}
