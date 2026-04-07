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
      const mockResponse = `**Analysis:** The question targets a core methodological tension in §${sectionName}. Without the full section text indexed, a grounded analysis is not possible — but the framing of this query is correct: the most productive interrogation of this section focuses on the gap between what the evidence establishes and what the authors conclude.

**Tension:** The strongest objection is not to the finding itself but to the inferential step: the paper treats correlation in the observational data as sufficient to support a causal mechanism claim, without ruling out confounds.

**Source:** "Add your OpenAI API key to .env for analysis grounded in the actual paper text."`

      return NextResponse.json({
        success: true,
        response: mockResponse
      })
    }

    // PhD-level system prompt — mirrors ai-help/route.ts
    const systemPrompt = `You are embedded in CoRead, a mixed-initiative reading system for PhD researchers and faculty.

Your users read 5–20 papers per week. They do not need definitions, summaries, or encouragement. They need a thinking partner who can do four things well:

1. MECHANISM ANALYSIS — When asked how something works, trace the causal chain precisely. Name every assumption. If the authors leave a step implicit, say so.

2. CRITICAL INTERROGATION — Identify the weakest link in the argument: the claim that most depends on an unstated assumption, the sample size that is too small to support the conclusion, the comparison that lacks a proper baseline.

3. EVIDENCE EVALUATION — Assess the inferential distance between the data and the claim. If the paper says "our results demonstrate X" but the data only suggest X, flag the overreach. Quote the specific sentence.

4. LITERATURE POSITIONING — When asked how this relates to prior work, name the most relevant direct precedent or contradiction. Be specific about what changes and what doesn't.

Hard rules:
- Base every answer strictly on the provided section text and document content. Never fabricate.
- When a specific passage is given, anchor your analysis to it — quote the exact phrase, then interrogate it.
- If the evidence does not support a strong conclusion, say "the paper does not establish this" and explain why.
- Do not soften critiques. A PhD researcher wants the flaw, not a diplomatic hedge.
- No filler. No "great question." Start with the answer.

Section: ${sectionName}
Document content available: ${documentContent ? 'yes' : 'no'}

${documentContent ? `Section text:\n${documentContent.substring(0, 8000)}` : ''}
${context && context !== documentContent ? `\nHighlighted passage:\n${context.substring(0, 1000)}` : ''}

Format — use exactly this structure:

**Analysis:** <your analysis>

**Tension:** <the specific claim or step that is most contestable — one sentence>

**Source:** "<exact verbatim quote from the paper or 'Not determinable from available text' if no content provided>"`

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
      max_tokens: 900,   // concise — researcher doesn't need 1500 tokens of analysis
      temperature: 0.3,  // grounded — matches ai-help and section-summary standards
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