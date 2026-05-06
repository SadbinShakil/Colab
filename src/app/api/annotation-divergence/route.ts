import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { passageText, reason1, reason2, userName1, userName2, sectionName, sectionText, documentTitle } = await request.json()

    if (!passageText || !sectionText) {
      return NextResponse.json({ error: 'passageText and sectionText required' }, { status: 400 })
    }

    const prompt = `Two PhD researchers highlighted the same passage in "${documentTitle || 'this paper'}" with different interpretations.

PASSAGE: "${passageText.slice(0, 300)}"
SECTION: ${sectionName}

${userName1} marked it as: ${reason1}
${userName2} marked it as: ${reason2}

SECTION TEXT (C_s — ground your response strictly in this):
${sectionText.slice(0, 3000)}

Generate a structured discussion prompt that:
1. Names the exact interpretive tension (what ${userName1} sees vs what ${userName2} sees)
2. Grounds it in specific language from the passage/section
3. Poses a resolvable question that would determine which reading is better supported

Format as JSON only:
{
  "discussionPrompt": "one precise question the group should debate",
  "tension": "one sentence naming the exact disagreement",
  "groundingQuote": "verbatim quote from the passage that is the crux",
  "resolutionCriteria": "what evidence in the paper would resolve this"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert facilitator for PhD-level academic reading groups. Generate structured, paper-grounded discussion prompts. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const result = JSON.parse(raw)

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[annotation-divergence]', error)
    // Return a grounded fallback
    return NextResponse.json({
      success: true,
      discussionPrompt: `Both readers engaged differently with this passage — what does the surrounding argument require this passage to mean?`,
      tension: `Interpretive divergence on the same passage suggests the authors' intent is ambiguous.`,
      groundingQuote: '',
      resolutionCriteria: 'Check how this passage is cited or elaborated elsewhere in the paper.'
    })
  }
}
