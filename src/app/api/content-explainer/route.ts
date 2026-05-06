import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/content-explainer
 *
 * PhD-level structured explanation for a specific content element detected on a page.
 * Called when a researcher clicks "explain it?" on a table, equation, or algorithm.
 *
 * contentType: 'table' | 'equation' | 'algorithm' | 'figure'
 *
 * Returns structured JSON tailored to each content type.
 *
 * Table returns:
 *   { whatItCompares, headlineResult, statisticalInterpretation, conclusionWarranted,
 *     alternativeRead, crossReference }
 *
 * Equation returns:
 *   { equationType, role, symbolTable, assumptions, derivationSteps,
 *     paperSpecificUse, readingPitfall, connectionToMainClaim, numericalIntuition }
 *
 * Algorithm returns:
 *   { inputOutputContract, keyDecisionStep, designRationale, complexity,
 *     noveltyClain, limitationsNotStated, connectionToEvaluation }
 *
 * Figure (text-only fallback when no image):
 *   { whatItShows, whatAuthorsClaim, evidenceSufficiency, crossReference, alternativeInterpretation }
 */
export async function POST(request: NextRequest) {
  try {
    const { contentType, sectionText, sectionName, paperTitle, paperContent } = await request.json()

    if (!contentType || !sectionText) {
      return NextResponse.json({ error: 'contentType and sectionText are required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const paperCtx = paperContent ? paperContent.slice(0, 3000) : ''
    const sectionSlice = sectionText.slice(0, 5000)

    const PROMPTS: Record<string, string> = {
      table: `You are a rigorous research statistician and peer reviewer. A PhD researcher has landed on a page with a table and wants to understand it deeply.

PAPER: "${paperTitle || 'Unknown'}"
SECTION: "${sectionName}"

SECTION TEXT (contains or references the table):
${sectionSlice}

${paperCtx ? `BROADER PAPER CONTEXT:\n${paperCtx}` : ''}

Return JSON only:
{
  "whatItCompares": "exactly what variables, conditions, systems, or time points are placed in comparison — be specific about rows and columns if described in the text",
  "headlineResult": "the single most important number or pattern in the table — the one result a reviewer would quote",
  "statisticalInterpretation": "what the reported statistics actually mean — p-values, confidence intervals, effect sizes — and whether they establish practical significance, not just statistical significance",
  "conclusionWarranted": "what conclusion the table actually supports versus what the authors claim — are they aligned or does the authors' framing overreach?",
  "alternativeRead": "how a sceptical reviewer would interpret the same numbers differently — what competing explanation the table cannot rule out",
  "crossReference": "which other section, figure, or claim in the paper this table feeds into or validates — be specific"
}`,

      equation: `You are a senior researcher with deep mathematical training. A PhD researcher has landed on a page with an equation and wants to understand it at a research level.

PAPER: "${paperTitle || 'Unknown'}"
SECTION: "${sectionName}"

SECTION TEXT (contains or references the equation):
${sectionSlice}

${paperCtx ? `BROADER PAPER CONTEXT:\n${paperCtx}` : ''}

Return JSON only:
{
  "equationType": "statistical model | loss function | probabilistic formula | optimization objective | graph-theoretic | information-theoretic | signal model | other",
  "role": "the specific job this equation performs in the paper's argument — one grounded sentence",
  "symbolTable": [
    { "symbol": "exact symbol", "meaning": "what it means in this paper specifically", "domain": "value range/type" }
  ],
  "assumptions": [
    { "assumption": "specific silent premise", "ifViolated": "what breaks in the paper's argument" }
  ],
  "derivationSteps": ["step 1 in plain language", "step 2 ...", "..."],
  "paperSpecificUse": "which section uses this, what input it takes, what the output means for the paper's claim",
  "readingPitfall": "the single most dangerous misreading of this equation in this paper's context",
  "connectionToMainClaim": "how this equation connects to the paper's core contribution",
  "numericalIntuition": "what high/low/extreme values mean in this paper's specific experimental context — null if not applicable"
}`,

      algorithm: `You are a senior researcher and systems designer. A PhD researcher has landed on a page with an algorithm and wants to understand it critically.

PAPER: "${paperTitle || 'Unknown'}"
SECTION: "${sectionName}"

SECTION TEXT (contains or describes the algorithm):
${sectionSlice}

${paperCtx ? `BROADER PAPER CONTEXT:\n${paperCtx}` : ''}

Return JSON only:
{
  "inputOutputContract": "what the algorithm takes as input and what it produces as output — be precise about data types and structure",
  "keyDecisionStep": "the single most critical step in the algorithm — the one that determines its behaviour — and what happens there",
  "designRationale": "why the algorithm is designed this way rather than a simpler alternative — what the authors say and whether it is convincing",
  "complexity": "time and space complexity if stated or derivable from the description — null if not mentioned",
  "noveltyClain": "what the authors claim is new about this algorithm compared to prior work — quote or closely paraphrase",
  "limitationsNotStated": "what the algorithm provably cannot handle or where it will fail — limitations the paper does not address",
  "connectionToEvaluation": "which table, figure, or section evaluates this algorithm and what the evaluation actually shows"
}`,

      figure: `You are a senior researcher. A PhD researcher has landed on a page with a figure but no image could be captured — you must work from the section text alone.

PAPER: "${paperTitle || 'Unknown'}"
SECTION: "${sectionName}"

SECTION TEXT (references the figure):
${sectionSlice}

${paperCtx ? `BROADER PAPER CONTEXT:\n${paperCtx}` : ''}

Return JSON only. Be explicit that visual details are inferred from text, not directly observed.
{
  "whatItShows": "what the figure depicts based on the caption and surrounding text — be specific about axes, variables, or conditions mentioned",
  "whatAuthorsClaim": "what conclusion the authors draw from this figure — quote the caption or text verbatim",
  "evidenceSufficiency": "whether the described figure is sufficient to support the authors' claim — what would be needed to make it stronger",
  "crossReference": "which other section, table, or claim this figure connects to or supports",
  "alternativeInterpretation": "how the same figure could be read differently by a sceptical reviewer",
  "inferredOnly": true
}`,
    }

    const prompt = PROMPTS[contentType] || PROMPTS.figure

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: contentType === 'equation' ? 1400 : 1000,
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let result: any = {}
    try {
      result = JSON.parse(raw)
    } catch {
      result = { error: 'JSON parsing failed', raw: raw.slice(0, 300) }
    }

    return NextResponse.json({ success: true, contentType, sectionName, ...result, timestamp: new Date().toISOString() })

  } catch (error: any) {
    console.error('[CONTENT EXPLAINER]', error)
    return NextResponse.json({ error: 'Content analysis failed', details: String(error) }, { status: 500 })
  }
}
