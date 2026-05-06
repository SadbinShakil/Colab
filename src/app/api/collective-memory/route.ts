import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const DATA_DIR = path.join(process.cwd(), 'data', 'insights')

export interface SessionMemory {
  id: string
  documentId: string
  sessionId: string
  userId: string
  userName: string
  timestamp: string
  sectionsRead: string[]
  confusionPoints: Array<{
    sectionId: string
    sectionName: string
    passageQuote: string
    resolved: boolean
    resolutionSummary?: string
  }>
  agreedPoints: Array<{
    sectionId: string
    claim: string
  }>
  openQuestions: Array<{
    sectionId: string
    question: string
  }>
  chatHighlights: string[]
}

export interface SectionKnowledge {
  sectionId: string
  sectionName: string
  confusionCount: number
  topConfusionPassages: string[]
  resolvedInsights: string[]
  openQuestions: string[]
  consensusPoints: string[]
}

export interface CollectiveKnowledge {
  documentId: string
  totalSessions: number
  primerMessage: string
  sectionInsights: SectionKnowledge[]
  lastUpdated: string
}

async function ensureDataDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function loadSessionMemories(documentId: string): Promise<SessionMemory[]> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, `${documentId}_sessions.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as SessionMemory[]
  } catch { return [] }
}

async function saveSessionMemory(documentId: string, memory: SessionMemory): Promise<void> {
  await ensureDataDir()
  const existing = await loadSessionMemories(documentId)
  existing.push(memory)
  const filePath = path.join(DATA_DIR, `${documentId}_sessions.json`)
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), 'utf-8')
}

function aggregateKnowledge(memories: SessionMemory[], excludeUserId?: string): CollectiveKnowledge | null {
  const relevant = excludeUserId ? memories.filter(m => m.userId !== excludeUserId) : memories
  if (relevant.length === 0) return null

  const documentId = relevant[0].documentId
  const sectionMap = new Map<string, SectionKnowledge>()

  for (const memory of relevant) {
    // Confusion points
    for (const cp of memory.confusionPoints) {
      const key = cp.sectionId || cp.sectionName
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { sectionId: cp.sectionId, sectionName: cp.sectionName, confusionCount: 0, topConfusionPassages: [], resolvedInsights: [], openQuestions: [], consensusPoints: [] })
      }
      const sk = sectionMap.get(key)!
      sk.confusionCount++
      if (cp.passageQuote && !sk.topConfusionPassages.includes(cp.passageQuote)) {
        sk.topConfusionPassages.push(cp.passageQuote)
      }
      if (cp.resolved && cp.resolutionSummary && !sk.resolvedInsights.includes(cp.resolutionSummary)) {
        sk.resolvedInsights.push(cp.resolutionSummary)
      }
    }
    // Open questions
    for (const oq of memory.openQuestions) {
      const key = oq.sectionId || 'general'
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { sectionId: oq.sectionId, sectionName: key, confusionCount: 0, topConfusionPassages: [], resolvedInsights: [], openQuestions: [], consensusPoints: [] })
      }
      const sk = sectionMap.get(key)!
      if (!sk.openQuestions.includes(oq.question)) sk.openQuestions.push(oq.question)
    }
    // Consensus
    for (const ap of memory.agreedPoints) {
      const key = ap.sectionId || 'general'
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { sectionId: ap.sectionId, sectionName: key, confusionCount: 0, topConfusionPassages: [], resolvedInsights: [], openQuestions: [], consensusPoints: [] })
      }
      sectionMap.get(key)!.consensusPoints.push(ap.claim)
    }
  }

  // Cap arrays
  for (const [, sk] of sectionMap) {
    sk.topConfusionPassages = sk.topConfusionPassages.slice(0, 3)
    sk.resolvedInsights = sk.resolvedInsights.slice(0, 3)
    sk.openQuestions = sk.openQuestions.slice(0, 3)
    sk.consensusPoints = sk.consensusPoints.slice(0, 3)
  }

  const sectionInsights = [...sectionMap.values()].sort((a, b) => b.confusionCount - a.confusionCount)

  return {
    documentId,
    totalSessions: relevant.length,
    primerMessage: '',
    sectionInsights,
    lastUpdated: new Date().toISOString(),
  }
}

async function generatePrimer(knowledge: CollectiveKnowledge, documentTitle?: string): Promise<string> {
  if (knowledge.sectionInsights.length === 0) return ''

  const topSections = knowledge.sectionInsights.slice(0, 3)
  const summaryForAI = topSections.map(s =>
    `${s.sectionName}: ${s.confusionCount} reader(s) confused. ` +
    (s.topConfusionPassages[0] ? `Key confusion: "${s.topConfusionPassages[0].slice(0, 80)}". ` : '') +
    (s.resolvedInsights[0] ? `What helped: ${s.resolvedInsights[0]}. ` : '') +
    (s.openQuestions[0] ? `Still open: "${s.openQuestions[0]}". ` : '')
  ).join('\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `You are a reading guide for PhD researchers. Previous readers of "${documentTitle || 'this paper'}" left the following notes:\n\n${summaryForAI}\n\nWrite a 2-3 sentence briefing for a new reader. Be specific: name the exact sections and what to watch for. Start with "Previous readers of this paper…". Do not use bullet points.`
      }],
      max_tokens: 120,
      temperature: 0.2,
    })
    return completion.choices[0]?.message?.content?.trim() || ''
  } catch { return '' }
}

// ── GET: retrieve collective knowledge for a document ─────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  const userId = searchParams.get('userId') || undefined
  const documentTitle = searchParams.get('title') || undefined

  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  const memories = await loadSessionMemories(documentId)
  const knowledge = aggregateKnowledge(memories, userId)

  if (!knowledge) return NextResponse.json({ success: true, knowledge: null })

  knowledge.primerMessage = await generatePrimer(knowledge, documentTitle)
  return NextResponse.json({ success: true, knowledge })
}

// ── POST: save session memory ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'save-session') {
      const memory: SessionMemory = body.memory
      if (!memory?.documentId || !memory?.userId) {
        return NextResponse.json({ error: 'Invalid session memory' }, { status: 400 })
      }
      memory.id = memory.id || `mem_${Date.now()}_${memory.userId}`
      memory.timestamp = memory.timestamp || new Date().toISOString()
      await saveSessionMemory(memory.documentId, memory)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[collective-memory]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
