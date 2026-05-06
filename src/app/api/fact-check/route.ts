import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/fact-check
 *
 * PhD-level claim verification against the paper's own text.
 * Distinguishes claim types (empirical, methodological, interpretive, causal),
 * identifies the exact evidence chain, and flags inferential overreach.
 *
 * Returns a structured verdict with:
 *   - claimType: what kind of claim this is
 *   - verdict: supported | refuted | uncertain | context-dependent | overreached
 *   - confidence: 0–1
 *   - evidenceChain: how the paper's data connects to the claim
 *   - inferentialGap: what the claim asserts beyond what the data establish
 *   - exactEvidence: verbatim quote from the paper that is most relevant
 *   - alternativeInterpretation: how a sceptical reader could read the same data
 *   - caveats: scope, sample, or generalisability limits
 */
export async function POST(request: NextRequest) {
  try {
    const { claim, documentContext, documentTitle } = await request.json()

    if (!claim) {
      return NextResponse.json({ error: 'Claim is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const systemPrompt = `You are a rigorous peer reviewer conducting claim-level verification for a PhD research reading session.

Your job is not to produce a simple true/false verdict. Your job is to:
1. Classify what kind of claim this is — empirical result, causal claim, methodological choice, theoretical interpretation, or scope claim
2. Trace the exact evidence chain from the paper's data to the claim — what experiment, figure, table, or argument supports it?
3. Identify the inferential gap: what does the claim assert that exceeds what the evidence actually establishes?
4. Surface how a sceptical peer reviewer would read the same evidence
5. Flag any scope creep — claims that are technically supported in the specific study context but are framed as more general than the data allow

Be direct. Do not hedge. If a claim is overclaimed, say so explicitly and name the specific gap.

Verdict options:
- "supported" — the paper's evidence directly establishes this claim within its stated scope
- "refuted" — the paper's evidence or design contradicts this claim
- "uncertain" — insufficient evidence to evaluate; identify exactly what is missing
- "context-dependent" — true under specific conditions stated in the paper, not in general
- "overreached" — technically supported by the data but framed with more certainty or generality than the evidence warrants

Return JSON only.`

    const userPrompt = `Verify this claim at PhD level:

CLAIM: "${claim}"

PAPER: "${documentTitle || 'Unknown'}"

${documentContext
  ? `PAPER TEXT (use this as the primary evidence source — base your verdict strictly on what is written here):\n${documentContext.substring(0, 5000)}`
  : 'No paper text provided — evaluate as a general scientific claim against known consensus, and state that grounding to this specific paper was not possible.'
}

Return JSON:
{
  "claimType": "empirical | causal | methodological | interpretive | scope",
  "verdict": "supported | refuted | uncertain | context-dependent | overreached",
  "confidence": 0.0,
  "evidenceChain": "how the paper's data, experiment, or argument connects to this claim — be specific about which section, figure, or table",
  "inferentialGap": "what this claim asserts beyond what the evidence establishes — null if fully supported",
  "exactEvidence": "verbatim quote from the paper most directly relevant to this claim, or null if not available",
  "alternativeInterpretation": "how a sceptical reviewer would read the same evidence differently",
  "caveats": "scope, sample size, population, or generalisability limits that qualify this verdict"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 900,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let result: any = {}
    try {
      result = JSON.parse(raw)
    } catch {
      result = {
        claimType: 'empirical',
        verdict: 'uncertain',
        confidence: 0.5,
        evidenceChain: raw.substring(0, 300),
        inferentialGap: null,
        exactEvidence: null,
        alternativeInterpretation: 'Response parsing failed.',
        caveats: 'JSON parsing failed — raw response truncated above.',
      }
    }

    return NextResponse.json({ success: true, claim, ...result, timestamp: new Date().toISOString() })

  } catch (error: any) {
    console.error('[FACT CHECK]', error)
    return NextResponse.json({ error: 'Fact-check failed', details: String(error) }, { status: 500 })
  }
}
