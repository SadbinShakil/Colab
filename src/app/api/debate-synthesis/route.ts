import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { prompt, positions, sectionText, sectionName, documentTitle } = await request.json()

    if (!positions || positions.length === 0) {
      return NextResponse.json({ error: 'positions required' }, { status: 400 })
    }

    const positionSummary = positions.map((p: any) =>
      `${p.userName} (${p.stance}): "${p.statement}"`
    ).join('\n')

    const synthesisPrompt = `You are synthesizing a PhD-level structured debate for "${documentTitle || 'this paper'}".

DEBATE PROMPT: "${prompt}"
SECTION: ${sectionName}

SECTION TEXT (C_s — your synthesis must be grounded in this text only):
${(sectionText || '').slice(0, 4000)}

PARTICIPANT POSITIONS:
${positionSummary}

Synthesize the debate. Respond with JSON only:
{
  "convergenceState": "converging" | "diverging" | "unresolved",
  "sharedUnderstanding": "what the group agrees on — quote the paper to support",
  "persistentTension": "what remains unresolved and why it matters for the paper's argument",
  "collectiveKnowledgeEntry": "2-3 sentence synthesis suitable for future readers — specific, grounded, no filler",
  "groundingQuote": "verbatim quote from C_s that anchors the synthesis",
  "nextQuestion": "the most important unresolved question that a follow-up session should address"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You synthesize academic debates for PhD researchers. Ground everything in the provided section text. Respond only with valid JSON.' },
        { role: 'user', content: synthesisPrompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const result = JSON.parse(raw)

    return NextResponse.json({ success: true, synthesis: result })
  } catch (error: any) {
    console.error('[debate-synthesis]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
