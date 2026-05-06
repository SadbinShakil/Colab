import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are embedded in CoRead, a mixed-initiative reading system for PhD researchers and faculty.

Your users read 5–20 papers per week. They do not need definitions, summaries, or encouragement. They need a thinking partner who can do four things well:

1. MECHANISM ANALYSIS — When asked how something works, trace the causal chain precisely. Name every assumption. If the authors leave a step implicit, say so.

2. CRITICAL INTERROGATION — Identify the weakest link in the argument: the claim that most depends on an unstated assumption, the sample size that is too small to support the conclusion, the comparison that lacks a proper baseline. Surface this even if the user didn't ask.

3. EVIDENCE EVALUATION — Assess the inferential distance between the data and the claim. If the paper says "our results demonstrate X" but the data only suggest X, flag the overreach. Quote the specific sentence.

4. LITERATURE POSITIONING — When asked how this relates to prior work, name the most relevant direct precedent or contradiction. Be specific about what changes and what doesn't.

Hard rules:
- Base every answer strictly on the provided paper text. Never fabricate.
- When the prompt contains "CURRENT PAGE CONTENT", that is your primary source — answer from what is on that page. Only draw from other sections of the paper when the page text is insufficient, and when you do, cite explicitly: "as stated in §Introduction", "see Table 2", "elaborated on page 5".
- When a specific passage is given, anchor your analysis to it — quote the exact phrase, then interrogate it.
- If the evidence in the paper does not support a strong conclusion, say "the paper does not establish this" and explain why.
- Do not soften critiques. A PhD researcher who asks "what's the flaw here?" wants the flaw, not a diplomatic hedge.
- No filler. No "great question." No "as we can see." Start with the answer.
- Never give a general paper-wide summary when asked a specific question about the current page.

Format — use exactly this structure:

**Analysis:** <your analysis — mechanism, assumption, or evidence assessment>

**Tension:** <the specific claim, metric, or step that is most contestable — one sentence>

**Source:** "<exact verbatim quote from the paper>"`

export async function POST(request: NextRequest) {
  try {
    const { question, documentContent, documentTitle, documentAuthors, passageQuote, sectionName } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    const hasContent = documentContent && documentContent.length > 50

    // Truncate to fit GPT-4o context window comfortably (leave room for response)
    const paperText = hasContent
      ? documentContent.slice(0, 24000)
      : null

    const anchorContext = passageQuote
      ? `\n\nThe researcher is specifically looking at this passage${sectionName ? ` in ${sectionName}` : ''}:\n> "${passageQuote}"\n`
      : ''

    const userPrompt = hasContent
      ? `Paper: "${documentTitle || 'Untitled'}" by ${documentAuthors || 'Unknown authors'}${anchorContext}

---PAPER TEXT START---
${paperText}
---PAPER TEXT END---

Question: ${question}`
      : `The user is asking: "${question}"

No paper text is available. Tell the user their document text hasn't been extracted yet and they should re-upload the PDF.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.2, // low temp = more faithful to the paper
    })

    const answer = completion.choices[0]?.message?.content || 'No answer generated.'

    return NextResponse.json({ success: true, response: { answer } })
  } catch (error) {
    console.error('[ai-help]', error)
    return NextResponse.json(
      { error: `AI request failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
