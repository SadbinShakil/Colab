// lib/agents/Agent3_DiscussionFacilitator.ts
'use client'

/**
 * AGENT 3: Discussion Facilitator
 * 
 * Role: Manages conversations and facilitates productive discussions between users and AI
 * 
 * Responsibilities:
 * - Open chat channels (peer-to-peer or AI chat)
 * - Provide contextual conversation starters
 * - Track conversation quality
 * - Suggest discussion topics
 * - Moderate discussions (prevent off-topic)
 * 
 * Activation: Event-based (when collaboration or AI help requested)
 */

export interface ChatChannel {
  channelId: string
  type: 'peer-to-peer' | 'ai-chat' | 'group' | 'system'
  participants: string[]
  sectionId?: string
  startTime: number
  lastActivity: number
  messageCount: number
  active: boolean
}

export interface ConversationStarter {
  text: string
  type: 'clarification' | 'explanation' | 'comparison' | 'elaboration'
  context: string
  priority: number
}

export interface DiscussionMetrics {
  channelId: string
  engagementScore: number // 0-100
  topicRelevance: number // 0-100
  participationBalance: number // 0-100 (how balanced is participation)
  helpful: boolean
}

class Agent3_DiscussionFacilitator {
  private agentId = 'agent-3-discussion-facilitator'
  private isActive = false
  private activeChannels: Map<string, ChatChannel> = new Map()
  private conversationHistory: Map<string, any[]> = new Map()

  // ============================================================================
  // AGENT LIFECYCLE
  // ============================================================================

  activate() {
    this.isActive = true
    console.log('🤖 [Agent 3] Discussion Facilitator activated')
  }

  deactivate() {
    this.isActive = false
    console.log('🤖 [Agent 3] Discussion Facilitator deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Discussion Facilitator',
      active: this.isActive,
      type: 'event-based',
      description: 'Facilitates productive conversations',
      activeChannels: this.activeChannels.size
    }
  }

  // ============================================================================
  // CHANNEL MANAGEMENT
  // ============================================================================

  openPeerChat(user1Id: string, user2Id: string, sectionId: string): string {
    const channelId = `peer-${user1Id}-${user2Id}-${Date.now()}`
    
    const channel: ChatChannel = {
      channelId,
      type: 'peer-to-peer',
      participants: [user1Id, user2Id],
      sectionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      active: true
    }
    
    this.activeChannels.set(channelId, channel)
    this.conversationHistory.set(channelId, [])
    
    console.log(`🤖 [Agent 3] Peer chat opened: ${channelId}`)
    
    // Generate conversation starters
    const starters = this.generateConversationStarters(sectionId, 'peer-to-peer')
    
    // Emit event
    this.emitEvent('chat-opened', { channelId, channel, starters })
    
    return channelId
  }

  openAIChat(userId: string, sectionId: string, context: any): string {
    const channelId = `ai-${userId}-${Date.now()}`
    
    const channel: ChatChannel = {
      channelId,
      type: 'ai-chat',
      participants: [userId, 'ai'],
      sectionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      active: true
    }
    
    this.activeChannels.set(channelId, channel)
    this.conversationHistory.set(channelId, [])
    
    console.log(`🤖 [Agent 3] AI chat opened: ${channelId}`)
    
    // Generate contextual opening
    const opening = this.generateAIOpening(context)
    
    // Emit event
    this.emitEvent('ai-chat-opened', { channelId, channel, opening })
    
    return channelId
  }

  closeChannel(channelId: string) {
    const channel = this.activeChannels.get(channelId)
    if (!channel) return
    
    channel.active = false
    
    const metrics = this.calculateDiscussionMetrics(channelId)
    
    console.log(`🤖 [Agent 3] Channel closed: ${channelId}, engagement: ${metrics.engagementScore}`)
    
    // Emit event
    this.emitEvent('chat-closed', { channelId, metrics })
  }

  // ============================================================================
  // CONVERSATION STARTERS
  // ============================================================================

  generateConversationStarters(sectionId: string, chatType: 'peer-to-peer' | 'ai-chat'): ConversationStarter[] {
    const starters: ConversationStarter[] = []
    
    if (chatType === 'peer-to-peer') {
      starters.push(
        {
          text: "Can you explain what you found confusing about this section?",
          type: 'clarification',
          context: sectionId,
          priority: 1
        },
        {
          text: "How did you approach understanding this part?",
          type: 'explanation',
          context: sectionId,
          priority: 2
        },
        {
          text: "What helped you get past the tricky parts?",
          type: 'elaboration',
          context: sectionId,
          priority: 3
        }
      )
    } else {
      starters.push(
        {
          text: "Can you explain this concept in simpler terms?",
          type: 'clarification',
          context: sectionId,
          priority: 1
        },
        {
          text: "What's the main idea I should focus on?",
          type: 'explanation',
          context: sectionId,
          priority: 2
        },
        {
          text: "Can you give me an example or analogy?",
          type: 'elaboration',
          context: sectionId,
          priority: 3
        }
      )
    }
    
    return starters
  }

