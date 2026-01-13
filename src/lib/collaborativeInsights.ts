// Collaborative Reading Insights System
export interface ReadingInsight {
  id: string
  documentId: string
  userId: string
  userName: string
  timestamp: string
  type: 'annotation' | 'confusion' | 'insight' | 'understanding' | 'question' | 'highlight'
  content: string
  pageNumber?: number
  position?: { x: number; y: number }
  color?: string
  tags?: string[]
  isPublic: boolean
  likes: number
  replies: ReadingInsight[]
  parentId?: string
}

export interface CollaborativeSummary {
  documentId: string
  totalReaders: number
  totalInsights: number
  topInsights: ReadingInsight[]
  commonConfusions: string[]
  keyInsights: string[]
  readingTime: number
  lastUpdated: string
}

import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// File-based storage directory for insights
const INSIGHTS_DIR = join(process.cwd(), 'data', 'insights')

// Ensure insights directory exists
async function ensureInsightsDir() {
  if (!existsSync(INSIGHTS_DIR)) {
    await mkdir(INSIGHTS_DIR, { recursive: true })
  }
}

// Get file path for document insights
function getDocumentInsightsPath(documentId: string): string {
  return join(INSIGHTS_DIR, `${documentId}.json`)
}

// Store reading insight
export async function storeReadingInsight(documentId: string, insight: ReadingInsight) {
  try {
    await ensureInsightsDir()
    const filePath = getDocumentInsightsPath(documentId)

    // Read existing insights or create new array
    let insights: ReadingInsight[] = []
    if (existsSync(filePath)) {
      const data = await readFile(filePath, 'utf-8')
      insights = JSON.parse(data)
    }

    // Add new insight
    insights.push(insight)

    // Save back to file
    await writeFile(filePath, JSON.stringify(insights, null, 2))
    console.log('💡 Reading insight stored:', insight.id, 'for document:', documentId)

    return insight
  } catch (error) {
    console.error('❌ Error storing reading insight:', error)
    throw error
  }
}

// Get all insights for a document
export async function getDocumentInsights(documentId: string): Promise<ReadingInsight[]> {
  try {
    const filePath = getDocumentInsightsPath(documentId)
    if (!existsSync(filePath)) {
      return []
    }

    const data = await readFile(filePath, 'utf-8')
    const insights = JSON.parse(data) as ReadingInsight[]
    console.log('💡 Retrieved', insights.length, 'insights for document:', documentId)
    return insights
  } catch (error) {
    console.error('❌ Error reading document insights:', error)
    return []
  }
}

// Get collaborative summary for a document
export async function getCollaborativeSummary(documentId: string): Promise<CollaborativeSummary> {
  try {
    const insights = await getDocumentInsights(documentId)

    // Calculate summary statistics
    const uniqueReaders = new Set(insights.map(i => i.userId)).size
    const publicInsights = insights.filter(i => i.isPublic)

    // Get top insights (most liked)
    const topInsights = publicInsights
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)

    // Get common confusions
    const confusions = publicInsights
      .filter(i => i.type === 'confusion')
      .map(i => i.content)

    // Get key insights
    const keyInsights = publicInsights
      .filter(i => i.type === 'insight')
      .map(i => i.content)

    // Calculate average reading time (mock data for now)
    const readingTime = insights.length * 2 // 2 minutes per insight

    const summary: CollaborativeSummary = {
      documentId,
      totalReaders: uniqueReaders,
      totalInsights: publicInsights.length,
      topInsights,
      commonConfusions: confusions.slice(0, 3),
      keyInsights: keyInsights.slice(0, 5),
      readingTime,
      lastUpdated: new Date().toISOString()
    }

    console.log('📊 Collaborative summary generated for document:', documentId)
    return summary
  } catch (error) {
    console.error('❌ Error generating collaborative summary:', error)
    throw error
  }
}

// Check if other researchers have read this document
export async function checkOtherReaders(documentId: string, currentUserId: string): Promise<{
  hasOtherReaders: boolean
  readerCount: number
  summary?: CollaborativeSummary
}> {
  try {
    const insights = await getDocumentInsights(documentId)
    const otherReaders = insights.filter(i => i.userId !== currentUserId)

    if (otherReaders.length === 0) {
      return {
        hasOtherReaders: false,
        readerCount: 0
      }
    }

    const uniqueOtherReaders = new Set(otherReaders.map(i => i.userId)).size
    const summary = await getCollaborativeSummary(documentId)

    return {
      hasOtherReaders: true,
      readerCount: uniqueOtherReaders,
      summary
    }
  } catch (error) {
    console.error('❌ Error checking other readers:', error)
    return {
      hasOtherReaders: false,
      readerCount: 0
    }
  }
}

