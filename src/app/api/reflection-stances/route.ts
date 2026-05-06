import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/reflection-stances
 *
 * Returns two sets of stances for Phase I reflection:
 *   - `grounded`: 4 first-person statements specific to this paper's claims/methods
 *   - `generic`: 5 fixed reading-angle statements that always apply
 *
 * Grounded stances sound like what a PhD researcher would actually write in a
 * pre-session reflection — "I am reading this to..." or "My background is X and
 * I want to scrutinise Y in this paper."
 */
export async function POST(req: NextRequest) {
  try {
    const { paperTitle, paperContent } = await req.json()

    const generic = genericStances()

    if (!paperContent || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json({ grounded: fallbackGrounded(), generic })
    }

    const textSlice = paperContent.slice(0, 6000)

    const prompt = `You are helping PhD researchers write a pre-session reflection before a collaborative paper reading session.

Paper: "${paperTitle || 'Untitled'}"

Paper excerpt:
${textSlice}

Generate exactly 4 first-person reflection statements that a PhD researcher might select or use as a starting point. Each statement should sound like something a real researcher would write — combining their own background/expertise with a specific angle on THIS paper.

Rules:
- First person ("I am reading this to...", "My background is in X and I want to scrutinise...", "I bring expertise in Y and will focus on...")
- Grounded in this paper's actual claims, methods, contributions, or evaluation — name specific things from the paper
- 12–20 words each
- Cover 4 different angles: methodology/evaluation, contribution/novelty, theory/framing, related work/gaps
- Sound like a researcher's genuine reflection, not a description of the paper
- PhD-level precision — no vague or generic language

Examples of the RIGHT tone:
- "I bring HCI methods expertise and will scrutinise whether the user study design supports the D_s threshold claims."
- "My background is in NLP and I am reading this to assess how the attention mechanism compares to prior sparse attention work."
- "I am reading as a reviewer — I want to verify whether Table 2 evidence is sufficient to support the main contribution claim."

Return JSON only:
{ "grounded": ["...", "...", "...", "..."] }`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    const grounded: string[] = Array.isArray(parsed.grounded) ? parsed.grounded.slice(0, 4) : fallbackGrounded()

    return NextResponse.json({ grounded, generic })
  } catch (err) {
    console.error('[reflection-stances]', err)
    return NextResponse.json({ grounded: fallbackGrounded(), generic: genericStances() })
  }
}

/** Fixed reading-angle stances — always shown, not paper-specific */
function genericStances(): string[] {
  return [
    'I am reading as a reviewer — checking evidence-to-claim fidelity throughout.',
    'I bring domain expertise and will focus on scrutinising the evaluation design.',
    'I am new to this subfield and reading to understand the core contribution.',
    'I am tracking how this paper positions itself relative to prior work.',
    'I am reading to identify reproducibility gaps — data, code, and parameter reporting.',
  ]
}

/** Fallback grounded stances used when API is unavailable */
function fallbackGrounded(): string[] {
  return [
    'I am reading to assess whether the methodology is rigorous enough to support the claims.',
    'My background is in this area and I want to scrutinise the theoretical grounding.',
    'I am focused on whether the evaluation design controls for the right confounds.',
    'I want to understand how this contribution advances beyond the cited prior work.',
  ]
}
