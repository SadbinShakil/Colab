import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { paperText, paperTitle, paperAuthors, paperVenue, paperYear } = await request.json()
    if (!paperText) return NextResponse.json({ error: 'paperText is required' }, { status: 400 })

    const prompt = `You are a senior researcher who has just read this paper carefully. A colleague is about to read it and asks you: "What do I actually need to know before reading this? What will block me?"

Give them the honest, specific answer you would give in person — not a generic overview.

PAPER:
Title: ${paperTitle || 'Unknown'}
Authors: ${paperAuthors || 'Unknown'}
Venue: ${paperVenue || 'Unknown'}, ${paperYear || ''}

FULL TEXT:
${paperText.slice(0, 14000)}

Return JSON with this exact structure. Every item must be specific to THIS paper — extracted from what you actually read. No generic field-level advice.

{
  "whoIsThisFor": {
    "intendedAudience": "exactly who the authors wrote this for — be specific (e.g. 'researchers who have implemented attention-based models and are familiar with BERT-style pretraining')",
    "minimumBackground": "the minimum background without which reading is futile — be honest and specific",
    "willStruggleIf": ["3-5 specific things that will make this paper hard to follow — pulled from actual content"],
    "willFindEasyIf": ["2-3 backgrounds that make this paper straightforward"]
  },
  "blockingConcepts": [
    {
      "concept": "the specific concept name as used in this paper",
      "whereItAppears": "which section/part of the paper uses this heavily",
      "whatYouNeedToKnow": "specifically what you need to understand about this concept to follow that section — not a textbook definition, but what aspect matters HERE",
      "ifYouAreMissing": "exactly what will be confusing or wrong if you don't know this",
      "howToFillGap": "the single most direct way to get up to speed — a specific resource, paper, or concept to look up first"
    }
  ],
  "mustReadPapers": [
    {
      "title": "exact real paper title",
      "authors": "key authors",
      "year": "year",
      "whyBlocking": "this paper is referenced/built upon in Section X — without knowing it, you will not understand Y",
      "whatToGetFromIt": "you only need to understand this specific part: ...",
      "canSkipIfYouKnow": "if you already know [concept], you can skip reading the full paper"
    }
  ],
  "terminology": [
    {
      "term": "exact term as this paper uses it",
      "thePapersDefinition": "how this paper defines or uses this term — quote the paper where possible",
      "notToBeConfusedWith": "the most common misunderstanding — what people assume this means vs what the paper means",
      "whereItMatters": "which part of the paper this term is central to"
    }
  ],
  "assumedKnowledge": [
    {
      "topic": "topic the paper assumes without explaining",
      "evidence": "quote or reference showing the paper assumes this (e.g. 'the paper uses X without defining it in Section 2')",
      "depth": "surface familiarity | working knowledge | deep understanding",
      "quickReference": "best resource to get the needed depth quickly"
    }
  ],
  "readingApproach": {
    "doFirst": "the single most important thing to do BEFORE opening this paper",
    "startHere": "which section to read first and why — sometimes it's not the introduction",
    "skipIfStruggling": "what you can legitimately skip on a first read without losing the core argument",
    "watchOutFor": ["2-4 specific places in the paper where readers commonly get lost or misread the argument — be specific about what the misreading is"]
  }
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.15,
      max_tokens: 3500,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[paper-prerequisites]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
