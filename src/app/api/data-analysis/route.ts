import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const {
      tableData,
      caption,
      question,
      documentTitle,
      documentContent,
      analysisType = 'comprehensive'
    } = await request.json()

    if (!tableData && !caption && !question) {
      return NextResponse.json({ error: 'Table data, caption, or question is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a data scientist and research statistician specializing in interpreting tables, figures, and quantitative data in academic papers.

Your role is to:
- Explain what the data shows in plain language
- Identify key trends, patterns, and outliers
- Interpret statistical significance and effect sizes
- Connect data findings to the paper's research questions
- Highlight what the numbers actually mean in context

Be specific about numbers. Do not be vague. If you see p < 0.05, explain what that means. If you see accuracy percentages, compare them. Be a research collaborator, not just a descriptor.`

    let userPrompt = `Analyze this data from the paper "${documentTitle || 'Unknown'}".`

    if (caption) {
      userPrompt += `\n\nTable/Figure Caption: ${caption}`
    }

    if (tableData) {
      userPrompt += `\n\nData Content:\n${tableData.substring(0, 5000)}`
    }

    if (documentContent) {
      userPrompt += `\n\nPaper Context (for interpretation):\n${documentContent.substring(0, 3000)}`
    }

    if (question) {
      userPrompt += `\n\nSpecific Question: ${question}`
    } else {
      if (analysisType === 'comprehensive') {
        userPrompt += `\n\nProvide a comprehensive analysis covering:
1. What the data shows (key values, trends, patterns)
2. Statistical interpretation (if applicable)
3. Main findings and what they mean for the research
4. Comparisons between groups/conditions/methods
5. Practical significance of the results`
      } else {
        userPrompt += `\n\nProvide a brief explanation of what this data shows and what it means for the paper's conclusions.`
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: analysisType === 'comprehensive' ? 1500 : 600,
      temperature: 0.3,
    })

    const answer = completion.choices[0]?.message?.content || 'No analysis generated'

    return NextResponse.json({
      success: true,
      analysis: answer,
      analysisType,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[DATA ANALYSIS] Error:', error)
    return NextResponse.json(
      { error: 'Data analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
