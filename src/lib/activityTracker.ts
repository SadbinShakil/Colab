// lib/activityTracker.ts
export type ActivityType = 
  | 'read'
  | 'highlight' 
  | 'comment'
  | 'ai_math'
  | 'ai_general'
  | 'ai_table'
  | 'ai_image'
  | 'prerequisite'
  | 'stuck'
  | 'screenshot'
  | 'page_change'
  | 'scroll'
  | 'text_selection'

export interface Activity {
  id: string
  type: ActivityType
  timestamp: Date
  userId: string
  userName: string
  documentId: string
  location: {
    page: number
    section?: string
    coordinates?: { x: number; y: number }
  }
  content: string
  metadata?: {
    duration?: number
    aiResponse?: string
    highlightColor?: string
    scrollPosition?: number
    selectionLength?: number
    annotationId?: string
  }
}

class ActivityTrackerService {
  private activities: Activity[] = []
  private pageStartTime: number = Date.now()
  private currentPage: number = 1

  // Track reading time automatically
  trackPageChange(page: number, userId: string, userName: string, documentId: string) {
    const timeSpent = Date.now() - this.pageStartTime
    
    // Only track if spent more than 2 seconds (actual reading)
    if (timeSpent > 2000) {
      this.trackActivity({
        type: 'read',
        userId,
        userName,
        documentId,
        location: { page: this.currentPage },
        content: `Read page ${this.currentPage}`,
        metadata: { duration: timeSpent }
      })
    }
    
    this.currentPage = page
    this.pageStartTime = Date.now()
    
    // Track page change
    this.trackActivity({
      type: 'page_change',
      userId,
      userName,
      documentId,
      location: { page },
      content: `Navigated to page ${page}`
    })
  }

  trackActivity(activity: Omit<Activity, 'id' | 'timestamp'>) {
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    this.activities.push(newActivity)
    console.log('📊 Activity tracked:', newActivity)
    
    // Save to backend
    this.saveToBackend(newActivity)
    
    // Also save to localStorage for immediate access
    this.saveToLocalStorage(newActivity)
    
    return newActivity
  }

  private async saveToBackend(activity: Activity) {
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      })
    } catch (error) {
      console.error('Failed to save activity to backend:', error)
    }
  }

  private saveToLocalStorage(activity: Activity) {
    try {
      const key = `activities_${activity.documentId}_${activity.userId}`
      const stored = localStorage.getItem(key)
      const activities = stored ? JSON.parse(stored) : []
      activities.push(activity)
      
      // Keep only last 1000 activities
      if (activities.length > 1000) {
        activities.shift()
      }
      
      localStorage.setItem(key, JSON.stringify(activities))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  getActivitiesFromLocalStorage(documentId: string, userId: string): Activity[] {
    try {
      const key = `activities_${documentId}_${userId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return []
    }
  }

  async getActivities(filters?: {
    userId?: string
    documentId?: string
    type?: ActivityType
    startDate?: Date
    endDate?: Date
  }): Promise<Activity[]> {
    // Try to get from localStorage first for instant load
    let activities: Activity[] = []
    
    if (filters?.documentId && filters?.userId) {
      activities = this.getActivitiesFromLocalStorage(filters.documentId, filters.userId)
    }
    
    // Then fetch from backend for complete data
    try {
      const params = new URLSearchParams()
      if (filters?.userId) params.append('userId', filters.userId)
      if (filters?.documentId) params.append('documentId', filters.documentId)
      if (filters?.type) params.append('type', filters.type)
      
      const response = await fetch(`/api/activities?${params}`)
      if (response.ok) {
        const backendActivities = await response.json()
        // Merge and deduplicate
        const allActivities = [...activities, ...backendActivities]
        const uniqueActivities = Array.from(
          new Map(allActivities.map(a => [a.id, a])).values()
        )
        activities = uniqueActivities
      }
    } catch (error) {
      console.error('Failed to fetch from backend:', error)
      // Continue with localStorage data
    }

    // Apply filters
    let filtered = activities

    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type)
    }
    if (filters?.startDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) >= filters.startDate!)
    }
    if (filters?.endDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) <= filters.endDate!)
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  async getStats(userId: string, documentId: string) {
    const userActivities = await this.getActivities({ userId, documentId })
    
    const highlights = userActivities.filter(a => a.type === 'highlight')
    const comments = userActivities.filter(a => a.type === 'comment')
    const aiRequests = userActivities.filter(a => a.type.startsWith('ai_'))
    const readActivities = userActivities.filter(a => a.type === 'read')
    
    const readingTime = readActivities.reduce((total, a) => 
      total + (a.metadata?.duration || 0), 0
    )
    
    // Calculate most active pages
    const pageCounts = new Map<number, number>()
    userActivities.forEach(a => {
      const page = a.location.page
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1)
    })
    
    const mostActivePages = Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    // Calculate comprehension trend
    const comprehensionTrend = this.calculateComprehensionTrend(userActivities)
    
    return {
      totalActivities: userActivities.length,
      highlights: highlights.length,
      comments: comments.length,
      aiRequests: aiRequests.length,
      readingTime: Math.round(readingTime / 1000), // Convert to seconds
      readingTimeFormatted: this.formatDuration(readingTime),
      mostActivePages,
      comprehensionTrend,
      activityByType: this.groupByType(userActivities),
      activityByDate: this.groupByDate(userActivities)
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  private calculateComprehensionTrend(activities: Activity[]): { start: number; current: number } {
    // Base comprehension on activity diversity and AI usage
    const aiActivities = activities.filter(a => a.type.startsWith('ai_'))
    const totalActivities = activities.length
    
    if (totalActivities === 0) return { start: 0, current: 0 }
    
    // Calculate early comprehension (first 25% of activities)
    const earlyActivities = activities.slice(Math.floor(totalActivities * 0.75))
    const earlyAI = earlyActivities.filter(a => a.type.startsWith('ai_')).length
    const startScore = Math.min(100, Math.max(20, 50 - (earlyAI * 5)))
    
    // Calculate current comprehension (last 25% of activities)
    const recentActivities = activities.slice(0, Math.ceil(totalActivities * 0.25))
    const recentAI = recentActivities.filter(a => a.type.startsWith('ai_')).length
    const currentScore = Math.min(100, Math.max(40, 70 + ((totalActivities - aiActivities.length) / totalActivities * 30)))
    
    return { start: Math.round(startScore), current: Math.round(currentScore) }
  }

  private groupByType(activities: Activity[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    activities.forEach(a => {
      grouped[a.type] = (grouped[a.type] || 0) + 1
    })
    return grouped
  }

  private groupByDate(activities: Activity[]): Record<string, Activity[]> {
    const grouped: Record<string, Activity[]> = {}
    activities.forEach(a => {
      const date = new Date(a.timestamp).toDateString()
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(a)
    })
    return grouped
  }

  // Get heatmap data
  async getHeatmapData(userId: string, documentId: string, totalPages: number) {
    const activities = await this.getActivities({ userId, documentId })
    
    const pageActivity: Record<number, number> = {}
    activities.forEach(a => {
      const page = a.location.page
      pageActivity[page] = (pageActivity[page] || 0) + 1
    })
    
    const maxActivity = Math.max(...Object.values(pageActivity), 1)
    
    return Array.from({ length: totalPages }, (_, i) => {
      const page = i + 1
      const activity = pageActivity[page] || 0
      return {
        page,
        activity,
        intensity: (activity / maxActivity) * 100
      }
    })
  }
}

export const activityTracker = new ActivityTrackerService()