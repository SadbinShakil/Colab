import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/role-allocation
 *
 * Called by Agent10 at the start of Phase II.
 * Takes participant reflections + paper sections, returns a semantically grounded
 * assignment plan — one assignee per section, with rationale.
 *
 * When no participant's reflection maps to a section, AI is assigned and
 * a pre-generated brief (argument + critical questions) is returned for that section
 * so it is never a black hole in the reading session.
 */

interface ReflectionEntry {
  userId: string
  userName: string
  content: string
}

interface SectionEntry {
  id: string
  name: string
  /** First ~400 chars of section body text — used for semantic matching, not the title alone */
  preview: string
}

interface AllocationResult {
  sectionId: string
  sectionName: string
  assignedTo: string            // userId or 'ai'
  assignedName: string          // human name or 'CoRead AI'
  rationale: string             // why this person was matched to this section
  inferredAngle: string         // what reading angle/expertise the system inferred
  confidence: 'high' | 'medium' | 'low'
  /** Only present when assignedTo === 'ai' */
  aiBrief?: {
    mainArgument: string
    criticalQuestions: string[]
    watchOut: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      reflections,    // ReflectionEntry[]
      sections,       // SectionEntry[]
      paperTitle,
    }: {
      reflections: ReflectionEntry[]
      sections: SectionEntry[]
      paperTitle?: string
    } = body

    if (!reflections?.length || !sections?.length) {
      return NextResponse.json({ error: 'reflections and sections required' }, { status: 400 })
    }

    // Demo mode — no OpenAI key
    // Still produces grounded output: distribute sections round-robin, but derive
    // inferredAngle from each participant's actual reflection text.
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      // Extract a reading angle from the reflection text with simple heuristics
      const inferAngle = (content: string): string => {
        const c = content.toLowerCase()
        if (/method|experiment|valid|evaluat|measur|statistic|empir/.test(c))
          return 'Scrutinising experimental design and validity of evaluation'
        if (/related|prior|survey|literature|background|comparable|contrast/.test(c))
          return 'Situating contribution relative to prior work'
        if (/theor|model|formal|framework|concept|principl/.test(c))
          return 'Examining theoretical grounding and conceptual coherence'
        if (/implement|engineer|system|scalab|deploy|architecture/.test(c))
          return 'Assessing technical implementation and system design'
        if (/user|participant|interview|qualit|thematic|study|observation/.test(c))
          return 'Evaluating user study design and qualitative evidence'
        if (/contribut|novelty|gap|claim|advance/.test(c))
          return 'Assessing novelty and positioning of the contribution'
        return 'Critical reading for overall argument and evidence quality'
      }

      const assignments: AllocationResult[] = sections.map((s, i) => {
        const participant = reflections[i % reflections.length]
        const angle = inferAngle(participant.content)
        // Quote the first substantive phrase from their reflection as rationale
        const firstSentence = participant.content.split(/[.!?]/)[0]?.trim() ?? ''
        const rationale = firstSentence.length > 20
          ? `"${firstSentence.slice(0, 120)}" — maps to this section's focus.`
          : `${participant.userName}'s stated reading goals align with ${s.name}.`
        return {
          sectionId: s.id,
          sectionName: s.name,
          assignedTo: participant.userId,
          assignedName: participant.userName,
          rationale,
          inferredAngle: angle,
          confidence: 'medium' as const,
        }
      })
      return NextResponse.json({ assignments })
    }

    // Build the prompt
    const reflectionBlock = reflections.map(r =>
      `PARTICIPANT [${r.userId}] "${r.userName}"\n${r.content.slice(0, 600)}`
    ).join('\n\n---\n\n')

    const sectionBlock = sections.map((s, i) =>
      `SECTION [${s.id}] ${i + 1}. "${s.name}"\nPreview: ${s.preview.slice(0, 400) || '(no preview available)'}`
    ).join('\n\n')

    const participantList = reflections.map(r => `"${r.userId}": "${r.userName}"`).join(', ')

    const systemPrompt = `You are A10, the Role Allocation agent in CoRead — a collaborative academic reading system for PhD researchers.

Your task: read each participant's pre-session reflection and assign each paper section to the person best positioned to read it critically.

Assignment rules:
1. Match on SEMANTIC alignment between reflection and section content — not keyword overlap. A researcher who says "I'm scrutinizing evaluation design" matches a section about experimental results even if the words don't overlap.
2. Each section gets exactly ONE assignee (one userId or "ai").
3. Distribute load roughly evenly — no one person should have more than 2× the sections of another if avoidable.
4. Assign "ai" only when: (a) no participant's reflection suggests interest or expertise relevant to the section, OR (b) the section is highly technical in a domain no participant mentions. Err toward human assignment when uncertain.
5. When assigning "ai", generate a brief so that human readers are not blind to that section.
6. For human assignments: write a rationale that cites specific phrases from their actual reflection — not generic text.
7. inferredAngle: what reading stance this person will bring (e.g., "methodologist checking evaluation validity", "domain expert verifying contribution novelty").

Respond with valid JSON only. No prose outside the JSON.`

    const userPrompt = `Paper: "${paperTitle || 'Untitled'}"

PARTICIPANT REFLECTIONS:
${reflectionBlock}

PAPER SECTIONS:
${sectionBlock}

Available participant IDs: {${participantList}, "ai": "CoRead AI"}

Return JSON in this exact shape:
{
  "assignments": [
    {
      "sectionId": "<exact section id from above>",
      "sectionName": "<section name>",
      "assignedTo": "<userId or 'ai'>",
      "assignedName": "<name or 'CoRead AI'>",
      "rationale": "<1–2 sentences citing the specific reflection phrase that drove this match>",
      "inferredAngle": "<reading stance this person brings to this section>",
      "confidence": "<'high'|'medium'|'low'>",
      "aiBrief": null
    }
  ]
}

For sections assigned to "ai", replace null with:
{
  "mainArgument": "<what this section argues, in 1 sentence grounded in the section preview>",
  "criticalQuestions": ["<question 1>", "<question 2>"],
  "watchOut": "<one methodological or interpretive risk to flag for the group>"
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    const assignments: AllocationResult[] = parsed.assignments ?? []

    // Verify every section has an assignment — fill any missed ones with AI
    const assignedIds = new Set(assignments.map(a => a.sectionId))
    for (const section of sections) {
      if (!assignedIds.has(section.id)) {
        assignments.push({
          sectionId: section.id,
          sectionName: section.name,
          assignedTo: 'ai',
          assignedName: 'CoRead AI',
          rationale: 'No participant reflection mapped to this section.',
          inferredAngle: 'AI coverage — pre-read summary provided',
          confidence: 'low',
          aiBrief: {
            mainArgument: section.preview.slice(0, 200) || 'No preview available.',
            criticalQuestions: ['What does this section contribute to the main claim?', 'Is the evidence in this section sufficient?'],
            watchOut: 'Review carefully — no team member flagged prior expertise here.',
          },
        })
      }
    }

    return NextResponse.json({ assignments }, { status: 200 })
  } catch (err) {
    console.error('[role-allocation] error:', err)
    return NextResponse.json({ error: 'Allocation failed' }, { status: 500 })
  }
}
