import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { statement, passageText, sectionName } = await request.json()

    if (!statement) return NextResponse.json({ stance: 'qualify', level: 'analytical', score: 0.5 })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Classify the stance and analytical depth of an academic position statement. Respond with JSON only: { "stance": "support"|"challenge"|"qualify"|"extend", "level": "surface"|"analytical"|"methodological"|"synthetic", "score": 0.0-1.0 }' },
        { role: 'user', content: `Section: ${sectionName}\nPassage: "${(passageText || '').slice(0, 200)}"\nStatement: "${statement}"` }
      ],
      max_tokens: 40,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const result = JSON.parse(raw)
    return NextResponse.json({ ...result })
  } catch {
    return NextResponse.json({ stance: 'qualify', level: 'analytical', score: 0.5 })
  }
}