// Create a new reading insight
export function createReadingInsight(
  documentId: string,
  userId: string,
  userName: string,
  type: ReadingInsight['type'],
  content: string,
  options: {
    pageNumber?: number
    position?: { x: number; y: number }
    color?: string
    tags?: string[]
    isPublic?: boolean
    parentId?: string
  } = {}
): ReadingInsight {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    documentId,
    userId,
    userName,
    timestamp: new Date().toISOString(),
    type,
    content,
    pageNumber: options.pageNumber,
    position: options.position,
    color: options.color,
    tags: options.tags || [],
    isPublic: options.isPublic ?? true,
    likes: 0,
    replies: [],
    parentId: options.parentId
  }
}

// ========== STRUGGLE TRACKING & GHOST HIGHLIGHTS ==========

export interface StruggleInsight {
  id: string
  userId: string
  userName: string
  documentId: string
  sectionId: string
  sectionName: string
  startTime: number
  endTime?: number
  duration?: number // in milliseconds
  resolutionMethod?: 'peer-help' | 'figure-reference' | 'external-search' | 'self-resolved' | 'still-struggling'
  resolutionDetails?: string // e.g., "Figure 3 helped" or "Peer explained concept"
  behavioralPatterns: string[] // e.g., ['re-read-loop', 'gaze-panic']
  confusionHighlights: number
  timestamp: number
}

export interface GhostHighlight {
  sectionId: string
  documentId: string
  aggregatedData: {
    totalUsers: number
    averageDuration: number // in milliseconds
    commonPatterns: string[]
    resolutionMethods: { method: string; count: number }[]
    helpfulResources: string[] // e.g., ["Figure 3", "Section 2.1"]
  }
  individualJourneys: {
    userId: string
    userName: string
    duration: number
    resolution: string
    timestamp: number
  }[]
}

// Get file path for struggle data
function getStruggleDataPath(documentId: string): string {
  return join(INSIGHTS_DIR, `${documentId}_struggles.json`)
}

// Get file path for ghost highlights
function getGhostHighlightsPath(documentId: string): string {
  return join(INSIGHTS_DIR, `${documentId}_ghosts.json`)
}

// Record struggle start
export async function recordStruggleStart(
  documentId: string,
  userId: string,
  userName: string,
  sectionId: string,
  sectionName: string,
  behavioralPatterns: string[] = [],
  confusionHighlights: number = 0
): Promise<StruggleInsight> {
  try {
    await ensureInsightsDir()
    const filePath = getStruggleDataPath(documentId)

    const struggle: StruggleInsight = {
      id: `${userId}-${sectionId}-${Date.now()}`,
      userId,
      userName,
      documentId,
      sectionId,
      sectionName,
      startTime: Date.now(),
      behavioralPatterns,
      confusionHighlights,
      timestamp: Date.now()
    }

    // Read existing struggles
    let struggles: StruggleInsight[] = []
    if (existsSync(filePath)) {
      const data = await readFile(filePath, 'utf-8')
      struggles = JSON.parse(data)
    }

    struggles.push(struggle)
    await writeFile(filePath, JSON.stringify(struggles, null, 2))

    console.log('📊 [Struggle] Started tracking:', struggle.id)
    return struggle
  } catch (error) {
    console.error('❌ Error recording struggle start:', error)
    throw error
  }
}

// Record struggle end and resolution
export async function recordStruggleEnd(
  documentId: string,
  struggleId: string,
  resolutionMethod: StruggleInsight['resolutionMethod'],
  resolutionDetails?: string
): Promise<StruggleInsight | null> {
  try {
    const filePath = getStruggleDataPath(documentId)
    if (!existsSync(filePath)) {
      console.error('❌ No struggle data found for document:', documentId)
      return null
    }

    const data = await readFile(filePath, 'utf-8')
    const struggles: StruggleInsight[] = JSON.parse(data)

    const struggle = struggles.find(s => s.id === struggleId)
    if (!struggle) {
      console.error('❌ Struggle not found:', struggleId)
      return null
    }

    struggle.endTime = Date.now()
    struggle.duration = struggle.endTime - struggle.startTime
    struggle.resolutionMethod = resolutionMethod
    struggle.resolutionDetails = resolutionDetails

    await writeFile(filePath, JSON.stringify(struggles, null, 2))

    // Update ghost highlights
    await updateGhostHighlights(documentId, struggle)

    console.log('✅ [Struggle] Resolved:', struggleId, 'Duration:', struggle.duration, 'ms')
    return struggle
  } catch (error) {
    console.error('❌ Error recording struggle end:', error)
    throw error
  }
}

