import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/highlight-locate
 *
 * Semantic passage finder for the "Find in paper" feature.
 *
 * Given a page's token text and what kind of information we're looking for
 * (gap, claim, result, validation, concept, etc.), asks GPT-4o to:
 *   1. Understand what that type of content looks like in a research paper
 *   2. Find the passage on this page that expresses that meaning
 *   3. Return verbatim excerpts copied character-for-character from the page text
 *
 * The returned excerpts are matched against PDF text layer spans for highlighting.
 */

const CONTENT_TYPE_GUIDANCE: Record<string, string> = {
  gap: `The "gap" is the problem prior work left unsolved that motivated this paper.
Look for: statements about what existing approaches fail to do, what has not been studied,
limitations of previous systems, phrases like "however", "but", "yet", "lack", "limited",
"do not", "fail to", "no existing work", "previous methods", "prior approaches".`,

  claim: `The "core claim" or "contribution" is the main thing this paper argues or builds.
Look for: the paper's thesis statement, sentences starting with "we propose", "we introduce",
"we present", "this paper", "our approach", "our system", "we show", "we demonstrate",
"our key contribution", or the abstract's description of what the paper does.`,

  result: `The "headline result" is the key empirical finding or outcome.
Look for: numbers, percentages, performance metrics, comparisons to baselines,
sentences with "outperforms", "improves", "achieves", "accuracy", "results show",
"we found", "our evaluation", "significantly better", table or figure references with numbers.`,

  validation: `The "validation" or "evaluation" describes how the authors tested their approach.
Look for: descriptions of experiments, user studies, datasets used, evaluation methodology,
"we conducted", "we evaluated", "participants", "study", "experiment", "benchmark",
"dataset", "baseline", "compared against", "to evaluate".`,

  concept: `This is a technical concept or term the paper defines or uses.
Look for: the sentence where this concept is first defined or explained,
sentences with "we define", "is defined as", "refers to", "we call", "denotes",
or the first use of the term in context with surrounding explanation.`,

  pitfall: `This is a common misreading or tricky part of the paper.
Look for: the specific passage that is ambiguous or easily misread — where the paper
makes a claim that could be interpreted in multiple ways, or where terminology
is used in a non-standard way.`,

  weakness: `This is a methodological limitation of the paper.
Look for: the passage where the authors acknowledge limitations, make assumptions,
use a small sample, or where the evidence is thin — "limitation", "future work",
"we acknowledge", "small sample", "only", "preliminary", or passages where
claims exceed the evidence.`,

  default: `Find the passage that most directly expresses the described concept or finding.
Look for the most specific, informative sentence — not a heading or generic statement.`,
}

function getGuidance(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('gap') || l.includes('prior') || l.includes('problem') || l.includes('motiv')) return CONTENT_TYPE_GUIDANCE.gap
  if (l.includes('claim') || l.includes('contribut') || l.includes('propos') || l.includes('introduc')) return CONTENT_TYPE_GUIDANCE.claim
  if (l.includes('result') || l.includes('finding') || l.includes('headline') || l.includes('outcome')) return CONTENT_TYPE_GUIDANCE.result
  if (l.includes('validat') || l.includes('evaluat') || l.includes('test') || l.includes('study') || l.includes('experiment')) return CONTENT_TYPE_GUIDANCE.validation
  if (l.includes('concept') || l.includes('term') || l.includes('defin')) return CONTENT_TYPE_GUIDANCE.concept
  if (l.includes('pitfall') || l.includes('misread') || l.includes('trip')) return CONTENT_TYPE_GUIDANCE.pitfall
  if (l.includes('weak') || l.includes('limit') || l.includes('methodolog')) return CONTENT_TYPE_GUIDANCE.weakness
  return CONTENT_TYPE_GUIDANCE.default
}

export async function POST(request: NextRequest) {
  try {
    const { pageText, label, summary, page } = await request.json()
    if (!pageText || !label) {
      return NextResponse.json({ error: 'pageText and label are required' }, { status: 400 })
    }

    const guidance = getGuidance(label)
    const trimmedPageText = pageText.slice(0, 4000)

    const prompt = `You are a research paper analyst helping highlight the exact passage in a PDF.

PAGE ${page} TEXT:
"""
${trimmedPageText}
"""

WHAT TO FIND: ${label}
WHAT THE BRIEFING SAID ABOUT IT: "${summary || ''}"

SEMANTIC GUIDANCE — what this type of content looks like in a research paper:
${guidance}

YOUR TASK:
1. Read the page text carefully and understand what is being discussed
2. Find the 1–3 sentences that most directly express "${label}" on this page
3. Return those sentences COPIED VERBATIM from the PAGE TEXT above — character for character, no changes

STRICT RULES:
- Copy text EXACTLY as it appears in PAGE TEXT — same spelling, same punctuation, same spacing
- Do NOT paraphrase, summarize, or rephrase anything
- Do NOT combine sentences that aren't adjacent in the original
- If the page does not contain relevant content for this label, return an empty array
- Return only the most informative passage — not headings, section numbers, or author names

Return JSON: { "excerpts": ["verbatim excerpt 1", "verbatim excerpt 2"] }`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 500,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const rawExcerpts: string[] = Array.isArray(result.excerpts)
      ? result.excerpts.filter((s: unknown) => typeof s === 'string' && s.trim().length > 10)
      : []

    // Verify each excerpt actually exists verbatim in the page text.
    // If GPT paraphrased slightly, try to find the longest matching substring.
    // Return both the verified excerpt and its char offsets in pageText.
    const excerpts = rawExcerpts
      .map((excerpt: string) => {
        // Try exact match first
        const idx = trimmedPageText.indexOf(excerpt)
        if (idx !== -1) return { text: excerpt, start: idx, end: idx + excerpt.length - 1 }

        // Try case-insensitive
        const lower = trimmedPageText.toLowerCase()
        const idx2 = lower.indexOf(excerpt.toLowerCase())
        if (idx2 !== -1) return { text: trimmedPageText.slice(idx2, idx2 + excerpt.length), start: idx2, end: idx2 + excerpt.length - 1 }

        // GPT changed the text — find the longest word run from excerpt that exists in pageText
        const words = excerpt.toLowerCase().split(/\s+/).filter(Boolean)
        for (let size = words.length; size >= 4; size--) {
          for (let start = 0; start <= words.length - size; start++) {
            const phrase = words.slice(start, start + size).join(' ')
            if (phrase.length < 12) continue
            const i = lower.indexOf(phrase)
            if (i !== -1) return { text: trimmedPageText.slice(i, i + phrase.length), start: i, end: i + phrase.length - 1 }
          }
        }
        return null
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, excerpts })
  } catch (error: unknown) {
    console.error('[highlight-locate]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
