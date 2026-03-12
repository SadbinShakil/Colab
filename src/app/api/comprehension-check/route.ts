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
      // Demo questions
      const demo: ComprehensionQuestion[] = [
        {
          id: 'q1',
          question: `What is the main contribution described in ${sectionName || 'this section'}?`,
          options: [
            'A new algorithm for data processing',
            'The key finding or methodology presented',
            'A comparison with existing approaches',
            'Future work recommendations'
          ],
          correctIndex: 1,
          explanation: 'The main contribution is typically the novel finding or methodology the authors introduce.',
          difficulty: 'basic'
        },
        {
          id: 'q2',
          question: 'Which aspect does the author emphasize most in this section?',
          options: [
            'Theoretical foundations',
            'Experimental results',
            'Limitations of the approach',
            'Practical applications'
          ],
          correctIndex: 0,
          explanation: 'Identifying the emphasis helps understand the author\'s priority in this section.',
          difficulty: 'intermediate'
        },
        {
          id: 'q3',
          question: 'How does this section connect to the overall paper?',
          options: [
            'It introduces background context',
            'It validates the proposed approach',
            'It summarizes prior work',
            'It presents the core methodology'
          ],
          correctIndex: 3,
          explanation: 'Understanding how sections connect is key to grasping the paper\'s narrative.',
          difficulty: 'advanced'
        }
      ]
      return NextResponse.json({ questions: demo.slice(0, count) })
    }

    const systemPrompt = `You are an expert academic tutor creating comprehension check questions for researchers reading academic papers. Generate multiple-choice questions that test genuine understanding — not just recall.

Rules:
- Questions should test conceptual understanding, not just memory
- All 4 options should be plausible (avoid obviously wrong answers)
- Explanations should teach, not just restate the answer
- Difficulty levels: basic (recall/definition), intermediate (application/analysis), advanced (synthesis/evaluation)
- Questions should be specific to the provided content`

    const userPrompt = `Paper: "${documentTitle || 'Academic Paper'}"
Section: "${sectionName || 'Current Section'}"

Section Content:
${sectionContent.substring(0, 4000)}

Generate exactly ${count} multiple-choice comprehension questions.
Difficulty mix: ${difficulty === 'mixed' ? '1 basic, 1 intermediate, 1 advanced (for 3 questions; scale proportionally for more)' : difficulty}

Return a JSON array with this exact structure:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "...",
    "difficulty": "basic|intermediate|advanced"
  }
]

Return ONLY the JSON array, no other text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.6,
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
