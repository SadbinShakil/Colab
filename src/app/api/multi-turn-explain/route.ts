import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/multi-turn-explain
 *
 * Multi-turn follow-up conversation grounded in C_s (section text).
 * A reader can ask follow-up questions after the initial A6 explanation —
 * the system maintains the section context across turns.
 *
 * This is fundamentally different from a generic chatbot: every answer
 * is constrained to C_s. If the follow-up question drifts outside the
 * section, the system says so explicitly and offers to widen scope.
 *
 * Session: the client sends the full conversation history + C_s each turn.
 * No server-side session state needed.
 *
 * POST {
 *   sectionText,      // C_s — the section they're discussing
 *   sectionName,
 *   userLevel,        // 'beginner' | 'intermediate' | 'advanced'
 *   conversationHistory: [{ role: 'user'|'assistant', content: string }],
 *   newMessage,       // the follow-up question
 *   mathMode,         // if true, use step-by-step derivation mode
 *   userId
 * }
 */

export interface MultiTurnMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface MultiTurnRequest {
  sectionText: string
  sectionName: string
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  conversationHistory: MultiTurnMessage[]
  newMessage: string
  mathMode?: boolean
  userId: string
}

export interface MultiTurnResponse {
  reply: string
  grounded: boolean
  outOfScope: boolean       // true if question goes beyond section
  suggestPeer: boolean      // true if AI can't answer satisfactorily
  followUpHints: string[]   // 2–3 natural next questions
  mathSteps?: string[]      // if mathMode, array of step-by-step lines
}

const MULTI_TURN_SYSTEM = (sectionName: string, sectionText: string, level: string, mathMode: boolean) => `
You are an embedded reading assistant for PhD-level researchers reading the section "${sectionName}".

YOUR ONLY SOURCE OF TRUTH:
"""
${sectionText.slice(0, 7000)}
"""

Rules:
1. Answer ONLY from the section text above. Do not introduce external knowledge.
2. If the question cannot be answered from the section, say: "This goes beyond what the section covers directly." Then optionally note what additional context would help.
3. Be precise and concise. Every sentence must add information.
4. Calibrate depth to level: ${level === 'advanced' ? 'expert researcher — be technically precise, no hand-holding' : level === 'intermediate' ? 'graduate student — define key terms, be thorough' : 'newcomer — use analogies, avoid jargon'}.
${mathMode ? `5. MATH MODE: For any mathematical claim, walk through the reasoning step by step. Number each step. Show how variables relate.` : ''}
6. End with exactly this JSON structure on its own line (AFTER your prose response):
METADATA: {"outOfScope": false, "suggestPeer": false, "followUpHints": ["...", "...", "..."]}
`.trim()

export async function POST(request: NextRequest) {
  try {
    const body: MultiTurnRequest = await request.json()
    const {
      sectionText, sectionName, userLevel = 'intermediate',
      conversationHistory = [], newMessage, mathMode = false,
    } = body

    if (!sectionText || !newMessage) {
      return NextResponse.json({ error: 'sectionText and newMessage required' }, { status: 400 })
    }

    // Build messages array: system + history + new user message
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: MULTI_TURN_SYSTEM(sectionName, sectionText, userLevel, mathMode),
      },
      // Cap history at last 8 turns to stay within context
      ...conversationHistory.slice(-8).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: newMessage },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: mathMode ? 900 : 600,
      temperature: 0.3,
    })

    const rawReply = completion.choices[0]?.message?.content?.trim() || ''

    // Parse the METADATA JSON footer
    let outOfScope = false
    let suggestPeer = false
    let followUpHints: string[] = []
    let cleanReply = rawReply

    const metadataMatch = rawReply.match(/METADATA:\s*(\{[^}]+\})/)
    if (metadataMatch) {
      try {
        const meta = JSON.parse(metadataMatch[1])
        outOfScope = meta.outOfScope === true
        suggestPeer = meta.suggestPeer === true
        followUpHints = Array.isArray(meta.followUpHints) ? meta.followUpHints.slice(0, 3) : []
      } catch { /* ignore parse errors */ }
      cleanReply = rawReply.replace(/METADATA:\s*\{[^}]+\}/, '').trim()
    }

    // Extract math steps if mathMode
    let mathSteps: string[] | undefined
    if (mathMode) {
      const stepMatches = cleanReply.match(/^\s*\d+\..+$/gm)
      if (stepMatches && stepMatches.length >= 2) {
        mathSteps = stepMatches.map(s => s.trim())
      }
    }

    // Simple grounding check: if reply says "beyond the section" it's ungrounded
    const grounded = !outOfScope && !cleanReply.toLowerCase().includes('goes beyond what the section')

    const response: MultiTurnResponse = {
      reply: cleanReply,
      grounded,
      outOfScope,
      suggestPeer,
      followUpHints,
      mathSteps,
    }

    return NextResponse.json({ success: true, ...response })
  } catch (error) {
    console.error('[multi-turn-explain POST]', error)
    return NextResponse.json({ error: 'Failed to generate follow-up' }, { status: 500 })
  }
}
