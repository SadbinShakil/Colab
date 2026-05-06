import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/discussion-navigator
 *
 * Listens to a window of recent chat messages from a collaborative reading
 * session and determines:
 *   1. What concept / section the group is discussing
 *   2. Which page of the paper that concept lives on
 *   3. A short label for what to highlight there
 *
 * Called by the server after every N messages in a document room.
 * Returns a navigation directive that the server broadcasts to all readers.
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, documentTitle, pageTexts } = await request.json()
    // messages: Array<{ userName: string; message: string; timestamp: number }>
    // pageTexts: Record<string, string>  — { "1": "page 1 text...", "2": "...", ... }

    if (!messages?.length) {
      return NextResponse.json({ navigate: false })
    }

    // Build a readable transcript
    const transcript = messages
      .slice(-6) // last 6 messages max
      .map((m: { userName: string; message: string }) => `${m.userName}: ${m.message}`)
      .join('\n')

    // Build page context — tell GPT what's on each page (first 300 chars each)
    const pageContext = Object.entries(pageTexts || {})
      .slice(0, 20) // max 20 pages
      .map(([pg, text]) => `Page ${pg}: ${(text as string).slice(0, 300)}`)
      .join('\n\n')

    const prompt = `You are monitoring a group of PhD researchers reading a paper together: "${documentTitle || 'unknown'}".

RECENT DISCUSSION:
${transcript}

PAPER CONTENT BY PAGE:
${pageContext}

Your task: figure out what specific concept, finding, method, or section the researchers are discussing RIGHT NOW, and which page of the paper contains that content.

Rules:
- Only navigate if the discussion is clearly about a specific concept or section in the paper (not small talk, logistics, or greetings)
- The page must actually contain relevant text about the discussed topic
- If the discussion is too vague or not about the paper, return navigate: false
- The label should be a short phrase (≤8 words) describing what they're discussing
- The highlightLabel should describe what kind of content to highlight (e.g. "the gap this paper fills", "the evaluation methodology", "the core claim")

Return JSON:
{
  "navigate": true,
  "page": 3,
  "label": "evaluation methodology",
  "highlightLabel": "how the authors evaluate their approach",
  "confidence": "high | medium | low",
  "reason": "one sentence explaining why this page is relevant to their discussion"
}

Or if not applicable:
{ "navigate": false }`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    if (!result.navigate || !result.page || result.confidence === 'low') {
      return NextResponse.json({ navigate: false })
    }

    return NextResponse.json({
      navigate: true,
      page: result.page,
      label: result.label || '',
      highlightLabel: result.highlightLabel || result.label || '',
      confidence: result.confidence,
      reason: result.reason || '',
    })
  } catch (error: unknown) {
    console.error('[discussion-navigator]', error)
    return NextResponse.json({ navigate: false })
  }
}
