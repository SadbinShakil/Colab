import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

/**
 * POST /api/section-summary
 *
 * Generates a PhD-level grounded summary for one paper section.
 * Every claim in the output is anchored to the actual section text — no fabrication.
 *
 * Input:
 *   sectionName    — heading text (e.g. "3.2 Signal Model")
 *   sectionText    — raw extracted text for this section (up to ~6000 chars)
 *   documentTitle  — paper title for context
 *   sectionIndex   — optional ordinal position ("section 3 of 8") for framing
 *
 * Output:
 *   {
 *     claim        — the single central claim of this section (1 sentence, grounded)
 *     mechanism    — how it works / what it does (2-3 sentences, precise)
 *     evidence     — what evidence/data backs the claim, with source quote
 *     sourceQuote  — verbatim short passage from sectionText that is most load-bearing
 *     tension      — the strongest unstated assumption or limitation (1 sentence)
 *     keyTerms     — 2-4 section-specific technical terms defined in one phrase each
 *     contentFlags — detected elements: 'figure' | 'table' | 'equation' | 'algorithm'
 *   }
 */

const SYSTEM_PROMPT = `You are a research scientist embedded in CoRead, a collaborative reading tool for PhD researchers and faculty. Your job is to produce a tightly-grounded section summary — not a paraphrase, not a simplification, but a precise analytic digest that tells an expert reader exactly what this section establishes, how, and where the weaknesses are.

RULES (non-negotiable):
1. Every sentence you write must be directly derivable from the provided section text. Never add context not present in the text.
2. sourceQuote must be a verbatim extract (≤ 30 words) from the sectionText — the single most load-bearing sentence.
3. claim must be one sentence. Start with what the section asserts, not what it describes.
4. tension must name the specific assumption or gap, not a generic limitation. E.g. "The threshold τ=0.72 is reported as empirically derived but the derivation is not shown" — not "more research is needed".
5. keyTerms: only define terms that are coined or used with paper-specific meaning in this section. Skip standard domain vocabulary.
6. contentFlags: scan for signal phrases — "Figure N", "Table N", "Equation N", "Algorithm N", "Fig.", "formula", "∑", "∫", "≤", "≥", column-aligned numbers. List all that match.
7. If the section text is too short or fragmented to support grounded claims, set claim to null and explain briefly in mechanism.
8. Do not use markdown bold/italic. Plain text only.
9. Response must be valid JSON matching exactly the schema below — no extra keys, no prose outside the JSON.`

const USER_TEMPLATE = (sectionName: string, sectionText: string, documentTitle: string, sectionIndex?: string) => `
Paper: "${documentTitle}"
Section: "${sectionName}"${sectionIndex ? ` (${sectionIndex})` : ''}

--- SECTION TEXT START ---
${sectionText.slice(0, 5800)}
--- SECTION TEXT END ---

Produce a JSON object with exactly these keys:
{
  "claim": string | null,
  "mechanism": string,
  "evidence": string,
  "sourceQuote": string,
  "tension": string,
  "keyTerms": Array<{ term: string, definition: string }>,
  "contentFlags": Array<"figure" | "table" | "equation" | "algorithm">
}
`.trim()

function detectContentFlags(text: string): Array<'figure' | 'table' | 'equation' | 'algorithm'> {
  const flags = new Set<'figure' | 'table' | 'equation' | 'algorithm'>()
  if (/\b(figure|fig\.)\s*\d/i.test(text)) flags.add('figure')
  if (/\btable\s*\d/i.test(text)) flags.add('table')
  if (/\b(equation|formula|eq\.)\s*\d|[∑∫∂∇√≤≥±×÷∞]|\\frac|\\sum|\\int/.test(text)) flags.add('equation')
  if (/\balgorithm\s*\d|\bpseudocode\b/i.test(text)) flags.add('algorithm')
  return Array.from(flags)
}

export async function POST(request: NextRequest) {
  try {
    const { sectionName, sectionText, documentTitle, sectionIndex } = await request.json()

    if (!sectionName || !sectionText) {
      return NextResponse.json({ error: 'sectionName and sectionText are required' }, { status: 400 })
    }

    // Always detect content flags from raw text — cheap, no API call needed
    const detectedFlags = detectContentFlags(sectionText)

    // No API key → return a minimal but honest mock
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      const words = sectionText.split(/\s+/)
      const snippet = words.slice(0, 28).join(' ') + (words.length > 28 ? '…' : '')
      return NextResponse.json({
        claim: `§${sectionName} establishes a methodological component of the paper's core framework.`,
        mechanism: `This section introduces the operational definition and rationale for ${sectionName}. Add your OpenAI API key for grounded analysis drawn directly from the paper text.`,
        evidence: 'Full grounding requires OPENAI_API_KEY in .env',
        sourceQuote: snippet,
        tension: 'No API key — tension analysis unavailable',
        keyTerms: [],
        contentFlags: detectedFlags,
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.15,   // near-deterministic — grounding, not creativity
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_TEMPLATE(sectionName, sectionText, documentTitle || 'Research Paper', sectionIndex) },
      ],
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('[section-summary] JSON parse failed:', raw.slice(0, 200))
      return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 500 })
    }

    // Merge server-detected flags with model-detected (model may catch more from context)
    const modelFlags = (parsed.contentFlags as string[] | undefined) ?? []
    const mergedFlags = Array.from(new Set([...detectedFlags, ...modelFlags]))

    return NextResponse.json({ ...parsed, contentFlags: mergedFlags })

  } catch (err: unknown) {
    console.error('[section-summary] error:', err)
    return NextResponse.json({ error: 'Section summary failed' }, { status: 500 })
  }
}