// Get all struggles for a document
export async function getDocumentStruggles(documentId: string): Promise<StruggleInsight[]> {
  try {
    const filePath = getStruggleDataPath(documentId)
    if (!existsSync(filePath)) {
      return []
    }

    const data = await readFile(filePath, 'utf-8')
    const struggles = JSON.parse(data) as StruggleInsight[]
    return struggles
  } catch (error) {
    console.error('❌ Error reading struggles:', error)
    return []
  }
}

// Get ghost highlights for a document
export async function getGhostHighlights(
  documentId: string,
  sectionId?: string
): Promise<GhostHighlight[]> {
  try {
    const filePath = getGhostHighlightsPath(documentId)
    if (!existsSync(filePath)) {
      return []
    }

    const data = await readFile(filePath, 'utf-8')
    const highlights = JSON.parse(data) as GhostHighlight[]

    if (sectionId) {
      return highlights.filter(h => h.sectionId === sectionId)
    }

    return highlights
  } catch (error) {
    console.error('❌ Error reading ghost highlights:', error)
    return []
  }
}

// Update ghost highlights aggregation
async function updateGhostHighlights(documentId: string, struggle: StruggleInsight) {
  try {
    const filePath = getGhostHighlightsPath(documentId)

    // Read existing highlights
    let highlights: GhostHighlight[] = []
    if (existsSync(filePath)) {
      const data = await readFile(filePath, 'utf-8')
      highlights = JSON.parse(data)
    }

    // Find or create highlight for this section
    let highlight = highlights.find(h => h.sectionId === struggle.sectionId)
    if (!highlight) {
      highlight = {
        sectionId: struggle.sectionId,
        documentId: struggle.documentId,
        aggregatedData: {
          totalUsers: 0,
          averageDuration: 0,
          commonPatterns: [],
          resolutionMethods: [],
          helpfulResources: []
        },
        individualJourneys: []
      }
      highlights.push(highlight)
    }

    // Add individual journey
    highlight.individualJourneys.push({
      userId: struggle.userId,
      userName: struggle.userName,
      duration: struggle.duration || 0,
      resolution: struggle.resolutionDetails || struggle.resolutionMethod || 'unknown',
      timestamp: struggle.timestamp
    })

    // Update aggregated data
    highlight.aggregatedData.totalUsers = highlight.individualJourneys.length

    // Calculate average duration
    const totalDuration = highlight.individualJourneys.reduce((sum, j) => sum + j.duration, 0)
    highlight.aggregatedData.averageDuration = totalDuration / highlight.individualJourneys.length

    // Aggregate behavioral patterns
    const patternCounts = new Map<string, number>()
    struggle.behavioralPatterns.forEach(pattern => {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1)
    })
    highlight.aggregatedData.commonPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern)

    // Aggregate resolution methods
    const methodCounts = new Map<string, number>()
    highlight.individualJourneys.forEach(j => {
      const method = j.resolution.split(' ')[0]
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1)
    })
    highlight.aggregatedData.resolutionMethods = Array.from(methodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)

    // Extract helpful resources from resolution details
    if (struggle.resolutionDetails) {
      const figureMatch = struggle.resolutionDetails.match(/Figure \d+/i)
      const sectionMatch = struggle.resolutionDetails.match(/Section \d+(\.\d+)?/i)

      if (figureMatch && !highlight.aggregatedData.helpfulResources.includes(figureMatch[0])) {
        highlight.aggregatedData.helpfulResources.push(figureMatch[0])
      }
      if (sectionMatch && !highlight.aggregatedData.helpfulResources.includes(sectionMatch[0])) {
        highlight.aggregatedData.helpfulResources.push(sectionMatch[0])
      }
    }

    // Save updated highlights
    await writeFile(filePath, JSON.stringify(highlights, null, 2))

    console.log('👻 [Ghost Highlights] Updated:', struggle.sectionId, 'Total users:', highlight.aggregatedData.totalUsers)
  } catch (error) {
    console.error('❌ Error updating ghost highlights:', error)
    throw error
  }
}

// Get journey replay for a specific user and section
export async function getJourneyReplay(
  documentId: string,
  sectionId: string,
  userId?: string
): Promise<StruggleInsight[]> {
  try {
    const struggles = await getDocumentStruggles(documentId)

    // Filter by section
    let sectionStruggles = struggles.filter(
      s => s.sectionId === sectionId && s.endTime // Only completed struggles
    )

    // If userId specified, get that user's journey
    if (userId) {
      sectionStruggles = sectionStruggles.filter(s => s.userId === userId)
    }

    // Sort by timestamp
    sectionStruggles.sort((a, b) => a.timestamp - b.timestamp)

    return sectionStruggles
  } catch (error) {
    console.error('❌ Error getting journey replay:', error)
    return []
  }
}
