import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/section-intelligence
 *
 * PhD-level section analysis for one or more sections detected on the current page.
 * Called by ImplicitHelpCard when the reader's page contains multiple sections.
 *
 * For each section, returns:
 *   - argument:        the single core claim or move this section makes
 *   - evidence:        what specific data, experiments, or citations support it
 *   - assumptions:     what the section takes as given without justifying
 *   - connects:        which other section/figure/table this section feeds into or depends on
 *   - watchOut:        the single most common misread or skimming mistake for this section
 *   - keyTension:      the open question or contestable point a reviewer would press on
 */
export async function POST(request: NextRequest) {
  try {
    const { sections, paperTitle, paperContent } = await request.json()

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'sections array is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    // Run all section analyses in parallel — one call per section
    const calls = sections.map((section: { id: string; name: string; fullText: string }) => {
      const sectionText = section.fullText?.slice(0, 5000) || ''
      const paperCtx = paperContent?.slice(0, 4000) || ''

      const prompt = `You are a senior researcher briefing a PhD student on one section of a paper they are currently reading.

PAPER: "${paperTitle || 'Unknown'}"

SECTION: "${section.name}"

SECTION FULL TEXT:
${sectionText}

${paperCtx ? `BROADER PAPER CONTEXT (for cross-referencing only — do not summarise the full paper):
${paperCtx}` : ''}

Your job: arm the researcher to read this section critically in the next 5 minutes. Do not summarise generically. Be specific about what THIS section does in the paper's argument.

Return JSON only:
{
  "argument": "the single move or claim this section makes in the paper's overall argument — one direct sentence, no 'this section discusses'",
  "evidence": "what specific evidence, data, experiment, citation, or figure this section uses to support its argument — name it specifically",
  "assumptions": "what this section takes as given without justifying — the silent premises a reader could miss",
  "connects": "which other section, figure, table, or equation this section directly feeds into or depends on — be specific, e.g. 'Equation 2 in §Methods', 'validated in Table 3'",
  "watchOut": "the single most common misreading or skimming error a reader makes in this section — what they get wrong and why",
  "keyTension": "the open question or contestable claim a peer reviewer would push on — the weakest link in this section's logic"
}`

      return openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 700,
      }).then(completion => {
        const raw = completion.choices[0]?.message?.content || '{}'
        try {
          return { id: section.id, name: section.name, ...JSON.parse(raw) }
        } catch {
          return {
            id: section.id,
            name: section.name,
            argument: raw.slice(0, 200),
            evidence: null,
            assumptions: null,
            connects: null,
            watchOut: null,
            keyTension: null,
          }
        }
      })
    })

    const results = await Promise.all(calls)
    return NextResponse.json({ success: true, sections: results, timestamp: new Date().toISOString() })

  } catch (error: any) {
    console.error('[SECTION INTELLIGENCE]', error)
    return NextResponse.json({ error: 'Section analysis failed', details: String(error) }, { status: 500 })
  }
}
