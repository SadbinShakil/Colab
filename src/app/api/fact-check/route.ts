import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { claim, documentContext, documentTitle } = await request.json()

    if (!claim) {
      return NextResponse.json({ error: 'Claim is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a rigorous academic fact-checker. Your role is to assess whether a specific claim made in or about a research paper is:
- Factually accurate based on scientific consensus
- Consistent with the document context provided
- Supported or refuted by known research

Be concise and precise. Do not fabricate citations. If you are uncertain, say so explicitly.

Return a JSON object with:
{
  "verdict": "supported" | "refuted" | "uncertain" | "context-dependent",
  "confidence": 0.0 to 1.0,
  "explanation": "1-2 sentence explanation",
  "caveats": "any important nuances or limitations (optional)"
}`

    const userPrompt = `Fact-check this claim:

CLAIM: "${claim}"

${documentContext ? `DOCUMENT CONTEXT (from paper "${documentTitle || 'Unknown'}"):\n${documentContext.substring(0, 3000)}` : 'No document context provided.'}

Assess the claim's accuracy. If it is from the document, check if the document actually supports it. If it is a general scientific claim, check against known consensus.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.1,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = {
        verdict: 'uncertain',
        confidence: 0.5,
        explanation: responseText.substring(0, 200),
        caveats: 'JSON parsing failed; raw response provided'
      }
    }

    return NextResponse.json({
      success: true,
      claim,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[FACT CHECK] Error:', error)
    return NextResponse.json(
      { error: 'Fact-check failed', details: String(error) },
      { status: 500 }
    )
  }
}
