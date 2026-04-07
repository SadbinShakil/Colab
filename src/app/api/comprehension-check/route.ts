import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

export interface ComprehensionQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

export async function POST(request: NextRequest) {
  try {
    const { sectionName, sectionContent, documentTitle, difficulty = 'mixed', count = 3 } = await request.json()

    if (!sectionContent) {
      return NextResponse.json({ error: 'sectionContent is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env to enable self-test.' }, { status: 503 })
    }

    const systemPrompt = `You are embedded in CoRead, a reading system for PhD researchers. Your task is to generate self-test questions that expose whether a researcher has genuinely understood a section — not whether they can recall surface facts.

Hard rules:
- Every question must be anchored to a specific claim, mechanism, or finding in the provided section text. No generic questions.
- Wrong options must be plausible to someone who skimmed but didn't understand — not obviously wrong distractors.
- The explanation must identify the exact sentence or phrase in the section that resolves the question.
- Difficulty levels: basic = tests a specific factual claim from the text; intermediate = requires understanding a mechanism or relationship; advanced = requires evaluating an inferential step, assumption, or limitation.
- Do not ask "what is the main contribution" — that tests skimming, not reading.`

    const userPrompt = `Paper: "${documentTitle || 'Academic Paper'}"
Section: §${sectionName || 'Current Section'}

Section text:
${sectionContent.substring(0, 4000)}

Generate exactly ${count} multiple-choice questions grounded strictly in the above section text.
Difficulty mix: ${difficulty === 'mixed' ? '1 basic, 1 intermediate, 1 advanced (for 3 questions; scale proportionally for more)' : difficulty}

Return a JSON object with key "questions" containing an array:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "...",
    "difficulty": "basic|intermediate|advanced"
  }
]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{"questions":[]}'
    let questions: ComprehensionQuestion[] = []

    try {
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.items || [])
      questions = arr.slice(0, count).map((q: any, i: number) => ({
        id: `q${i + 1}-${Date.now()}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'intermediate'
      }))
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ questions })

  } catch (error: any) {
    console.error('[Comprehension Check] Error:', error)
    return NextResponse.json(
      { error: `Failed to generate questions: ${error.message || String(error)}` },
      { status: 500 }
    )
  }
}
