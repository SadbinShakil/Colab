import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

/**
 * POST /api/shared-understanding
 *
 * Takes all per-section understandings (from human readers + AI) and synthesises
 * one cohesive Shared Understanding document for the group.
 *
 * This is the core Phase III artifact — what the group collectively knows
 * about the paper after the session.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      documentTitle,
      paperText,
      sectionUnderstandings,  // Array<{ sectionName, readerName, isAI, summary, keyInsight, openQuestion, confidence }>
      participantNames = [],
    } = await request.json()

    if (!sectionUnderstandings?.length) {
      return NextResponse.json({ error: 'sectionUnderstandings is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json({
        sharedUnderstanding: {
          oneLiner: `The group collectively engaged with "${documentTitle}" across all major sections.`,
          whatWeNowKnow: [
            'The paper\'s core methodology was covered by human readers with close attention to evaluation design.',
            'AI coverage of remaining sections provides baseline understanding of supporting arguments.',
          ],
          contestedClaims: [
            'The generalisability of results beyond the experimental population remains an open discussion point.',
          ],
          openQuestions: [
            'How do the findings compare to prior work cited in the Related Work section?',
          ],
          sectionSyntheses: sectionUnderstandings.map((s: any) => ({
            sectionName: s.sectionName,
            reader: s.readerName,
            contribution: s.summary,
          })),
          collectiveConfidence: 'medium' as const,
          nextSessionPrimer: 'Focus the next session on the contested claims and open questions identified above.',
        }
      })
    }

    const understandingBlocks = sectionUnderstandings.map((s: any) =>
      `Section: "${s.sectionName}" — Read by: ${s.readerName}${s.isAI ? ' (AI)' : ''}
Summary: ${s.summary}
Key insight: ${s.keyInsight}
Open question: ${s.openQuestion}
Confidence: ${s.confidence}`
    ).join('\n\n---\n\n')

    const prompt = `You are synthesising the collective understanding of a group of PhD researchers who have just finished reading "${documentTitle}" collaboratively. Each researcher (or AI) was assigned specific sections and has generated their understanding.

Your task: produce ONE cohesive Shared Understanding document that represents what the entire group now knows about this paper — combining individual section insights into a unified view.

Paper: "${documentTitle}"
Participants: ${participantNames.join(', ') || 'Research group'}

INDIVIDUAL SECTION UNDERSTANDINGS:
${understandingBlocks}

Paper text (first 2000 chars for context):
${(paperText || '').slice(0, 2000)}

Return JSON. Every field must be specific to this paper and grounded in the section understandings above.

{
  "oneLiner": "one precise sentence describing what the group now collectively understands about this paper",
  "whatWeNowKnow": [
    "3-5 analytical statements the group can now rely on — not observations, but conclusions drawn from reading"
  ],
  "contestedClaims": [
    "claims where different readers' understandings revealed tension, divergence, or unresolved evidence gaps"
  ],
  "openQuestions": [
    "2-4 specific questions that remain unresolved across sections — precise enough to guide the next session"
  ],
  "sectionSyntheses": [
    {
      "sectionName": "section name",
      "reader": "reader name",
      "contribution": "what this reader's understanding adds to the group's collective picture — one sentence"
    }
  ],
  "collectiveConfidence": "high | medium | low — how comprehensively the group covered the paper",
  "nextSessionPrimer": "one paragraph: what the group should focus on in the next session, based on gaps and open questions"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
    })

    const sharedUnderstanding = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ sharedUnderstanding })
  } catch (error: any) {
    console.error('[shared-understanding]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
