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

    const systemPrompt = `You are an expert research librarian and academic advisor. Given a section of a research paper, identify the most relevant prior and related work that readers should know about.

Focus on:
1. Papers this section directly builds upon or cites
2. Alternative approaches to the same problem
3. Papers that validate or challenge these findings
4. Seminal works in this specific sub-area

Return a JSON array of related papers. Each paper must be real and well-known. Do not fabricate papers.

Return format:
{
  "relatedPapers": [
    {
      "title": "Exact paper title",
      "authors": ["Author names"],
      "year": "Publication year",
      "venue": "Journal or Conference",
      "relevance": "highly-relevant" | "relevant" | "background",
      "relationship": "builds-upon" | "contrasts-with" | "validates" | "alternative-approach" | "foundational",
      "summary": "1 sentence on why this is related to the section content"
    }
  ],
  "keyThemes": ["2-4 main themes from this section"],
  "researchGap": "What gap does this section address (1 sentence)"
}`

    const userPrompt = `Analyze this section from the paper "${documentTitle || 'Unknown'}" by ${documentAuthors || 'Unknown Authors'}.

${documentAbstract ? `Paper Abstract: ${documentAbstract.substring(0, 500)}` : ''}

Section Content:
${sectionContent.substring(0, 4000)}

Identify real related papers that are most relevant to this specific section.`

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
