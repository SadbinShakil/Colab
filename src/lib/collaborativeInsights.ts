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

const { writeFile, readFile, readdir, mkdir } = require('fs/promises')
const { join } = require('path')
const { existsSync } = require('fs')

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
