import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * /api/section-complexity
 *
 * Analyzes a section's text to produce a structured complexity profile:
 *   - complexityScore: 0.0–1.0 overall
 *   - hasMath / hasFigures / hasTables / hasAlgorithms
 *   - mathDensity: equation references per 100 words
 *   - technicalTerms: key domain terms a reader must know
 *   - readingTimeMin: estimated minutes for a grad student
 *
 * Used by the viewer to:
 *  1. Show a proactive "dense section" badge before the reader enters
 *  2. Boost D_s weights inside Agent1 for that section
 *  3. Pre-fetch a richer A6 explanation (math walkthrough mode)
 *
 * Results are cached per (paperId, sectionId) — generated once.
 *
 * POST { paperId, sectionId, sectionName, sectionText }
 * GET  ?paperId=...&sectionId=...
 */

export interface SectionComplexityResult {
  paperId: string
  sectionId: string
  sectionName: string
  complexityScore: number
  hasMath: boolean
  hasFigures: boolean
  hasTables: boolean
  hasAlgorithms: boolean
  mathDensity: number
  technicalTerms: string[]
  readingTimeMin: number
  // Rich metadata returned by GPT
  mathConcepts: string[]        // "variational lower bound", "KL divergence"
  prerequisiteKnowledge: string[] // "familiarity with Bayesian inference"
  hardestPassage: string        // the single hardest sentence/clause
  suggestedApproach: string     // how a PhD advisor would tell you to read this
}

// ── Heuristic pre-analysis (fast, no LLM) ──────────────────────────────────

