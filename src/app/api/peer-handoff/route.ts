import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/peer-handoff
 *
 * Generates a structured, paper-specific peer routing handoff.
 * Called by aiCoordinationCore when A2 matches a struggling reader to a peer.
 *
 * Instead of "ask Alex for help" (useless), produces:
 *   - conceptLabel: exact concept the reader is confused about
 *   - handoffMessage: 1-sentence routing message naming the concept
 *   - suggestedOpening: a paper-specific question the helpee can send verbatim
 *   - paperQuote: the exact phrase anchoring the confusion
 */
export async function POST(request: NextRequest) {
  let helperName = 'your peer'
  let strugglerName = 'the reader'
  try {
    const body: {
      sectionName: string
      sectionText: string
      confusedPassages: string[]
      helperName: string
      strugglerName: string
    } = await request.json()
    helperName = body.helperName
    strugglerName = body.strugglerName
    const { sectionName, sectionText, confusedPassages } = body

    if (!sectionName || !helperName) {
      return NextResponse.json({ error: 'sectionName and helperName are required' }, { status: 400 })
    }

    const confusionContext = confusedPassages?.length > 0
      ? `\n\nThe reader's confusion highlights (text they marked as confusing):\n${confusedPassages.map((p, i) => `${i + 1}. "${p}"`).join('\n')}`
      : ''

    const textSlice = (sectionText || '').slice(0, 3000)

    const prompt = `You are embedded in CoRead, a collaborative academic reading system used by PhD researchers.

A reader (${strugglerName}) is struggling with a section. Another reader (${helperName}) navigated it well.
Generate a structured peer handoff so ${strugglerName} knows exactly what to ask and ${helperName} knows exactly what they need.

Section: "${sectionName}"
Section text (first 3000 chars):
${textSlice}
${confusionContext}

Return JSON with this exact structure:
{
  "conceptLabel": "the precise concept name as used in the paper — specific, not generic (e.g. 'the temperature-scaled softmax in Eq. 3', not 'the math')",
  "handoffMessage": "One sentence, max 25 words: what ${strugglerName} is confused about and why ${helperName} is the right person. Name the concept.",
  "suggestedOpening": "A question ${strugglerName} can send verbatim to ${helperName}. Must quote a specific phrase from the paper. Max 40 words. End with ?",
  "paperQuote": "The exact phrase from the section text that is the anchor of the confusion — 10-20 words"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.15,
      max_tokens: 400,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ success: true, handoff: result })

  } catch (error: any) {
    console.error('[peer-handoff]', error)
    // Return a graceful fallback — never block peer routing
    return NextResponse.json({
      success: true,
      handoff: {
        conceptLabel: 'this section',
        handoffMessage: `${strugglerName} is struggling here — ${helperName} can help.`,
        suggestedOpening: `Hey ${helperName}, I'm stuck on this section. Can you walk me through it?`,
        paperQuote: '',
      }
    })
  }
}
