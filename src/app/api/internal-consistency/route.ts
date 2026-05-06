import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/internal-consistency
 *
 * PhD-level internal consistency checker for academic papers.
 * Given a claim the research group is discussing, checks the claim against
 * the paper's OWN text — not against external knowledge or GPT training data.
 *
 * Finds:
 *   - The exact passage in the paper that makes the claim (verbatim)
 *   - The exact passage in the paper that provides the evidence for the claim (verbatim)
 *   - Whether that evidence actually supports the claim at the stated confidence level
 *   - Scope creep — does the claim generalise beyond what the evidence shows?
 *   - Limitation contradictions — does a limitations section contradict the claim?
 *
 * This is not fact-checking against external consensus. It is checking whether
 * a paper's own argument is internally consistent — whether the evidence cited
 * supports the claim made, whether sample sizes support the confidence of
 * conclusions, whether limitations acknowledged in one section contradict
 * claims in another.
 *
 * Returns structured JSON:
 *   - claimPassage: verbatim quote + page where the claim is made
 *   - evidencePassage: verbatim quote + page where evidence for it appears
 *   - verdict: supported | overstated | unsupported | contradicted | insufficient-evidence
 *   - confidence: 0–1
 *   - gap: what the claim asserts beyond what the evidence shows
 *   - limitationConflict: verbatim from a limitations section that contradicts this claim, or null
 *   - discussionPrompt: a paper-grounded question for the group to discuss
 */
export async function POST(request: NextRequest) {
  try {
    const { claim, documentTitle, pageTexts, focusPages } = await request.json()

    if (!claim) {
      return NextResponse.json({ error: 'Claim is required' }, { status: 400 })
    }

    if (!pageTexts || typeof pageTexts !== 'object' || Object.keys(pageTexts).length === 0) {
      return NextResponse.json({ error: 'pageTexts is required and must be a non-empty object' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    // Build page context: prioritise focusPages if supplied, then fill remaining budget
    const MAX_PAGES = 25
    const CHARS_PER_PAGE = 600

    const allPageKeys = Object.keys(pageTexts).sort((a, b) => Number(a) - Number(b))

    // Determine which pages to include, prioritising focus pages
    const focusSet = new Set((focusPages ?? []).map(String))
    const prioritised = allPageKeys.filter(k => focusSet.has(k))
    const remaining = allPageKeys.filter(k => !focusSet.has(k))
    const selectedKeys = [...prioritised, ...remaining].slice(0, MAX_PAGES)

    const pageContext = selectedKeys
      .map(pageNum => {
        const text = (pageTexts[pageNum] ?? '').trim().substring(0, CHARS_PER_PAGE)
        return `--- PAGE ${pageNum} ---\n${text}`
      })
      .join('\n\n')

    const systemPrompt = `You are a skeptical peer reviewer checking this paper's internal consistency.

Your job is NOT to fact-check the claim against external knowledge or your training data.
Your job is ONLY to check whether the paper's own text supports the paper's own claim.

Rules you must follow:
1. Quote VERBATIM from the PAGE TEXTS provided — do not paraphrase, summarise, or invent text
2. Every quote you return must appear word-for-word in the provided page texts
3. If you cannot find a verbatim passage, set found: false and quote: ""
4. Check whether the paper's own evidence supports the paper's own claim
5. Look specifically for: sample size claims, threshold derivations, generalisability statements, limitation sections that contradict confident claims
6. Scope creep is a finding: if the claim generalises beyond what the evidence shows (e.g. "n=3 sessions" backing a general threshold), name it explicitly

Verdict definitions:
- "supported" — the paper's own evidence directly and sufficiently establishes this claim
- "overstated" — the evidence exists but the claim is framed with more certainty or generality than the evidence warrants
- "unsupported" — no evidence passage found in the paper for this claim
- "contradicted" — a passage elsewhere in the paper (e.g. limitations) directly contradicts this claim
- "insufficient-evidence" — evidence is present but too weak (e.g. sample too small, single session, no control)

The discussionPrompt must be specific to the actual claim and evidence you found in the paper.
Never return a generic prompt like "What do you think about the methodology?".
Ground it in the specific numbers, section, or quote involved.

Return JSON only.`

    const userPrompt = `Check the internal consistency of this claim against the paper's own text.

CLAIM BEING DISCUSSED: "${claim}"

PAPER TITLE: "${documentTitle || 'Unknown'}"

PAGE TEXTS (search these for verbatim passages — do not use any knowledge outside of these pages):
${pageContext}

Return this exact JSON structure:
{
  "claimPassage": {
    "quote": "verbatim sentence or phrase from the page texts that makes this claim, exactly as written",
    "page": 0,
    "found": true
  },
  "evidencePassage": {
    "quote": "verbatim sentence or phrase from the page texts that provides the evidence for this claim, exactly as written",
    "page": 0,
    "found": true
  },
  "verdict": "supported | overstated | unsupported | contradicted | insufficient-evidence",
  "confidence": 0.0,
  "gap": "what this claim asserts beyond what the evidence in the paper actually shows — be specific about the inferential leap",
  "limitationConflict": "verbatim quote from a limitations or discussion section that contradicts or qualifies this claim, or null if none found",
  "discussionPrompt": "a specific, paper-grounded question for this research group to discuss — must reference the actual claim, evidence, and any gap found"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    let result: {
      claimPassage: { quote: string; page: number; found: boolean }
      evidencePassage: { quote: string; page: number; found: boolean }
      verdict: string
      confidence: number
      gap: string
      limitationConflict: string | null
      discussionPrompt: string
    }

    try {
      result = JSON.parse(raw)
    } catch {
      console.error('[INTERNAL-CONSISTENCY] JSON parse failed, raw response:', raw.substring(0, 300))
      return NextResponse.json(
        { error: 'Failed to parse model response', details: raw.substring(0, 300) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      claim,
      documentTitle: documentTitle || null,
      claimPassage: result.claimPassage ?? { quote: '', page: 0, found: false },
      evidencePassage: result.evidencePassage ?? { quote: '', page: 0, found: false },
      verdict: result.verdict ?? 'unsupported',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      gap: result.gap ?? '',
      limitationConflict: result.limitationConflict ?? null,
      discussionPrompt: result.discussionPrompt ?? '',
      timestamp: new Date().toISOString(),
    })

  } catch (error: unknown) {
    console.error('[INTERNAL-CONSISTENCY]', error)
    return NextResponse.json(
      { error: 'Internal consistency check failed', details: String(error) },
      { status: 500 }
    )
  }
}
