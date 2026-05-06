import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

/**
 * POST /api/activity-intelligence
 *
 * Analyses the accumulated session event stream and returns structured
 * intelligence that a PhD researcher can act on — not a summary, but
 * a diagnostic of the group's collective epistemic state.
 *
 * Returns:
 *   - hotspots: sections with the highest combined struggle + highlight density
 *   - contested: passages where readers flagged different interpretations
 *   - velocity: reading pace disparity across participants
 *   - epistemicStatus: per-section convergence/divergence/unresolved verdict
 *   - synthesisInsight: one high-signal observation about what the session revealed
 */
export async function POST(request: NextRequest) {
  try {
    const { events, documentTitle, documentContent } = await request.json()

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events to analyse' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      )
    }

    // ── Build a structured digest of the event stream for the LLM ──────────

    // Section-level aggregates
    const sectionMap: Record<string, {
      name: string
      struggles: number
      highlights: string[]       // quoted text
      highlightReasons: string[] // e.g. "confused", "important"
      chatMessages: string[]
      interventions: number
      readers: Set<string>
      dsValues: number[]
    }> = {}

    const ensureSection = (name: string) => {
      const key = name || 'Unanchored'
      if (!sectionMap[key]) {
        sectionMap[key] = {
          name: key, struggles: 0, highlights: [], highlightReasons: [],
          chatMessages: [], interventions: 0, readers: new Set(), dsValues: [],
        }
      }
      return sectionMap[key]
    }

    const readers = new Set<string>()
    let totalStruggles = 0
    let totalHighlights = 0
    let totalChat = 0

    for (const e of events as any[]) {
      const sec = ensureSection(e.sectionName || 'Unanchored')
      if (e.userName && e.userName !== 'CoRead' && !e.userName.startsWith('A')) {
        sec.readers.add(e.userName)
        readers.add(e.userName)
      }
      if (e.kind === 'struggle') {
        sec.struggles++
        totalStruggles++
        if (typeof e.dsValue === 'number') sec.dsValues.push(e.dsValue)
      }
      if (e.kind === 'highlight') {
        totalHighlights++
        if (e.subtext) sec.highlights.push(e.subtext.replace(/^"|"$/g, '').slice(0, 120))
        if (e.content?.includes('reason:')) sec.highlightReasons.push(e.content)
      }
      if (e.kind === 'chat') {
        totalChat++
        if (e.content) sec.chatMessages.push(`${e.userName}: ${e.content.slice(0, 100)}`)
      }
      if (e.kind === 'intervention') sec.interventions++
    }

    // Rank sections by combined signal weight
    const rankedSections = Object.values(sectionMap)
      .map(s => ({
        ...s,
        readers: Array.from(s.readers),
        signal: s.struggles * 3 + s.highlights.length * 2 + s.chatMessages.length + s.interventions * 2,
      }))
      .sort((a, b) => b.signal - a.signal)
      .slice(0, 8) // top 8 for LLM context

    const digest = rankedSections.map(s =>
      `§${s.name}: struggles=${s.struggles} highlights=${s.highlights.length} chat=${s.chatMessages.length} ` +
      `readers=[${s.readers.join(', ')}]` +
      (s.highlights.length ? `\n  Highlighted: ${s.highlights.slice(0, 3).join(' | ')}` : '') +
      (s.chatMessages.length ? `\n  Discussion: ${s.chatMessages.slice(0, 2).join(' | ')}` : '') +
      (s.dsValues.length ? `\n  D_s values: ${s.dsValues.map(d => d.toFixed(2)).join(', ')}` : '')
    ).join('\n\n')

    const systemPrompt = `You are a research collaboration analyst for CoRead, a system used by PhD researchers.
You receive a structured digest of a collaborative paper-reading session and return a precise epistemic diagnosis.

Rules:
- Every claim must be derivable from the event data — no generic observations
- "Contested" means two or more readers highlighted the same passage with divergent framing — only flag this if the data supports it
- "Epistemic status" must be one of: converging | diverging | unresolved | understudied
- "synthesisInsight" is the single most non-obvious pattern in the data — the one thing a researcher would not see by reading the raw log
- PhD-level language. No filler. Be terse and precise.
Return JSON only.`

    const userPrompt = `Paper: "${documentTitle || 'Unknown'}"
Session stats: ${readers.size} readers · ${totalStruggles} struggle signals · ${totalHighlights} highlights · ${totalChat} chat messages

Per-section event digest (ranked by signal weight):
${digest || 'No section-anchored events'}

Paper context (first 1500 chars):
${(documentContent || '').substring(0, 1500)}

Return JSON:
{
  "hotspots": [
    {
      "section": "section name",
      "signal": "why this section generated the most collective signal — be specific",
      "readerCount": 2,
      "dominantSignal": "struggle | highlight | discussion"
    }
  ],
  "contested": [
    {
      "section": "section name",
      "tension": "what specific claim or passage is being read differently — quote if possible",
      "readers": ["Reader A", "Reader B"]
    }
  ],
  "epistemicStatus": [
    {
      "section": "section name",
      "status": "converging | diverging | unresolved | understudied",
      "rationale": "one sentence grounded in the event data"
    }
  ],
  "velocityGap": "one sentence describing reading pace disparity if any — e.g. which reader is ahead and what section they are on",
  "synthesisInsight": "the single most non-obvious pattern in this session's data that a researcher should know — max 2 sentences, must be traceable to specific events"
}

Only include contested[] if there is actual evidence of divergence in the event data. Hotspots should have 1–3 entries. EpistemicStatus should cover 2–4 sections.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let intelligence: any = {}
    try {
      intelligence = JSON.parse(raw)
    } catch {
      intelligence = { synthesisInsight: 'Analysis could not be structured — check event data.' }
    }

    return NextResponse.json({ intelligence })

  } catch (error: any) {
    console.error('[Activity Intelligence] Error:', error)
    return NextResponse.json(
      { error: `Analysis failed: ${error.message}` },
      { status: 500 }
    )
  }
}
