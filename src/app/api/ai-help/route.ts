import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { question, documentContent, documentTitle, documentAuthors, documentUrl, userId, userName } = await request.json()
    if (!question || !documentContent) {
      return NextResponse.json({ error: 'Missing question or document content' }, { status: 400 })
    }
    const systemPrompt = `You are an expert AI research assistant. You help users understand and analyze academic documents. Use the provided document content and metadata to answer the user's question in detail, citing the document where possible.`
    const userPrompt = `Document Title: ${documentTitle || 'N/A'}\nAuthors: ${documentAuthors || 'N/A'}\nURL: ${documentUrl || 'N/A'}\n\nDocument Content (excerpt):\n${documentContent.slice(0, 3000)}\n\nUser (${userName || 'Anonymous'}): ${question}`
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })
    const answer = completion.choices[0]?.message?.content || 'No answer generated.'
    return NextResponse.json({ success: true, response: { answer } })
  } catch (error) {
    console.error('AI help error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
} 