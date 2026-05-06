import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/math-explainer
 *
 * PhD-level mathematical analysis grounded in the paper's specific use of the equation.
 * Not a generic math tutor — this traces how this equation functions in THIS paper's
 * argument, what assumptions it encodes, what its derivation steps are, and where
 * it can mislead a reader.
 *
 * Returns structured JSON:
 *   - equationType: statistical model | loss function | probabilistic formula |
 *                   optimization objective | graph-theoretic | information-theoretic |
 *                   signal model | other
 *   - role: what job this equation does in the paper's argument
 *   - symbolTable: [{symbol, meaning, domain, paperDefinition}]
 *   - assumptions: [{assumption, ifViolated}]
 *   - derivationSteps: [plain-language steps from first principles to this form]
 *   - paperSpecificUse: how the paper applies this equation, which section, to what data
 *   - readingPitfall: the most common misreading of this equation in this paper
 *   - connectionToMainClaim: how this equation connects to the paper's core contribution
 *   - numericalIntuition: what concrete numbers or limits mean in the context of this paper
 */
export async function POST(request: NextRequest) {
  try {
    const { equation, context, documentContent, question } = await request.json()

    if (!equation && !question) {
      return NextResponse.json({ error: 'Equation or question is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const systemPrompt = `You are a senior researcher with deep mathematical training conducting a PhD-level equation analysis.

Your job is NOT to give a generic textbook explanation. Your job is to:
1. Identify exactly what type of mathematical object this equation is — and why that type matters for how to read it
2. Enumerate every assumption the equation silently encodes — the ones a reader can miss on first read
3. Trace the derivation steps from first principles in plain language — not symbolic manipulation, but the reasoning chain
4. Locate this equation inside the paper's argument — which claim does it support, which figure does it connect to, which result depends on it?
5. Find the most dangerous misreading — what does a rushed reader get wrong about this equation?
6. Ground numerical values or bounds to the paper's specific data, not generic examples

Equation types:
- "statistical model" — defines probability distribution, regression, or generative process
- "loss function" — optimization objective; name what is being minimised/maximised and why
- "probabilistic formula" — Bayesian update, conditional probability, marginalisation
- "optimization objective" — constrained or unconstrained optimisation; identify what the solution means
- "graph-theoretic" — graph measure, traversal, centrality, or adjacency relation
- "information-theoretic" — entropy, KL divergence, mutual information, or channel capacity
- "signal model" — time-series, frequency-domain, sensor fusion, or detection threshold
- "other" — geometric, algebraic, or combinatorial formulas that don't fit above

Be direct. Name specific sections, figures, and tables from the paper text. Do not hedge.

Return JSON only.`

    const target = equation || question
    const paperText = documentContent ? documentContent.substring(0, 6000) : null

    const userPrompt = `Analyze this mathematical element at PhD level:

EQUATION / QUESTION: "${target}"

LOCAL CONTEXT (surrounding text in the paper): "${context || 'not provided'}"

${paperText
  ? `PAPER TEXT (use this to ground your analysis in the paper's specific argument):\n${paperText}`
  : 'No full paper text provided — analyze based on the equation and local context alone, and state this limitation.'
}

Return JSON:
{
  "equationType": "statistical model | loss function | probabilistic formula | optimization objective | graph-theoretic | information-theoretic | signal model | other",
  "role": "the specific job this equation performs in the paper's argument — one sentence, grounded",
  "symbolTable": [
    {
      "symbol": "exact symbol as written",
      "meaning": "what it represents in this paper — not the generic meaning",
      "domain": "the value range or type (e.g. ℝ, {0,1}, 0–1, positive integer)",
      "paperDefinition": "verbatim definition from the paper if available, else null"
    }
  ],
  "assumptions": [
    {
      "assumption": "exact assumption the equation encodes — be specific",
      "ifViolated": "what breaks in the paper's argument or derivation if this assumption does not hold"
    }
  ],
  "derivationSteps": [
    "step 1 in plain language — the reasoning, not the algebra",
    "step 2 ...",
    "..."
  ],
  "paperSpecificUse": "how the paper applies this equation — which section, what input data, what the output means for the paper's claim",
  "readingPitfall": "the single most dangerous misreading of this equation in this paper's context — what a reader gets wrong and why",
  "connectionToMainClaim": "how this equation connects to the paper's core contribution or main result — be explicit",
  "numericalIntuition": "if the equation produces a number or threshold, what does a high/low/extreme value mean in the context of this paper's specific data or experiment"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1800,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let result: any = {}
    try {
      result = JSON.parse(raw)
    } catch {
      result = {
        equationType: 'other',
        role: raw.substring(0, 200),
        symbolTable: [],
        assumptions: [],
        derivationSteps: ['Response parsing failed — raw response truncated above.'],
        paperSpecificUse: 'Parsing failed.',
        readingPitfall: null,
        connectionToMainClaim: null,
        numericalIntuition: null,
      }
    }

    return NextResponse.json({
      success: true,
      equation: target,
      ...result,
      timestamp: new Date().toISOString(),
    })

  } catch (err: any) {
    console.error('[MATH EXPLAINER]', err)
    return NextResponse.json({ error: 'Math analysis failed', details: String(err) }, { status: 500 })
  }
}