function heuristicAnalysis(text: string): {
  hasMath: boolean
  hasFigures: boolean
  hasTables: boolean
  hasAlgorithms: boolean
  mathDensity: number
  wordCount: number
} {
  const lower = text.toLowerCase()
  const wordCount = text.split(/\s+/).filter(Boolean).length

  // Math: LaTeX patterns, equation references, Greek letters spelled out, symbols
  const mathPatterns = [
    /\$[^$]+\$/g,                     // inline LaTeX
    /\\[\w]+\{/g,                     // LaTeX commands
    /eq\.\s*\d+|equation\s+\d+/gi,   // equation references
    /\b(argmax|argmin|softmax|sigmoid|relu|tanh)\b/gi,
    /\b(gradient|derivative|integral|divergence|jacobian|hessian)\b/gi,
    /\b(theta|lambda|alpha|beta|gamma|delta|epsilon|sigma|tau|mu|omega)\b/gi,
    /[∑∏∫∂∇≤≥≠≈∈∉⊂⊃∪∩]/g,
  ]
  const mathMatches = mathPatterns.reduce((n, p) => n + (text.match(p)?.length || 0), 0)
  const mathDensity = wordCount > 0 ? (mathMatches / wordCount) * 100 : 0
  const hasMath = mathDensity > 0.5 || mathMatches >= 3

  // Figures
  const hasFigures = /figure\s+\d+|fig\.\s*\d+|see figure|shown in fig/i.test(text)

  // Tables
  const hasTables = /table\s+\d+|see table|in table|as shown in table/i.test(text)

  // Algorithms/pseudocode
  const hasAlgorithms = /algorithm\s+\d+|pseudocode|procedure\s+\w+|function\s+\w+\(|for each|while\s+\w+\s+do/i.test(text)

  return { hasMath, hasFigures, hasTables, hasAlgorithms, mathDensity, wordCount }
}

function estimateReadingTime(wordCount: number, complexityScore: number): number {
  // A PhD student reads ~200–250 wpm for normal text, ~80–120 wpm for dense math
  const baseWpm = 220
  const adjustedWpm = baseWpm * (1 - complexityScore * 0.55)
  return Math.max(0.5, wordCount / adjustedWpm)
}

// ── GPT-4o deep analysis ────────────────────────────────────────────────────

async function deepAnalysis(sectionText: string, sectionName: string): Promise<{
  complexityScore: number
  technicalTerms: string[]
  mathConcepts: string[]
  prerequisiteKnowledge: string[]
  hardestPassage: string
  suggestedApproach: string
}> {
  const prompt = `You are analyzing a section of an academic paper for PhD-level readers.

Section name: "${sectionName}"
Section text (first 3000 chars):
"""
${sectionText.slice(0, 3000)}
"""

Produce a JSON object with:
{
  "complexityScore": <0.0–1.0, where 1.0 = hardest possible; calibrate to PhD reader standard>,
  "technicalTerms": [<up to 8 domain-specific terms a reader MUST understand to follow this section>],
  "mathConcepts": [<up to 6 mathematical/statistical concepts explicitly used or required>],
  "prerequisiteKnowledge": [<up to 5 specific things the reader must already know, phrased precisely>],
  "hardestPassage": "<verbatim sentence or clause that is the single most difficult to parse>",
  "suggestedApproach": "<2–3 sentence strategy a PhD advisor would give for reading this section — specific, not generic>"
}

Calibration: complexityScore 0.2 = clear methods section, 0.5 = standard results with statistics, 0.8 = dense derivation or novel formulation, 1.0 = unreasonably dense.
Return ONLY valid JSON.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 600,
  })

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return {
      complexityScore: Math.min(1, Math.max(0, parsed.complexityScore ?? 0.5)),
      technicalTerms: Array.isArray(parsed.technicalTerms) ? parsed.technicalTerms.slice(0, 8) : [],
      mathConcepts: Array.isArray(parsed.mathConcepts) ? parsed.mathConcepts.slice(0, 6) : [],
      prerequisiteKnowledge: Array.isArray(parsed.prerequisiteKnowledge) ? parsed.prerequisiteKnowledge.slice(0, 5) : [],
      hardestPassage: parsed.hardestPassage || '',
      suggestedApproach: parsed.suggestedApproach || '',
    }
  } catch {
    return { complexityScore: 0.5, technicalTerms: [], mathConcepts: [], prerequisiteKnowledge: [], hardestPassage: '', suggestedApproach: '' }
  }
}

// ── POST: analyze and cache ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: { paperId: string; sectionId: string; sectionName: string; sectionText: string } = await request.json()
    const { paperId, sectionId, sectionName, sectionText } = body

    if (!paperId || !sectionId || !sectionText) {
      return NextResponse.json({ error: 'paperId, sectionId, sectionText required' }, { status: 400 })
    }

    // Return cached result if already computed
    const existing = await prisma.sectionComplexity.findUnique({
      where: { paperId_sectionId: { paperId, sectionId } },
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        cached: true,
        complexity: {
          ...existing,
          technicalTerms: existing.technicalTerms ? JSON.parse(existing.technicalTerms) : [],
          mathConcepts: [],
          prerequisiteKnowledge: [],
          hardestPassage: '',
          suggestedApproach: '',
        } as SectionComplexityResult,
      })
    }

    // Heuristic pass (fast)
    const heuristic = heuristicAnalysis(sectionText)

    // GPT-4o deep pass (slow, but cached forever after)
    const deep = await deepAnalysis(sectionText, sectionName)

    // Merge: take max of heuristic hasMath with GPT score
    const finalComplexity = Math.max(
      deep.complexityScore,
      heuristic.hasMath ? 0.45 : 0,
      heuristic.hasAlgorithms ? 0.4 : 0
    )

    const readingTimeMin = estimateReadingTime(heuristic.wordCount, finalComplexity)

    // Cache in DB
    const record = await prisma.sectionComplexity.create({
      data: {
        paperId,
        sectionId,
        sectionName,
        complexityScore: finalComplexity,
        hasMath: heuristic.hasMath || deep.mathConcepts.length > 0,
        hasFigures: heuristic.hasFigures,
        hasTables: heuristic.hasTables,
        hasAlgorithms: heuristic.hasAlgorithms,
        mathDensity: heuristic.mathDensity,
        technicalTerms: JSON.stringify(deep.technicalTerms),
        readingTimeMin,
      },
    })

    const result: SectionComplexityResult = {
      paperId: record.paperId,
      sectionId: record.sectionId,
      sectionName: record.sectionName,
      complexityScore: record.complexityScore,
      hasMath: record.hasMath,
      hasFigures: record.hasFigures,
      hasTables: record.hasTables,
      hasAlgorithms: record.hasAlgorithms,
      mathDensity: record.mathDensity,
      technicalTerms: deep.technicalTerms,
      readingTimeMin: record.readingTimeMin,
      mathConcepts: deep.mathConcepts,
      prerequisiteKnowledge: deep.prerequisiteKnowledge,
      hardestPassage: deep.hardestPassage,
      suggestedApproach: deep.suggestedApproach,
    }

    return NextResponse.json({ success: true, cached: false, complexity: result })
  } catch (error) {
    console.error('[section-complexity POST]', error)
    return NextResponse.json({ error: 'Failed to analyze section complexity' }, { status: 500 })
  }
}

// ── GET: retrieve cached complexity ────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const sectionId = searchParams.get('sectionId')

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 })
    }

    if (sectionId) {
      const record = await prisma.sectionComplexity.findUnique({
        where: { paperId_sectionId: { paperId, sectionId } },
      })
      if (!record) return NextResponse.json({ success: true, complexity: null })
      return NextResponse.json({
        success: true,
        complexity: {
          ...record,
          technicalTerms: record.technicalTerms ? JSON.parse(record.technicalTerms) : [],
        },
      })
    }

    // Return all sections for this paper sorted by complexity descending
    const records = await prisma.sectionComplexity.findMany({
      where: { paperId },
      orderBy: { complexityScore: 'desc' },
    })

    return NextResponse.json({
      success: true,
      sections: records.map(r => ({
        ...r,
        technicalTerms: r.technicalTerms ? JSON.parse(r.technicalTerms) : [],
      })),
    })
  } catch (error) {
    console.error('[section-complexity GET]', error)
    return NextResponse.json({ error: 'Failed to fetch complexity' }, { status: 500 })
  }
}
