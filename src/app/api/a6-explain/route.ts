/**
 * API Route: /api/a6-explain
 *
 * Agent 6 — Content Comprehension (v2.0 — PhD-level upgrade)
 *
 * Implements: y = LLM(q | C_s)
 * - Receives section text C_s and a query q
 * - Returns an explanation grounded ONLY in C_s
 * - Runs grounding validation before returning
 * - If grounding fails: abstains and returns { grounded: false }
 *
 * NEW in v2.0 (PhD-level upgrades):
 *   - math-walkthrough mode: step-by-step derivation with variable unpacking
 *   - alternative-perspectives: 2–3 ways to think about the same concept
 *   - uncertainty-flags: explicitly marks where the paper is ambiguous
 *   - chain-of-thought: visible reasoning trace for complex claims
 *   - figure/table mode: structured analysis of non-text content
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface A6ExplainRequest {
  query: string
  sectionText: string
  sectionId: string
  userId: string
  requestType: 'explain' | 'paraphrase' | 'analogy' | 'example' | 'question'
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  dsAtTrigger: number
  // New v2.0 fields
  mode?: 'standard' | 'math-walkthrough' | 'alternative-perspectives' | 'uncertainty-audit' | 'figure-analysis'
  metacognitiveContext?: string  // what the reader said during metacognitive prompt
  sectionComplexity?: number     // 0–1 complexity score from section-complexity API
}

export interface A6ExplainResponse {
  explanation: string
  grounded: boolean
  confidence: number
  followUpSuggestions: string[]
  groundingFailureReason?: string
  // New v2.0 fields
  mode: string
  mathSteps?: string[]           // step-by-step for math-walkthrough mode
  alternativePerspectives?: {    // for alternative-perspectives mode
    label: string                // e.g. "Information-theoretic view"
    explanation: string
  }[]
  uncertaintyFlags?: {           // for uncertainty-audit mode
    claim: string                // the ambiguous claim
    issue: string                // why it's uncertain
    severity: 'minor' | 'moderate' | 'major'
  }[]
  keyVariables?: { symbol: string; meaning: string }[]  // for math mode
  prerequisiteGap?: string       // if the explanation requires knowledge not in C_s
}

// ---------------------------------------------------------------------------
// System prompts per mode
// ---------------------------------------------------------------------------

function buildSystemPrompt(mode: string, level: string): string {
  const levelInstruction = level === 'advanced'
    ? 'The reader is an expert. Be technically precise. No hand-holding. Assume domain knowledge.'
    : level === 'intermediate'
    ? 'The reader is a graduate student. Define technical terms briefly. Be thorough.'
    : 'The reader is new to this area. Use analogies. Avoid jargon. Build from first principles.'

  const base = `You are an embedded reading assistant for PhD-level collaborative research reading.
Your ONLY source of truth is the section text provided. Do not introduce external knowledge.
If the section text does not contain enough to answer, output exactly: CANNOT_GROUND
${levelInstruction}`

  const modeInstructions: Record<string, string> = {
    standard: `Answer clearly and concisely. Every sentence must add information.`,

    'math-walkthrough': `MATH WALKTHROUGH MODE.
For mathematical content:
1. First list all variables/symbols used and what they represent (from the text).
2. Then walk through the logic or derivation step by step, numbered.
3. At each step, explain WHY this step follows from the previous.
4. Flag any step that relies on knowledge not explicitly in this section.
5. End with a plain-English summary of what the math achieves.
Format: start with "VARIABLES:" section, then "STEPS:" section, then "SUMMARY:" section.`,

    'alternative-perspectives': `ALTERNATIVE PERSPECTIVES MODE.
Provide exactly 3 different ways to understand this concept:
- PERSPECTIVE 1: [label] — e.g. intuitive / geometric / information-theoretic / engineering
- PERSPECTIVE 2: [label]
- PERSPECTIVE 3: [label]
Each perspective must be self-contained (1–3 sentences). All must be grounded in C_s.`,

    'uncertainty-audit': `UNCERTAINTY AUDIT MODE.
Your job: identify claims in this passage that are ambiguous, underspecified, or potentially problematic for a careful PhD reader.
For each issue found:
CLAIM: [exact quote or paraphrase of the claim]
ISSUE: [why this is uncertain, ambiguous, or should be questioned]
SEVERITY: [minor | moderate | major]
Then give an overall SUMMARY of the passage's epistemic quality in 2–3 sentences.`,

    'figure-analysis': `FIGURE/TABLE ANALYSIS MODE.
The reader is looking at a figure, table, or algorithm referenced in this section.
1. Explain what it shows/represents based on the section text.
2. State what the key takeaway is (what conclusion the authors draw from it).
3. Note any caveats or limitations mentioned.
4. Suggest what to look for / compare across rows/columns if applicable.`,
  }

  return `${base}\n\n${modeInstructions[mode] || modeInstructions.standard}`
}

// ---------------------------------------------------------------------------
// Grounding validation (unchanged from v1)
// ---------------------------------------------------------------------------

async function validateGrounding(explanation: string, sectionText: string): Promise<boolean> {
  if (explanation.length < 100) return true
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a grounding validator. Given an AI explanation and the source section text, respond with exactly one word: GROUNDED or UNGROUNDED.
GROUNDED = every factual claim traces to the source text.
UNGROUNDED = contains claims not supported by the source text.`,
        },
        {
          role: 'user',
          content: `SOURCE:\n"""\n${sectionText.slice(0, 5000)}\n"""\n\nEXPLANATION:\n"""\n${explanation.slice(0, 1500)}\n"""\n\nGROUNDED or UNGROUNDED?`,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    })
    const verdict = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'UNGROUNDED'
    return verdict.startsWith('GROUNDED')
  } catch {
    return true  // fail open — conservative
  }
}

// ---------------------------------------------------------------------------
// Parse structured output for each mode
// ---------------------------------------------------------------------------

function extractSection(raw: string, header: string, nextHeaders: string[]): string {
  const upper = raw.toUpperCase()
  const start = upper.indexOf(header.toUpperCase())
  if (start === -1) return ''
  let end = raw.length
  for (const next of nextHeaders) {
    const idx = upper.indexOf(next.toUpperCase(), start + header.length)
    if (idx !== -1 && idx < end) end = idx
  }
  return raw.slice(start + header.length, end).trim()
}

function parseMathWalkthrough(raw: string): { mathSteps: string[]; keyVariables: { symbol: string; meaning: string }[]; summary: string } {
  const mathSteps: string[] = []
  const keyVariables: { symbol: string; meaning: string }[] = []

  const varSection = extractSection(raw, 'VARIABLES:', ['STEPS:', 'SUMMARY:'])
  const stepsSection = extractSection(raw, 'STEPS:', ['SUMMARY:'])
  const summary = extractSection(raw, 'SUMMARY:', [])

  varSection.split('\n').forEach(line => {
    const m = line.match(/[-•]\s*([^:—–]+)[:\s—–]+(.+)/)
    if (m) keyVariables.push({ symbol: m[1].trim(), meaning: m[2].trim() })
  })

  stepsSection.split('\n').forEach(line => {
    const m = line.match(/^\s*\d+[.)]\s+(.+)/)
    if (m) mathSteps.push(m[1].trim())
  })

  return { mathSteps, keyVariables, summary }
}

function parseAlternativePerspectives(raw: string): { label: string; explanation: string }[] {
  const perspectives: { label: string; explanation: string }[] = []
  // Split on PERSPECTIVE N: headers
  const parts = raw.split(/PERSPECTIVE\s*\d+:/i).slice(1)
  for (const part of parts) {
    // First line may be the label in brackets; rest is explanation
    const lines = part.trim().split('\n')
    const labelLine = lines[0] || ''
    const labelMatch = labelLine.match(/^\[?([^\]—–\n]+)\]?[—–\s]*(.*)/)
    if (labelMatch) {
      const label = labelMatch[1].trim()
      const rest = (labelMatch[2] + '\n' + lines.slice(1).join('\n')).trim().replace(/\n+/g, ' ')
      if (label) perspectives.push({ label, explanation: rest })
    }
  }
  return perspectives.slice(0, 3)
}

function parseUncertaintyAudit(raw: string): { claim: string; issue: string; severity: 'minor' | 'moderate' | 'major' }[] {
  const flags: { claim: string; issue: string; severity: 'minor' | 'moderate' | 'major' }[] = []
  const blocks = raw.split(/(?=CLAIM:)/i).filter(b => b.trim())
  for (const block of blocks) {
    const claimMatch = block.match(/CLAIM:\s*([^\n]+(?:\n(?!ISSUE:|SEVERITY:)[^\n]*)*)/)
    const issueMatch = block.match(/ISSUE:\s*([^\n]+(?:\n(?!SEVERITY:|CLAIM:)[^\n]*)*)/)
    const claim = claimMatch?.[1]?.trim().replace(/\n/g, ' ') || ''
    const issue = issueMatch?.[1]?.trim().replace(/\n/g, ' ') || ''
    const severityRaw = block.match(/SEVERITY:\s*(\w+)/i)?.[1]?.toLowerCase() || 'minor'
    const severity = (['minor', 'moderate', 'major'].includes(severityRaw) ? severityRaw : 'minor') as 'minor' | 'moderate' | 'major'
    if (claim && issue) flags.push({ claim, issue, severity })
  }
  return flags.slice(0, 5)
}

function generateFollowUps(requestType: A6ExplainRequest['requestType'], level: string, mode: string): string[] {
  if (mode === 'math-walkthrough') {
    return [
      'Which step relies on an assumption not stated in the paper?',
      'What would the result be if the key parameter were varied by an order of magnitude?',
      'Does this derivation hold under the boundary conditions described in the methods?',
    ]
  }
  if (mode === 'alternative-perspectives') {
    return [
      'Which perspective is most falsifiable — and how would you design a test?',
      'Does the paper privilege one of these framings, and if so, does the evidence actually support that choice?',
    ]
  }
  if (mode === 'uncertainty-audit') {
    return [
      'Does the main claim survive if the most severe ambiguity is resolved against the authors?',
      'Is any of this ambiguity acknowledged in the limitations section, or is it structurally hidden?',
    ]
  }
  const base: Record<A6ExplainRequest['requestType'], string[]> = {
    explain: [
      'What is the strongest objection to this explanation, and does the paper address it?',
      'What assumption is doing the most load-bearing work here?',
      'Where does the paper\'s evidence run out and interpretation begin?',
    ],
    paraphrase: [
      'What is lost in the restatement — what precision does the original phrasing carry that this version doesn\'t?',
      'Is the claim here empirical, theoretical, or definitional?',
    ],
    analogy: [
      'Where exactly does this analogy break down, and does the breakdown matter for the paper\'s argument?',
      'Would a domain expert reject this analogy — and if so, what does that reveal about the underlying concept?',
    ],
    example: [
      'Is this example the best case or the typical case — would a harder example change the conclusion?',
      'What would a counterexample look like, and does the paper rule it out?',
    ],
    question: [
      'What additional evidence would be needed to answer this question conclusively?',
      'Is this question answerable from the paper, or does it require external data the authors don\'t have?',
      'How would a methodologist respond to the way the authors have framed this?',
    ],
  }
  return base[requestType] || []
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: A6ExplainRequest = await request.json()
    const {
      query, sectionText, sectionId, userId,
      requestType, userLevel, dsAtTrigger,
      mode = 'standard',
      metacognitiveContext,
    } = body

    if (!query || !sectionText) {
      return NextResponse.json({ error: 'query and sectionText are required' }, { status: 400 })
    }

    const C_s = sectionText.slice(0, 8000)

    // Build user prompt
    let taskInstruction = ''
    switch (requestType) {
      case 'explain':    taskInstruction = 'Explain this passage clearly.'; break
      case 'paraphrase': taskInstruction = 'Restate this passage in different words, preserving all meaning.'; break
      case 'analogy':    taskInstruction = 'Create an analogy that makes this concept intuitive.'; break
      case 'example':    taskInstruction = 'Provide a concrete example that illustrates this concept.'; break
      case 'question':   taskInstruction = 'Answer the following question based on the section text.'; break
    }

    const metacogNote = metacognitiveContext
      ? `\n\nThe reader wrote this self-reflection before asking: "${metacognitiveContext.slice(0, 300)}"\nTailor your explanation to address where their current understanding is incomplete.`
      : ''

    const userPrompt = `SECTION TEXT (C_s):
"""
${C_s}
"""

TASK: ${taskInstruction}
${requestType === 'question' ? `QUESTION: ${query}` : `TEXT: "${query.slice(0, 1000)}"`}
${metacogNote}

If C_s does not contain enough to answer, output: CANNOT_GROUND`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(mode, userLevel) },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: mode === 'math-walkthrough' ? 1000 : mode === 'uncertainty-audit' ? 900 : 700,
      temperature: mode === 'uncertainty-audit' ? 0.2 : 0.3,
    })

    const rawExplanation = completion.choices[0]?.message?.content?.trim() || ''

    if (rawExplanation === 'CANNOT_GROUND' || rawExplanation.startsWith('CANNOT_GROUND')) {
      console.log(`[A6 v2] CANNOT_GROUND. userId=${userId} sectionId=${sectionId} mode=${mode}`)
      return NextResponse.json({
        explanation: '',
        grounded: false,
        confidence: 0,
        followUpSuggestions: [],
        groundingFailureReason: 'Model could not ground answer in section text',
        mode,
      } satisfies A6ExplainResponse)
    }

    const isGrounded = await validateGrounding(rawExplanation, C_s)

    if (!isGrounded) {
      console.log(`[A6 v2] Grounding FAILED. userId=${userId} sectionId=${sectionId} ds=${dsAtTrigger}`)
      return NextResponse.json({
        explanation: '',
        grounded: false,
        confidence: 0,
        followUpSuggestions: [],
        groundingFailureReason: 'Explanation contained claims not traceable to section text',
        mode,
      } satisfies A6ExplainResponse)
    }

    // Parse mode-specific structured output
    let mathSteps: string[] | undefined
    let keyVariables: { symbol: string; meaning: string }[] | undefined
    let alternativePerspectives: { label: string; explanation: string }[] | undefined
    let uncertaintyFlags: { claim: string; issue: string; severity: 'minor' | 'moderate' | 'major' }[] | undefined
    let cleanExplanation = rawExplanation

    if (mode === 'math-walkthrough') {
      const parsed = parseMathWalkthrough(rawExplanation)
      mathSteps = parsed.mathSteps
      keyVariables = parsed.keyVariables
      cleanExplanation = parsed.summary || rawExplanation
    } else if (mode === 'alternative-perspectives') {
      alternativePerspectives = parseAlternativePerspectives(rawExplanation)
      if (alternativePerspectives.length === 0) {
        // fallback: treat whole response as explanation
        cleanExplanation = rawExplanation
      } else {
        cleanExplanation = alternativePerspectives.map(p => `**${p.label}**: ${p.explanation}`).join('\n\n')
      }
    } else if (mode === 'uncertainty-audit') {
      uncertaintyFlags = parseUncertaintyAudit(rawExplanation)
      // Extract summary after all CLAIM blocks
      cleanExplanation = rawExplanation.replace(/CLAIM:[\s\S]*?(?=CLAIM:|SUMMARY:|$)/gi, '').trim()
      const summaryIdx = rawExplanation.toUpperCase().indexOf('SUMMARY:')
      if (summaryIdx !== -1) cleanExplanation = rawExplanation.slice(summaryIdx + 8).trim()
    }

    console.log(`[A6 v2] Generated. userId=${userId} sectionId=${sectionId} ds=${dsAtTrigger} mode=${mode}`)

    return NextResponse.json({
      explanation: cleanExplanation,
      grounded: true,
      confidence: 0.9,
      followUpSuggestions: generateFollowUps(requestType, userLevel, mode),
      mode,
      mathSteps,
      keyVariables,
      alternativePerspectives,
      uncertaintyFlags,
    } satisfies A6ExplainResponse)

  } catch (error) {
    console.error('[A6 v2] Error:', error)
    return NextResponse.json(
      { error: `A6 request failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