  private generateAIOpening(context: any): string {
    // Generate contextual opening for AI chat based on user's struggle
    if (context.confusionHighlights > 2) {
      return "I see you're finding this section challenging. Let's break it down together. What specific part is unclear?"
    } else if (context.stuckMarkers > 0) {
      return "I noticed you marked this as difficult. I'm here to help! What would you like me to explain?"
    } else {
      return "Hi! I'm here to help you understand this section. What would you like to discuss?"
    }
  }

  // ============================================================================
  // CONVERSATION TRACKING
  // ============================================================================

  trackMessage(channelId: string, message: any) {
    const channel = this.activeChannels.get(channelId)
    if (!channel) return
    
    channel.messageCount++
    channel.lastActivity = Date.now()
    
    const history = this.conversationHistory.get(channelId) || []
    history.push({
      ...message,
      timestamp: Date.now()
    })
    this.conversationHistory.set(channelId, history)
  }

  // ============================================================================
  // DISCUSSION QUALITY ANALYSIS
  // ============================================================================

  calculateDiscussionMetrics(channelId: string): DiscussionMetrics {
    const channel = this.activeChannels.get(channelId)
    const history = this.conversationHistory.get(channelId) || []
    
    if (!channel) {
      return {
        channelId,
        engagementScore: 0,
        topicRelevance: 0,
        participationBalance: 0,
        helpful: false
      }
    }
    
    // Engagement: based on message count and time
    const duration = Date.now() - channel.startTime
    const messagesPerMinute = (channel.messageCount / (duration / 60000)) || 0
    const engagementScore = Math.min(messagesPerMinute * 20, 100)
    
    // Topic relevance: simple heuristic (in real system, would use NLP)
    const topicRelevance = channel.sectionId ? 80 : 50
    
    // Participation balance (for peer chats)
    let participationBalance = 100
    if (channel.type === 'peer-to-peer') {
      const userCounts = new Map<string, number>()
      history.forEach(msg => {
        const count = userCounts.get(msg.userId) || 0
        userCounts.set(msg.userId, count + 1)
      })
      
      const counts = Array.from(userCounts.values())
      if (counts.length === 2) {
        const [count1, count2] = counts
        const ratio = Math.min(count1, count2) / Math.max(count1, count2)
        participationBalance = Math.round(ratio * 100)
      }
    }
    
    // Helpful: if conversation was productive
    const helpful = engagementScore > 40 && channel.messageCount > 3
    
    return {
      channelId,
      engagementScore: Math.round(engagementScore),
      topicRelevance: Math.round(topicRelevance),
      participationBalance: Math.round(participationBalance),
      helpful
    }
  }

  // ============================================================================
  // MODERATION & GUIDANCE
  // ============================================================================

  suggestDiscussionTopics(channelId: string, currentContext: any): string[] {
    const suggestions: string[] = []
    
    // Based on confusion points
    if (currentContext.confusionHighlights > 0) {
      suggestions.push("Discuss the parts that were marked as confusing")
    }
    
    // Based on annotations
    if (currentContext.annotations > 0) {
      suggestions.push("Review the notes and comments you both made")
    }
    
    // Based on time
    if (currentContext.timeSpent > 300000) { // 5 minutes
      suggestions.push("Summarize what you've learned so far")
    }
    
    // Default
    if (suggestions.length === 0) {
      suggestions.push("Walk through the main concepts step by step")
    }
    
    return suggestions
  }

  detectOffTopic(channelId: string): boolean {
    // Simple heuristic: if no messages in 5 minutes, might be off-topic or stalled
    const channel = this.activeChannels.get(channelId)
    if (!channel) return false
    
    const timeSinceActivity = Date.now() - channel.lastActivity
    return timeSinceActivity > 300000 // 5 minutes
  }

  // ============================================================================
  // QUERY METHODS (Called by Coordination Core)
  // ============================================================================

  getActiveChannels(): ChatChannel[] {
    return Array.from(this.activeChannels.values()).filter(c => c.active)
  }

  getChannelMetrics(channelId: string): DiscussionMetrics | null {
    if (!this.activeChannels.has(channelId)) return null
    return this.calculateDiscussionMetrics(channelId)
  }

  getConversationHistory(channelId: string): any[] {
    return this.conversationHistory.get(channelId) || []
  }

  isChannelActive(channelId: string): boolean {
    const channel = this.activeChannels.get(channelId)
    return channel?.active || false
  }

  private emitEvent(eventType: string, data: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`agent3:${eventType}`, { detail: data }))
    }
  }

  // ============================================================================
  // STATS
  // ============================================================================

  getDiscussionStats() {
    const channels = Array.from(this.activeChannels.values())
    
    return {
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.active).length,
      peerChats: channels.filter(c => c.type === 'peer-to-peer').length,
      aiChats: channels.filter(c => c.type === 'ai-chat').length,
      avgMessagesPerChannel: channels.length > 0
        ? Math.round(channels.reduce((sum, c) => sum + c.messageCount, 0) / channels.length)
        : 0
    }
  }
}

// Export singleton instance
export const agent3_discussionFacilitator = new Agent3_DiscussionFacilitator()

// Export types
export type { Agent3_DiscussionFacilitator }