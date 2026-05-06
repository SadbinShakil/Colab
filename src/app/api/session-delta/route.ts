import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/session-delta
 *
 * Phase III artifact: per-user understanding delta report.
 *
 * Compares each participant's Phase I beliefs (priorKnowledge + readingGoal)
 * against what the group discussed and what the paper actually claims.
 *
 * Returns for each user:
 *   - initialStance: what they came in believing
 *   - keyInsights: what changed, what caused it, anchored to a paper passage
 *   - revisedReadings: specific claims they now read differently
 *   - openQuestions: what they leave not knowing
 *
 * Plus collective output:
 *   - collectiveInsight: what the group now knows together that no one knew alone
 *   - contestedClaim: the single most contested paper claim from this session
 */

interface Participant {
  userId: string
  userName: string
  expertiseLevel: 'novice' | 'familiar' | 'expert'
  readingGoal: string
  priorKnowledge: string
}

interface ChatMessage {
  userId: string
  userName: string
  content: string
  timestamp: number
}

interface Annotation {
  userId: string
  text: string
  reason: string
  pageNumber: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      documentTitle,
      participants,
      chatMessages,
      annotations,
      pageTexts,
    }: {
      documentTitle: string
      participants: Participant[]
      chatMessages: ChatMessage[]
      annotations: Annotation[]
      pageTexts: Record<string, string>
    } = await request.json()

    if (!documentTitle || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'documentTitle and at least one participant are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    // --- Build context blocks ---

    // Last 20 chat messages, filtering AI-only noise
    const recentChat = (chatMessages || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-20)
      .map((m) => `[${m.userName}]: ${m.content.trim()}`)
      .join('\n')

    // All annotations, grouped by page
    const annotationBlock = (annotations || [])
      .slice(0, 40)
      .map((a) => `[${a.userId} · p.${a.pageNumber}]: "${a.text}"${a.reason ? ` — reason: ${a.reason}` : ''}`)
      .join('\n')

    // Paper text: 400 chars per page, max 20 pages
    const pageEntries = Object.entries(pageTexts || {}).slice(0, 20)
    const paperBlock = pageEntries
      .map(([page, text]) => `--- Page ${page} ---\n${text.substring(0, 400)}`)
      .join('\n\n')

    // Participant profiles for the prompt
    const participantBlock = participants
      .map(
        (p) =>
          `• ${p.userName} (${p.expertiseLevel}, goal: ${p.readingGoal}): "${p.priorKnowledge}"`
      )
      .join('\n')

    const participantListForOutput = participants
      .map((p) => `{ "userId": "${p.userId}", "userName": "${p.userName}" }`)
      .join(', ')

    const systemPrompt = `You are generating a per-user understanding delta report for PhD researchers who have just completed a collaborative reading session of an academic paper. This is a Phase III artifact for CoRead.

Your task: for each participant, determine what they believed before the session, what changed during the session, and what caused each change.

Rules:
- Base ONLY on the paper text and session content provided — no external knowledge, no fabrication
- Every keyInsight must name a specific participant, paper passage, or annotation as the source — never "the discussion generally"
- Every revisedReading must cite a specific page number and before/after framing
- If a participant made no annotations and contributed nothing to chat, their delta is minimal — say so honestly
- openQuestions must be resolvable in principle: specific enough that you could look up the answer in the paper or external literature
- collectiveInsight must name something neither participant knew alone — if no genuine collective emergence happened, say so
- contestedClaim must be grounded in the paper text with a verbatim quote — null if nothing was genuinely contested
- PhD-level language. Terse. Specific. No hedging about uncertainty — name what you know and what you don't.

Return valid JSON only. No markdown, no preamble.`

    const userPrompt = `Paper: "${documentTitle}"

PARTICIPANT PROFILES (Phase I — what they came in believing):
${participantBlock}

DISCUSSION (last 20 messages):
${recentChat || 'No chat messages recorded.'}

ANNOTATIONS:
${annotationBlock || 'No annotations recorded.'}

PAPER TEXT (400 chars/page, up to 20 pages):
${paperBlock || 'No paper text available.'}

Generate the understanding delta for each participant. Participants: ${participantListForOutput}

Return this exact JSON structure:
{
  "deltas": [
    {
      "userId": "string",
      "userName": "string",
      "initialStance": "1–2 sentences: what this participant came in believing, inferred from their priorKnowledge and readingGoal",
      "keyInsights": [
        {
          "insight": "specific thing they learned or reconsidered",
          "source": "peer | paper | ai",
          "sourceName": "name of the peer who said it, the paper section, or 'AI explanation'",
          "paperAnchor": {
            "quote": "verbatim quote from the paper text above that anchors this insight",
            "page": 1
          }
        }
      ],
      "revisedReadings": [
        {
          "claim": "the paper claim they now read differently",
          "before": "how they read it before the session",
          "after": "how they read it after",
          "page": 1
        }
      ],
      "openQuestions": ["specific question they leave with — answerable in principle"]
    }
  ],
  "collectiveInsight": "1–2 sentences: what the group now understands together that no individual knew alone — or 'No clear collective emergence in this session' if none",
  "contestedClaim": {
    "claim": "the most contested paper claim based on this session",
    "page": 1,
    "quote": "verbatim from paper text above",
    "whyContested": "why the group disputed or questioned this claim"
  }
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    let result: {
      deltas: unknown[]
      collectiveInsight: string
      contestedClaim: unknown | null
    }

    try {
      result = JSON.parse(raw)
    } catch {
      console.error('[session-delta] JSON parse failure, raw:', raw.substring(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse model response', raw: raw.substring(0, 500) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documentTitle,
      participantCount: participants.length,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[session-delta]', error)
    return NextResponse.json(
      {
        error: 'Session delta generation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
