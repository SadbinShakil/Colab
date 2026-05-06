import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sectionContent, documentTitle, documentAuthors, documentAbstract } = await request.json()

    if (!sectionContent && !documentTitle) {
      return NextResponse.json({ error: 'Section content or document title required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a PhD-level research analyst performing a literature audit of an academic paper section. Your task: identify the most important related work and assess whether the paper's citation coverage is adequate.

Rules:
- Only cite real, published papers. Do not fabricate. If uncertain, omit.
- For each paper, state its specific relationship to this section — not generic "it's related"
- Flag notable absences: well-known papers in this area that the authors should have cited but likely didn't
- Be honest about citation quality: if the authors are citing older or weaker work when stronger comparisons exist, say so
- "notableAbsence" entries are as important as "relatedPapers" — they surface the gaps a reviewer would catch

Return ONLY valid JSON:
{
  "relatedPapers": [
    {
      "title": "Exact paper title",
      "authors": ["Author names"],
      "year": "Publication year",
      "venue": "Journal or Conference",
      "relevance": "highly-relevant" | "relevant" | "background",
      "relationship": "builds-upon" | "directly-contradicts" | "validates" | "stronger-baseline-ignored" | "foundational",
      "criticalNote": "1 sentence: what specifically this paper adds or challenges relative to the section's claims"
    }
  ],
  "notableAbsences": [
    {
      "description": "A well-known paper or line of work the authors should have engaged with but didn't",
      "why": "Why its omission matters for this section's claims"
    }
  ],
  "citationAudit": "1–2 sentences: is the related work coverage adequate, or are there systematic gaps (e.g., only citing own group, ignoring contrasting methods)?",
  "researchGap": "What gap does this section address — be precise about what was missing before this work"
}`

    const userPrompt = `Perform a literature audit of this section from "${documentTitle || 'Unknown'}" by ${documentAuthors || 'Unknown Authors'}.

${documentAbstract ? `Abstract: ${documentAbstract.substring(0, 500)}` : ''}

Section Content:
${sectionContent.substring(0, 4000)}

Identify real related papers and flag citation gaps. Distinguish between what the authors cited and what they should have cited.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.2,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { relatedPapers: [], keyThemes: [], researchGap: 'Could not parse response' }
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[RELATED WORK] Error:', error)
    return NextResponse.json(
      { error: 'Related work analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
