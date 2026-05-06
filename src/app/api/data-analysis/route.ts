import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/data-analysis
 *
 * PhD-level statistical and empirical analysis grounded in the paper's specific data.
 * Not a generic "what do these numbers mean" explainer — this distinguishes statistical
 * significance from practical significance, identifies validity threats, flags
 * multiplicity issues, and maps what the data establish vs. what the paper claims.
 *
 * Returns structured JSON:
 *   - dataType: experiment | survey | observational | simulation | meta-analysis |
 *               benchmark | ablation | user-study | other
 *   - whatDataEstablishes: the narrowest accurate claim the data actually support
 *   - whatPaperClaims: what the authors claim — may exceed what the data establish
 *   - inferentialGap: the delta between the two
 *   - statisticalBreakdown: [{metric, value, interpretation, context}]
 *   - effectSizeVsPracticalSignificance: whether the statistical finding matters in practice
 *   - validityThreats: [{threat, severity, whyItMatters}]
 *   - multiplicityRisk: whether multiple comparisons inflate false positives (null if N/A)
 *   - alternativeExplanation: how a sceptical reviewer would explain the same result
 *   - whatWouldStrengthTheCase: what additional evidence would be needed to close the inferential gap
 */
export async function POST(request: NextRequest) {
  try {
    const {
      tableData,
      caption,
      question,
      documentTitle,
      documentContent,
    } = await request.json()

    if (!tableData && !caption && !question) {
      return NextResponse.json({ error: 'Table data, caption, or question is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const systemPrompt = `You are a rigorous empirical researcher and statistician conducting a PhD-level data audit for a peer review.

Your job is NOT to explain what numbers mean generically. Your job is to:
1. Separate what the data mathematically establish from what the paper interprets or claims
2. Assess whether reported statistical significance (p-values, confidence intervals) translates to practical significance — they are not the same thing
3. Identify validity threats: internal (confounds, selection bias, instrumentation), external (generalisability, ecological validity), statistical (power, multiple comparisons, assumption violations)
4. Flag multiplicity: when a paper tests multiple hypotheses or comparisons without correction, false positive rates inflate
5. Surface the most credible alternative explanation for the observed result — what else could explain this pattern?
6. Name exactly what additional evidence would be needed to close the gap between what the data show and what the paper concludes

Effect size guidance:
- A statistically significant result can be practically irrelevant (d=0.1 with N=10000)
- A non-significant result can matter if the study was underpowered
- Always distinguish "the effect is real" from "the effect matters"

Verdict types:
- "data type" — experiment (randomised, controlled), survey (self-report, selection bias), observational (no manipulation, confounds), simulation (generalisability limited by model), benchmark (performance depends on benchmark choice), ablation (internal only), user-study (ecological validity), meta-analysis (depends on included studies)

Be direct. Name specific figures, tables, and sections. Do not soften conclusions. Return JSON only.`

    const paperCtx = documentContent ? documentContent.substring(0, 4000) : null

    const userPrompt = `Conduct a PhD-level data audit for this paper.

PAPER: "${documentTitle || 'Unknown'}"

${caption ? `TABLE/FIGURE CAPTION: ${caption}` : ''}

${tableData ? `DATA CONTENT:\n${tableData.substring(0, 5000)}` : ''}

${paperCtx ? `PAPER CONTEXT (use to ground interpretation in the paper's specific claims):\n${paperCtx}` : ''}

${question ? `SPECIFIC QUESTION: ${question}` : ''}

Return JSON:
{
  "dataType": "experiment | survey | observational | simulation | benchmark | ablation | user-study | meta-analysis | other",
  "whatDataEstablishes": "the narrowest accurate claim the data mathematically support — no interpretive stretch, just what the numbers show",
  "whatPaperClaims": "what the authors conclude or imply from this data — quote or closely paraphrase",
  "inferentialGap": "the specific delta between the two above — what the paper claims that the data do not establish, or null if fully aligned",
  "statisticalBreakdown": [
    {
      "metric": "the specific number, p-value, effect size, accuracy, F-statistic — name exactly",
      "value": "the exact value as reported",
      "interpretation": "what this number means in statistical terms — be precise",
      "context": "what this means for the paper's argument — does it help, hurt, or complicate the main claim?"
    }
  ],
  "effectSizeVsPracticalSignificance": "is the reported effect statistically significant AND practically meaningful? Explain the distinction for this specific finding — name the effect size and what it means in context",
  "validityThreats": [
    {
      "threat": "specific threat to validity — name it precisely (e.g. 'selection bias in participant recruitment', 'demand characteristics in self-report measure')",
      "severity": "high | medium | low",
      "whyItMatters": "how this threat specifically affects the conclusions the paper draws from this data"
    }
  ],
  "multiplicityRisk": "if the paper runs multiple comparisons, tests, or conditions: explain the multiplicity risk and whether corrections were applied — null if single comparison",
  "alternativeExplanation": "the most credible competing explanation for the observed result that the paper's design cannot rule out",
  "whatWouldStrengthenTheCase": "the specific additional evidence, design change, or statistical test that would close the inferential gap — be concrete"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let result: any = {}
    try {
      result = JSON.parse(raw)
    } catch {
      result = {
        dataType: 'other',
        whatDataEstablishes: raw.substring(0, 300),
        whatPaperClaims: 'Parsing failed.',
        inferentialGap: null,
        statisticalBreakdown: [],
        effectSizeVsPracticalSignificance: 'Response parsing failed.',
        validityThreats: [],
        multiplicityRisk: null,
        alternativeExplanation: 'Parsing failed.',
        whatWouldStrengthenTheCase: null,
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('[DATA ANALYSIS]', error)
    return NextResponse.json({ error: 'Data analysis failed', details: String(error) }, { status: 500 })
  }
}
