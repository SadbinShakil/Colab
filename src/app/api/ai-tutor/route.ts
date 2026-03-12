// src/app/api/ai-tutor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || 'dummy-key';
const openai = new OpenAI({ apiKey })

export async function POST(request: NextRequest) {
  try {
    const { message, context, sectionName, conversationHistory, userId, userName, documentContent } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    console.log(`🎓 [AI Tutor] Request from ${userName || 'user'}: "${message.substring(0, 80)}"`)


    // Mock response for demo/testing
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      const mockResponse = `## Quick Explanation (Demo Mode)

**Your Question:** "${message.substring(0, 80)}..."

**Section:** ${sectionName}

### 🎯 Simplified Explanation
This concept can be tricky! Let me break it down:

**Main Idea:** The core concept here involves understanding how different components work together.

**Think of it like this:** Imagine you're building with LEGO blocks. Each piece has a specific function, and when you connect them properly, you create something more complex.

### 💡 Key Points
1. **First Concept:** The foundational element that everything builds upon
2. **Second Concept:** How this connects to related ideas
3. **Practical Application:** Why this matters in real-world scenarios

### 🔄 Still Confused?
No worries! Try these:
- Break it into smaller parts
- Look for real-world examples
- Connect it to something you already know

**Need more help?** Feel free to ask follow-up questions!

*Note: This is a demo response. Add your OpenAI API key to .env for personalized tutoring.*`

      return NextResponse.json({
        success: true,
        response: mockResponse
      })
    }

    // Build system prompt for tutoring
    const systemPrompt = `You are an AI Tutor for LitSense, helping students understand research papers they're reading.

**Current Context:**
- **Section:** ${sectionName}
- **Student:** ${userName || 'Student'} (ID: ${userId || 'unknown'})

**Section Content:**
${documentContent ? documentContent.substring(0, 10000) : 'Content not available'}

**Student's Confused Highlights:**
${context || 'No specific highlights provided'}

**Your Role as a Tutor:**
1. **Explain complex concepts in simple, accessible language**
   - Use everyday analogies and examples
   - Break down technical jargon step-by-step
   - Avoid overwhelming the student with too much detail at once

2. **Be encouraging and patient**
   - Acknowledge that research papers are challenging
   - Celebrate small wins and progress
   - Never make the student feel inadequate

3. **Provide structured explanations**
   - Start with the main idea
   - Break into digestible chunks
   - Use bullet points for clarity
   - End with a summary or next steps

4. **Use learning strategies**
   - Connect new concepts to things they already know
   - Provide real-world examples when possible
   - Use analogies liberally (especially everyday objects/situations)
   - Offer multiple ways to think about the same concept

5. **Encourage active learning**
   - Ask clarifying questions if needed
   - Suggest follow-up questions they might explore
   - Recommend ways to verify their understanding

**Response Format:**
- Keep initial responses concise (2-3 short paragraphs max)
- Use markdown for better readability
- Include emojis sparingly for engagement (🎯, 💡, 🔄, etc.)
- Break complex explanations into numbered/bulleted lists
- Always end with encouragement or a follow-up suggestion

**Tone:**
- Friendly and approachable (like a helpful study buddy)
- Patient and non-judgmental
- Enthusiastic about helping them understand
- Conversational, not overly academic or formal

**Remember:** You're helping someone actively reading a research paper who's stuck on something specific. They need quick, clear help to continue reading - not a comprehensive lecture.`

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []

    // Add system prompt
    messages.push({
      role: 'system',
      content: systemPrompt
    })

    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        })
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1500,
      temperature: 0.7,
    })

    const tutorResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    console.log(`✅ [AI Tutor] Response generated (${tutorResponse.length} chars)`)

    return NextResponse.json({
      success: true,
      response: tutorResponse
    })

  } catch (error) {
    console.error('❌ [AI Tutor] Error:', {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({
      error: `Failed to get AI tutor response: ${error instanceof Error ? error.message : String(error)}`,
      details: error instanceof Error ? error.toString() : String(error),
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 })
  }
}