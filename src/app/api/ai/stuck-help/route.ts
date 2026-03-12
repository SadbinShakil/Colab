import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stuckHelpId, description, section, documentTitle, page, documentContent } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert research tutor helping a researcher who is stuck reading an academic paper. Your goal is to provide a clear, specific, and helpful explanation that directly addresses their confusion.

Be:
- Specific to their actual question (never use placeholder text like [concept] or [example])
- Clear and accessible without dumbing it down
- Encouraging but not patronizing
- Focused on moving them forward

Structure your response as:
1. A direct answer to their confusion (2-3 sentences)
2. A step-by-step breakdown of the concept
3. A concrete analogy or example
4. What they need to know first (if anything is missing)
5. Suggested next steps (1-2 practical actions)`

    const userPrompt = `A researcher is stuck reading "${documentTitle || 'an academic paper'}".

Section: ${section || 'Not specified'}
Page: ${page || 'Not specified'}
Their problem: ${description}

${documentContent ? `Relevant paper content for context:\n${documentContent.substring(0, 4000)}` : ''}

Please give a specific, helpful explanation that addresses exactly what they described. Reference the actual content of the paper if context is provided.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.5,
    })

    const response = completion.choices[0]?.message?.content || 'No response generated.'

    return NextResponse.json({
      response,
      confidence: 0.9,
      sources: [
        documentTitle ? `"${documentTitle}" paper content` : 'Paper content',
        'AI research knowledge base'
      ]
    })

  } catch (error: any) {
    console.error('Error generating stuck-help AI response:', error)
    return NextResponse.json(
      { error: `Failed to generate AI response: ${error.message || String(error)}` },
      { status: 500 }
    )
  }
}
