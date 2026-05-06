import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' })

export interface ComprehensionQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  /** Synthesis questions span multiple sections; section-level questions are anchored to one */
  scope: 'section' | 'paper'
}

export interface ReasoningEvaluation {
  score: 'strong' | 'partial' | 'weak'
  feedback: string
  /** The specific claim or gap the evaluator identified */
  keyIssue: string
  /** What a rigorous answer would have addressed that the user missed */
  missing?: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      sectionName,
      sectionContent,
      documentTitle,
      fullDocumentText,   // provided when mode === 'paper'
      difficulty = 'mixed',
      count = 5,
      mode = 'section',   // 'section' | 'paper' | 'evaluate'
      userAnswer,         // provided when mode === 'evaluate'
      questionText,       // provided when mode === 'evaluate'
    } = await request.json()

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 503 })
    }

    // ── Mode: evaluate a free-text answer against the paper ──────────────────
    if (mode === 'evaluate') {
      if (!userAnswer || !questionText || (!sectionContent && !fullDocumentText)) {
        return NextResponse.json({ error: 'userAnswer, questionText, and document context required for evaluate mode' }, { status: 400 })
      }

      const sourceText = fullDocumentText || sectionContent
      const evalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are evaluating a PhD researcher's written response to a comprehension question about an academic paper.

Be analytically rigorous. The researcher is an expert — do not reward vague or hedged answers. Reward:
- Direct engagement with the paper's specific claims and evidence
- Identification of assumptions, limitations, or tensions the paper itself raises
- Precise use of the paper's own terminology and results

Penalize:
- Generic statements that could apply to any paper
- Paraphrasing without showing understanding of mechanism or implication
- Missing the central tension or claim the question targets

Return a JSON object with:
{
  "score": "strong" | "partial" | "weak",
  "feedback": "2–3 sentences of specific, grounded feedback citing the paper text",
  "keyIssue": "The single most important thing the answer got right or wrong",
  "missing": "What a rigorous answer would have addressed — be specific and cite the paper"
}`,
          },
          {
            role: 'user',
            content: `PAPER: "${documentTitle || 'Academic Paper'}"
SOURCE TEXT:
${sourceText.slice(0, 6000)}

QUESTION: ${questionText}

RESEARCHER'S ANSWER: ${userAnswer}

Evaluate the answer.`,
          },
        ],
        max_tokens: 600,
        temperature: 0.15,
        response_format: { type: 'json_object' },
      })

      const raw = evalCompletion.choices[0]?.message?.content || '{}'
      try {
        const result: ReasoningEvaluation = JSON.parse(raw)
        return NextResponse.json({ evaluation: result })
      } catch {
        return NextResponse.json({ error: 'Failed to parse evaluation' }, { status: 500 })
      }
    }

    // ── Mode: section-level MCQ ───────────────────────────────────────────────
    if (mode === 'section') {
      if (!sectionContent) return NextResponse.json({ error: 'sectionContent is required' }, { status: 400 })

      const systemPrompt = `You are embedded in CoRead, a reading system for PhD researchers. Generate self-test questions that expose whether a researcher has genuinely understood a section — not whether they can recall surface facts.

Hard rules:
- Every question MUST be anchored to a specific claim, mechanism, finding, or inferential step in the provided section text. No generic questions.
- Wrong options must be plausible to someone who skimmed but didn't understand — not obviously wrong distractors.
- The explanation must quote or closely paraphrase the exact sentence or phrase in the section that resolves the question.
- Difficulty: basic = tests a specific stated claim; intermediate = requires understanding a mechanism or relationship; advanced = requires evaluating an assumption, limitation, or inferential leap.
- Do NOT ask "what is the main contribution" — that tests skimming, not comprehension.
- Do NOT ask questions answerable without reading the text (e.g. pure definitions that appear in textbooks).`

      const userPrompt = `Paper: "${documentTitle || 'Academic Paper'}"
Section: §${sectionName || 'Current Section'}

Section text:
${sectionContent.substring(0, 5000)}

Generate exactly ${count} multiple-choice questions grounded strictly in the above section text.
Difficulty mix: ${difficulty === 'mixed'
  ? `${Math.ceil(count / 3)} basic, ${Math.floor(count / 3)} intermediate, ${Math.floor(count / 3)} advanced`
  : difficulty}

Return JSON with key "questions" containing an array:
[{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 0,
  "explanation": "...",
  "difficulty": "basic|intermediate|advanced",
  "scope": "section"
}]`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      return parseAndReturn(completion.choices[0]?.message?.content || '{}', count, 'section')
    }

    // ── Mode: paper-level synthesis MCQ ──────────────────────────────────────
    if (mode === 'paper') {
      if (!fullDocumentText && !sectionContent) {
        return NextResponse.json({ error: 'fullDocumentText or sectionContent required for paper mode' }, { status: 400 })
      }

      const sourceText = fullDocumentText || sectionContent

      const systemPrompt = `You are embedded in CoRead, a reading system for PhD researchers. Generate synthesis questions that test whether a researcher understands the paper AS A WHOLE — its central argument, how the parts connect, what it claims and what it cannot claim.

Hard rules:
- Questions must require reasoning ACROSS multiple sections — not answerable from a single paragraph.
- Target the paper's contribution claims, methodological choices, scope limitations, and how findings support (or fail to support) the central thesis.
- Wrong options must represent plausible misreadings — alternative interpretations that a careful reader would rule out using evidence from the paper.
- The explanation must identify which part of the paper resolves the question and why.
- At least one question must probe a limitation, threat to validity, or unaddressed alternative explanation.
- At least one question must probe the relationship between the paper's method and its claims.`

      const userPrompt = `Paper: "${documentTitle || 'Academic Paper'}"

Full paper text (extract):
${sourceText.slice(0, 12000)}

Generate exactly ${count} synthesis questions that require reasoning across the whole paper.
Aim for: 1 basic factual, 2 mechanism/relationship, ${count - 3} evaluative/inferential (assumption, limitation, validity).

Return JSON with key "questions" containing an array:
[{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 0,
  "explanation": "...",
  "difficulty": "basic|intermediate|advanced",
  "scope": "paper"
}]`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      return parseAndReturn(completion.choices[0]?.message?.content || '{}', count, 'paper')
    }

    return NextResponse.json({ error: 'Invalid mode. Use section, paper, or evaluate.' }, { status: 400 })

  } catch (error: any) {
    console.error('[Comprehension Check] Error:', error)
    return NextResponse.json(
      { error: `Failed: ${error.message || String(error)}` },
      { status: 500 }
    )
  }
}

function parseAndReturn(raw: string, count: number, scope: 'section' | 'paper') {
  try {
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.items || [])
    const questions: ComprehensionQuestion[] = arr.slice(0, count).map((q: any, i: number) => ({
      id: `q${i + 1}-${Date.now()}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'intermediate',
      scope: q.scope || scope,
    }))
    return NextResponse.json({ questions })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
