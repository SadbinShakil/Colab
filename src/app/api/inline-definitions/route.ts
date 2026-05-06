import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

export interface InlineDefinition {
  term: string
  shortDef: string
  fullDef: string
  type: 'definition' | 'prerequisite' | 'concept'
  /** How this paper specifically uses or extends this term (may differ from textbook meaning) */
  paperUsage?: string
}

// ─── Document-aware extractor (no API key fallback) ───────────────────────────

function extractFromDocument(rawText: string): InlineDefinition[] {
  const text = rawText.replace(/\s+/g, ' ').trim()
  const textLower = text.toLowerCase()

  const results: InlineDefinition[] = []
  const seen = new Set<string>()

  const add = (term: string, shortDef: string, fullDef: string, type: InlineDefinition['type']) => {
    const key = term.toLowerCase().trim()
    if (seen.has(key) || key.length < 2) return
    if (!textLower.includes(key)) return
    seen.add(key)
    results.push({ term: term.trim(), shortDef, fullDef, type })
  }

  // 1. Acronym definitions: "Long Form (ABBR)" or "ABBR (Long Form)"
  const acronymLong = /\b([A-Z][a-zA-Z]*(?:\s+[a-zA-Z]+){1,6})\s+\(([A-Z]{2,8})\)/g
  const acronymShort = /\b([A-Z]{2,8})\s+\(([A-Za-z][a-zA-Z]*(?:\s+[a-zA-Z]+){1,6})\)/g
  for (const m of text.matchAll(acronymLong)) {
    const longForm = m[1].trim(); const abbr = m[2].trim()
    if (abbr.length < 2 || abbr.length > 8) continue
    add(abbr, longForm, `"${abbr}" stands for ${longForm}, as defined by the authors.`, 'definition')
  }
  for (const m of text.matchAll(acronymShort)) {
    const abbr = m[1].trim(); const longForm = m[2].trim()
    if (abbr.length < 2 || abbr.length > 8) continue
    add(abbr, longForm, `"${abbr}" stands for ${longForm}, as defined by the authors.`, 'definition')
  }

  // 2. Repeated ALL-CAPS acronyms
  const capsFreq: Record<string, number> = {}
  for (const m of text.matchAll(/\b([A-Z]{2,8})\b/g)) {
    const w = m[1]
    if (/^(I|A|THE|AND|OR|NOT|BUT|FOR|IN|ON|AT|TO|OF|IS|ARE|WAS|BE|BY|AN|AS|IT|ITS|WE|HE|SHE|IF|DO|SO|UP|NO|vs)$/.test(w)) continue
    capsFreq[w] = (capsFreq[w] || 0) + 1
  }
  for (const [abbr, count] of Object.entries(capsFreq)) {
    if (count < 2 || seen.has(abbr.toLowerCase())) continue
    add(abbr, `Technical term used ${count}× in this paper`, `"${abbr}" is a domain-specific acronym appearing repeatedly. See the paper's introduction or glossary.`, 'concept')
  }

  // 3. Inline definitions: "X is defined as Y", "X refers to Y", etc.
  const defPatterns: [RegExp, 'definition' | 'concept'][] = [
    [/\b([A-Za-z][A-Za-z\s\-]{2,40}?)\s+(?:is|are)\s+defined\s+as\s+([^.;]{15,180})[.;]/g, 'definition'],
    [/\b([A-Za-z][A-Za-z\s\-]{2,40}?)\s+refers?\s+to\s+([^.;]{15,180})[.;]/g, 'definition'],
    [/\bwe\s+(?:define|call|refer\s+to)\s+(?:the\s+)?([A-Za-z][A-Za-z\s\-]{2,40}?)\s+as\s+([^.;]{15,180})[.;]/gi, 'definition'],
    [/\b([A-Za-z][A-Za-z\s\-]{2,40}?)\s+(?:denotes?|represents?)\s+([^.;]{15,180})[.;]/g, 'definition'],
  ]
  for (const [pattern, type] of defPatterns) {
    for (const m of text.matchAll(pattern)) {
      const term = m[1].trim().replace(/\s+/g, ' ')
      const defText = m[2].trim().replace(/\s+/g, ' ')
      const words = term.split(' ')
      if (words.length > 6 || words.length < 1) continue
      if (/^(the|a|an|this|that|it|we|our|their|these|those|which|what|if|when|where)$/i.test(words[0])) continue
      if (defText.length < 15) continue
      add(term, defText.slice(0, 80) + (defText.length > 80 ? '…' : ''), `As defined in this paper: "${defText.slice(0, 200)}"`, type)
    }
  }

  // 4. Repeated capitalized key concepts
  const capPhrase = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g
  const freq: Record<string, number> = {}
  for (const m of text.matchAll(capPhrase)) {
    const phrase = m[1]
    if (/^(The|This|These|Their|There|We|Our|In|For|From|With|After|Before|During|Figure|Table|Section|Algorithm)/.test(phrase)) continue
    freq[phrase] = (freq[phrase] || 0) + 1
  }
  Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .forEach(([term]) => {
      if (seen.has(term.toLowerCase())) return
      const idx = text.indexOf(term)
      if (idx === -1) return
      const sentenceStart = text.lastIndexOf('.', idx) + 1
      const sentenceEnd = text.indexOf('.', idx)
      const sentence = sentenceEnd > sentenceStart ? text.slice(sentenceStart, sentenceEnd).trim() : ''
      if (sentence.length > 20) add(term, `Key concept used ${freq[term]}× in this paper`, sentence.slice(0, 200), 'concept')
    })

  return results.slice(0, 20)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { documentText, documentTitle, currentSection } = await request.json()

    if (!documentText) {
      return NextResponse.json({ error: 'documentText is required' }, { status: 400 })
    }

    const hasRealKey = process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key-here' &&
      process.env.OPENAI_API_KEY !== 'dummy-key'

    if (!hasRealKey) {
      const definitions = extractFromDocument(documentText)
      return NextResponse.json({ definitions })
    }

    // ── GPT-4o: paper-specific term extraction ────────────────────────────────
    // Uses full document (up to 14k chars) so definitions are grounded in
    // how THIS paper uses and extends each term — not generic Wikipedia definitions.
    const systemPrompt = `You are a research reading assistant embedded in CoRead, a tool for PhD researchers.

Your task: extract 12–16 key terms from the academic paper below and explain each one in the context of HOW THIS PAPER uses it — not a generic textbook definition.

For each term, produce:
- "term": exact phrase as it appears in the paper (1–5 words, verbatim)
- "type": one of:
    "definition"   — a term the paper explicitly defines (look for "we define X as", "X refers to", "X denotes")
    "prerequisite" — background knowledge the paper assumes without defining (reader must already know this)
    "concept"      — a key idea or contribution central to this paper's argument
- "shortDef": one crisp sentence under 15 words capturing what this means in this paper
- "fullDef": 2–3 sentences explaining the term. For prerequisites, state what level of familiarity this paper assumes. For definitions and concepts, quote or closely paraphrase the paper's own framing.
- "paperUsage": 1 sentence on what is SPECIFIC or UNUSUAL about how this paper uses this term compared to standard usage. Omit or set null if the usage is entirely standard.

Hard rules:
1. The "term" value MUST appear verbatim (case-insensitive) in the document text — no invented terms
2. "fullDef" must be grounded in this paper's text, not generic encyclopedia text
3. Prioritize terms that a reader would pause on — either because they are technical prerequisites, or because this paper uses them in a specific/extended/contested way
4. Do NOT include trivially obvious terms (e.g. "research", "method", "paper", "results")
5. Return a valid JSON array only — no markdown, no prose outside the JSON`

    const userPrompt = `PAPER: "${documentTitle || 'Untitled'}"
${currentSection ? `CURRENT SECTION: ${currentSection}\n` : ''}
DOCUMENT TEXT:
${documentText.slice(0, 14000)}

Return a JSON array of 12–16 term objects with keys: term, type, shortDef, fullDef, paperUsage`

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3500,
        temperature: 0.1,
      })
    } catch (err) {
      console.error('[inline-definitions] OpenAI error, falling back to local extraction:', err)
      return NextResponse.json({ definitions: extractFromDocument(documentText) })
    }

    const raw = completion.choices[0]?.message?.content || '[]'
    let definitions: InlineDefinition[] = []
    try {
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim())
      definitions = Array.isArray(parsed) ? parsed : []
      // Ground-truth filter: term must actually appear in the document
      definitions = definitions.filter(d =>
        d.term && documentText.toLowerCase().includes(d.term.toLowerCase())
      )
    } catch {
      definitions = extractFromDocument(documentText)
    }

    // Fill to minimum with locally extracted terms if AI returned too few
    if (definitions.length < 5) {
      const local = extractFromDocument(documentText)
      const localNew = local.filter(l =>
        !definitions.some(d => d.term.toLowerCase() === l.term.toLowerCase())
      )
      definitions = [...definitions, ...localNew].slice(0, 16)
    }

    return NextResponse.json({ definitions })
  } catch (error) {
    console.error('[inline-definitions] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to extract definitions' }, { status: 500 })
  }
}
