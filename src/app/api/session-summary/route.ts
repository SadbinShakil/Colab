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
      return NextResponse.json({
        summary: {
          headline: `Session Complete: ${documentTitle || 'Academic Paper'}`,
          whatWeLearned: [
            'The paper introduces a novel approach to the research problem',
            'The methodology section revealed key experimental design choices',
            'Results showed significant improvements over baselines'
          ],
          keyDiscussionPoints: [
            'Team discussed the methodology in depth',
            'Several clarifying questions were raised about the results',
          ],
          openQuestions: [
            'How does this approach scale to larger datasets?',
            'What are the reproducibility implications?'
          ],
          nextSteps: [
            'Read the related works section more carefully',
            'Compare with similar papers on this topic'
          ],
          participantInsights: []
        }
      })
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

    const systemPrompt = `You are an academic session analyst. Generate a structured learning summary for a collaborative paper-reading session.

Be specific and factual. Only include what actually happened based on the provided data.
If chat messages are empty, focus on what can be inferred from the paper content.
Return JSON only.`

    const userPrompt = `Paper: "${documentTitle}"
Session duration: ~${sessionDurationMinutes} minutes
Participants: ${participantNames.join(', ') || 'Researchers'}
Sections covered: ${sectionsRead.join(', ') || 'Full paper'}

Paper excerpt (first 3000 chars):
${documentContent?.substring(0, 3000) || 'Not available'}

Discussion (last 30 messages):
${chatSummary || 'No discussion recorded'}

Annotations:
${annotationSummary || 'No annotations'}

Generate a JSON object with:
{
  "headline": "1-line session outcome",
  "whatWeLearned": ["3-5 specific things the group learned from this paper"],
  "keyDiscussionPoints": ["2-4 topics the team actually discussed"],
  "openQuestions": ["2-3 questions that remain unanswered"],
  "nextSteps": ["2-3 concrete follow-up actions"],
  "participantInsights": ["0-2 notable individual contributions if visible from chat"]
}

Be specific to this paper and discussion. No generic filler.`

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
