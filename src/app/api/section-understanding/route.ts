import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

/**
 * POST /api/section-understanding
 *
 * Generates a concise "understanding" artifact for one section, from one reader's
 * perspective. Called for:
 *   - Human readers: grounded in their highlights/annotations on the section
 *   - AI reader: grounded in the raw section text alone
 *
 * Returns:
 *   { understanding: { summary, keyInsight, openQuestion, confidence } }
 */
export async function POST(request: NextRequest) {
  try {
    const {
      sectionName,
      sectionText,
      readerName,
      isAI = false,
      highlights = [],   // string[] — text the reader highlighted in this section
      annotations = [],  // string[] — comments/notes the reader added
    } = await request.json()

    if (!sectionName || !sectionText) {
      return NextResponse.json({ error: 'sectionName and sectionText are required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      // Demo mode — return plausible structure
      return NextResponse.json({
        understanding: {
          summary: `${readerName || 'Reader'} engaged with ${sectionName}. The section ${isAI ? 'presents' : 'was read with focus on'} the core argument and supporting evidence.`,
          keyInsight: `The main contribution in ${sectionName} is the methodological approach taken by the authors.`,
          openQuestion: `How does the approach in ${sectionName} generalise beyond the experimental conditions?`,
          confidence: 'medium' as const,
        }
      })
    }

    const highlightContext = highlights.length
      ? `\nPassages this reader highlighted:\n${highlights.slice(0, 8).map((h: string, i: number) => `[${i + 1}] "${h.slice(0, 200)}"`).join('\n')}`
      : ''

    const annotationContext = annotations.length
      ? `\nThis reader's notes:\n${annotations.slice(0, 6).map((a: string) => `- ${a.slice(0, 200)}`).join('\n')}`
      : ''

    const prompt = isAI
      ? `You are CoRead AI. You have been assigned to read and understand the following section of an academic paper. Generate your understanding of this section as if you were a knowledgeable peer.

Section: "${sectionName}"

Section text:
${sectionText.slice(0, 3000)}

Return JSON:
{
  "summary": "2-3 sentences: what this section argues, how, and what it establishes",
  "keyInsight": "the single most important analytical finding or claim in this section",
  "openQuestion": "one specific unresolved question this section raises for the group",
  "confidence": "high | medium | low — how fully this section's argument is supported by the evidence presented"
}`
      : `You are analyzing a researcher's engagement with one section of an academic paper. Based on what they highlighted and noted, reconstruct their understanding of the section.

Reader: ${readerName}
Section: "${sectionName}"

Section text:
${sectionText.slice(0, 2000)}
${highlightContext}
${annotationContext}

Return JSON. Every field must be grounded in the section text or the reader's highlights — no generic filler.
{
  "summary": "2-3 sentences capturing what this reader understood from the section — what argument they followed, what they found notable",
  "keyInsight": "the most important thing this reader extracted from the section, based on their highlights",
  "openQuestion": "a question this reader's engagement suggests they still have about this section",
  "confidence": "high | medium | low — how deeply the reader engaged (based on highlight density and annotation quality)"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500,
    })

    const understanding = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ understanding })
  } catch (error: any) {
    console.error('[section-understanding]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
