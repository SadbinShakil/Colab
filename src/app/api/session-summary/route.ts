import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

export async function POST(request: NextRequest) {
  try {
    const {
      documentTitle,
      documentContent,
      chatMessages = [],
      annotations = [],
      sessionDurationMinutes = 30,
      participantNames = [],
      sectionsRead = []
    } = await request.json()

    if (!documentTitle && !documentContent) {
      return NextResponse.json({ error: 'documentTitle or documentContent is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env to generate session log.' }, { status: 503 })
    }

    // Build context from chat messages
    const chatSummary = chatMessages
      .filter((m: any) => m.type !== 'AI_RESPONSE' && m.content)
      .slice(-30)
      .map((m: any) => `${m.userName}: ${m.content}`)
      .join('\n')

    // Build annotation summary
    const annotationSummary = annotations
      .slice(0, 20)
      .map((a: any) => `[${a.type || 'note'}] "${a.text?.substring(0, 100)}"`)
      .join('\n')

    const systemPrompt = `You are generating a Session Log for PhD researchers who have just finished a collaborative paper-reading session. This log is a Phase III artifact — it seeds the next session and persists in the Collective Knowledge Base.

Rules:
- Every entry must be grounded in the actual paper text or the actual discussion — no generic filler
- "What we established" means analytical conclusions the group can rely on, not observations
- "Open questions" must be specific to this paper's methodology, evidence, or claims — not generic future work
- "Contested claims" are claims where the group's discussion revealed evidence-to-claim tension or interpretive divergence
- "Next steps" must be specific research actions: which section to re-read, which citation to trace, which comparison to make
- PhD-level language throughout. Terse and precise.
Return JSON only.`

    const userPrompt = `Paper: "${documentTitle}"
Session: ${sessionDurationMinutes} minutes · ${participantNames.join(', ') || 'Researchers'} · Sections: ${sectionsRead.join(', ') || 'Full paper'}

Paper text (first 3000 chars):
${documentContent?.substring(0, 3000) || 'Not available'}

Discussion (last 30 messages):
${chatSummary || 'No discussion recorded'}

Annotations:
${annotationSummary || 'No annotations'}

Generate a JSON Session Log:
{
  "headline": "1 sentence: what this session established or failed to establish about the paper's core claim",
  "whatWeLearned": ["3–5 specific analytical conclusions grounded in the paper text — not observations, conclusions. Each must name a specific claim, figure, or result."],
  "keyDiscussionPoints": ["2–4 specific claims or tensions that emerged from the discussion — quote the paper or discussion where possible"],
  "openQuestions": ["2–3 specific unresolved questions about this paper's methodology, evidence, or scope — must be answerable in principle"],
  "nextSteps": ["2–3 concrete research actions: which section to verify, which citation to check, which comparison to make"],
  "participantInsights": ["0–2 notable individual observations visible from the discussion — name the participant"]
}

Be specific. No filler. Each item must be traceable to the actual paper or discussion.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let summary: any = {}

    try {
      summary = JSON.parse(raw)
    } catch {
      summary = {
        headline: 'Session Complete',
        whatWeLearned: ['Session analysis complete'],
        keyDiscussionPoints: [],
        openQuestions: [],
        nextSteps: ['Review your annotations'],
        participantInsights: []
      }
    }

    return NextResponse.json({ summary })

  } catch (error: any) {
    console.error('[Session Summary] Error:', error)
    return NextResponse.json(
      { error: `Failed to generate session summary: ${error.message}` },
      { status: 500 }
    )
  }
}
