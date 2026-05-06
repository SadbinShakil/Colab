import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/paper-orientation
 *
 * Single endpoint that produces everything the Paper Orientation Modal needs.
 * Runs two independent GPT-4o calls in parallel:
 *   (1) glance    — what this paper actually does, the gap it fills, core claim
 *   (2) prereqs   — top blocking concepts, must-read papers, entry point, pitfalls
 *
 * Both calls are scoped to the first 14 000 chars of the paper text so the
 * combined latency stays under ~10 s.
 */
export async function POST(request: NextRequest) {
  try {
    const { paperText, paperTitle, paperAuthors, paperVenue, paperYear } = await request.json()
    if (!paperText) return NextResponse.json({ error: 'paperText is required' }, { status: 400 })

    const textSlice = paperText.slice(0, 14000)
    const meta = `Title: ${paperTitle || 'Unknown'}
Authors: ${paperAuthors || 'Unknown'}
Venue: ${paperVenue || 'Unknown'}, ${paperYear || ''}`

    /* ------------------------------------------------------------------ */
    /* CALL 1 — Paper at a Glance                                           */
    /* ------------------------------------------------------------------ */
    const glancePrompt = `You are a senior researcher briefing a new lab member in person.
They've just received a PDF and have 90 seconds before a group meeting.
Tell them exactly what they need to know so they can follow the meeting.

${meta}

PAPER TEXT (first 14 000 chars):
${textSlice}

IMPORTANT: The paper text above contains page markers in the format "--- Page N ---" or the text is laid out sequentially from page 1. Estimate which page number (1-based integer) each piece of information comes from based on position in the text. If markers are absent, estimate from text position proportionally.

Return JSON with this exact structure. Every field must be specific to THIS paper.

{
  "oneSentence": "what the paper does in one precise sentence — no fluff, no 'this paper proposes'",
  "problemGap": "the exact gap in prior work that motivated this paper — why did this need to exist?",
  "problemGapPage": 2,
  "problemGapQuote": "verbatim sentence or short phrase from the paper that best expresses this gap — max 120 chars",
  "coreClaim": "the single most important claim or contribution — if you had to stake your reputation on one thing from this paper, what is it?",
  "coreClaimPage": 1,
  "coreClaimQuote": "verbatim sentence or short phrase from the paper that states this claim most directly — max 120 chars",
  "howTheyTestIt": "the specific evaluation — what experiment, dataset, benchmark, or user study do they use to validate the core claim?",
  "howTheyTestItPage": 4,
  "howTheyTestItQuote": "verbatim sentence or short phrase from the paper that describes the evaluation method — max 120 chars",
  "keyResult": "the headline number or outcome — the one result a reviewer would quote in their summary",
  "keyResultPage": 6,
  "keyResultQuote": "verbatim sentence or short phrase from the paper that states the key result — max 120 chars",
  "isItForYou": {
    "yes": ["2-3 specific backgrounds for whom this paper is directly relevant and actionable"],
    "no": ["2-3 specific backgrounds who will find this paper peripheral or hard to apply"]
  },
  "readingDifficulty": {
    "level": "Accessible | Moderate | Dense | Very Dense",
    "reason": "specific reason — what makes it dense or accessible (notation, assumed background, writing style)"
  },
  "venueSignal": "what the publication venue tells you about the paper's ambition, maturity, and peer-review bar — be direct"
}`

    /* ------------------------------------------------------------------ */
    /* CALL 2 — Before You Dive In                                          */
    /* ------------------------------------------------------------------ */
    const prereqPrompt = `You are a senior researcher. A junior colleague is about to read this paper cold.
Give them the exact preparation they need — not generic advice, but what THIS paper specifically requires.

${meta}

PAPER TEXT (first 14 000 chars):
${textSlice}

IMPORTANT: Estimate which page number (1-based integer) each piece of information appears on, based on position in the text above.

Return JSON with this exact structure.

{
  "blockingConcepts": [
    {
      "concept": "exact concept name as the paper uses it",
      "section": "which section/part of the paper this blocks",
      "whatBreaks": "exactly what you will misunderstand or misread if you don't know this — be specific",
      "oneLiner": "the one thing you need to understand about this concept to follow the paper — not a textbook definition",
      "howToGetIt": "the fastest path to getting up to speed — one specific resource, paper, or lookup",
      "sourcePage": 3,
      "sourceQuote": "verbatim phrase from the paper where this concept first appears or is defined — max 100 chars"
    }
  ],
  "mustReadFirst": [
    {
      "title": "exact real paper title",
      "authors": "key authors (last name et al. format)",
      "year": "year",
      "coreClaim": "what this prerequisite paper actually argues in one sentence — not what it's about, its specific claim or finding",
      "whyBlocking": "which section of the current paper depends on this, and what specifically breaks if you skip it",
      "whatToExtract": "you only need to read Section X / understand concept Y from this paper — be narrow and specific"
    }
  ],
  "entryPoint": {
    "startAt": "which section to read first — sometimes not the introduction",
    "why": "specific reason — what context does starting here give that the intro doesn't?",
    "beforeOpening": "the single most valuable thing to do in the 5 minutes before you open the paper",
    "startAtPage": 1
  },
  "pitfalls": [
    {
      "where": "specific section, figure, or concept",
      "misreading": "the specific wrong interpretation a reader commonly forms here",
      "correction": "what the paper actually means or intends",
      "sourcePage": 5,
      "sourceQuote": "verbatim phrase from the paper that triggers this misreading — max 100 chars"
    }
  ],
  "termsThatTripPeople": [
    {
      "term": "term as used in this paper",
      "paperMeans": "what this paper means by it — quote the paper if possible",
      "notToConfuseWith": "the most common incorrect assumption about what this term means",
      "sourcePage": 2,
      "sourceQuote": "verbatim phrase from the paper that introduces or uses this term — max 100 chars"
    }
  ]
}`

    /* ------------------------------------------------------------------ */
    /* CALL 3 — PhD-level critical reading layer                           */
    /* ------------------------------------------------------------------ */
    const critiquePrompt = `You are a rigorous peer reviewer with deep domain expertise, briefing a PhD researcher before they read this paper. Your job is not to summarise — it is to arm the researcher with the critical questions and methodological red flags they need to read this paper sceptically.

${meta}

PAPER TEXT (first 14 000 chars):
${textSlice}

IMPORTANT: Estimate which page number (1-based integer) each piece of information appears on, based on position in the text above.

Return JSON with this exact structure. Be direct and specific. No hedging. If the paper's evidence is thin, say so explicitly.

{
  "methodologicalWeaknesses": [
    {
      "weakness": "the specific methodological limitation — name the section, figure, or claim",
      "whyItMatters": "what this weakness means for the validity or generalisability of the core claim",
      "questionToAsk": "the exact question a reviewer would ask the authors about this",
      "sourcePage": 7,
      "sourceQuote": "verbatim phrase from the paper that exposes this weakness — max 100 chars"
    }
  ],
  "claimEvidenceMap": [
    {
      "claim": "one of the paper's key claims, quoted or closely paraphrased",
      "evidenceStrength": "strong | moderate | weak | unsupported",
      "rationale": "why — what evidence supports or fails to support this claim, and what would be needed to strengthen it",
      "sourcePage": 3,
      "sourceQuote": "verbatim phrase from the paper that makes this claim — max 100 chars"
    }
  ],
  "whatThisPaperDoesNotProve": "one paragraph: what the paper's framing implies but the evidence does not actually establish — be specific about scope, population, or causal claims that exceed the data",
  "readingAngle": "given the above, what is the single most productive critical angle for a PhD researcher to take when reading this paper — what should they be interrogating as they read?"
}`

    /* ------------------------------------------------------------------ */
    /* Fire all three in parallel                                           */
    /* ------------------------------------------------------------------ */
    const [glanceCompletion, prereqCompletion, critiqueCompletion] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: glancePrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.15,
        max_tokens: 1800,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prereqPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.15,
        max_tokens: 2200,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: critiquePrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.15,
        max_tokens: 1600,
      }),
    ])

    const glance  = JSON.parse(glanceCompletion.choices[0]?.message?.content || '{}')
    const prereqs = JSON.parse(prereqCompletion.choices[0]?.message?.content || '{}')
    const critique = JSON.parse(critiqueCompletion.choices[0]?.message?.content || '{}')

    return NextResponse.json({ success: true, glance, prereqs, critique })
  } catch (error: any) {
    console.error('[paper-orientation]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
