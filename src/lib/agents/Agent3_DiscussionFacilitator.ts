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
  groundingQuote?: string
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

  openPeerChat(
    user1Id: string,
    user2Id: string,
    sectionId: string,
    sectionText = '',
    sectionName = sectionId
  ): string {
    const channelId = `peer-${user1Id}-${user2Id}-${Date.now()}`

    const channel: ChatChannel = {
      channelId,
      type: 'peer-to-peer',
      participants: [user1Id, user2Id],
      sectionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      active: true,
    }

    this.activeChannels.set(channelId, channel)
    this.conversationHistory.set(channelId, [])

    console.log(`🤖 [A3] Peer chat opened: ${channelId}`)

    // Generate grounded starters async — emit event when ready
    this.generateConversationStartersFromText(sectionId, sectionName, sectionText, 'peer-to-peer', 2)
      .then(starters => {
        this.emitEvent('chat-opened', { channelId, channel, starters })
      })

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

  /**
   * Generate section-grounded discussion prompts via GPT-4o.
   * Falls back to generic starters if sectionText is not available.
   */
  async generateConversationStartersFromText(
    sectionId: string,
    sectionName: string,
    sectionText: string,
    chatType: 'peer-to-peer' | 'group',
    participantCount: number,
    confusionContext?: { confusionHighlights: number; stuckMarkers: number; avgDsScore: number }
  ): Promise<ConversationStarter[]> {
    if (!sectionText || sectionText.length < 50) {
      return this.generateConversationStarters(sectionId, chatType === 'peer-to-peer' ? 'peer-to-peer' : 'ai-chat')
    }

    try {
      const res = await fetch('/api/a3-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionText,
          sectionName,
          chatType,
          participantCount,
          confusionContext,
        }),
      })

      if (!res.ok) throw new Error(`A3 API ${res.status}`)

      const { prompts } = await res.json()

      const starters: ConversationStarter[] = (prompts || []).map((p: any) => ({
        text: p.text,
        type: p.type as ConversationStarter['type'],
        context: sectionId,
        priority: p.priority,
        groundingQuote: p.groundingQuote,
      }))

      console.log(`🤖 [A3] Generated ${starters.length} grounded discussion starters for "${sectionName}"`)
      this.emitEvent('starters-generated', { sectionId, sectionName, count: starters.length, chatType })

      return starters
    } catch (err) {
      console.warn('[A3] API call failed, using fallback starters:', err)
      return this.generateConversationStarters(sectionId, chatType === 'peer-to-peer' ? 'peer-to-peer' : 'ai-chat')
    }
  }

  /** Synchronous fallback — PhD-level starters when no section text is available */
  generateConversationStarters(sectionId: string, chatType: 'peer-to-peer' | 'ai-chat'): ConversationStarter[] {
    const starters: ConversationStarter[] = []

    if (chatType === 'peer-to-peer') {
      starters.push(
        {
          text: "What is the load-bearing assumption in this section — the claim the entire argument depends on?",
          type: 'clarification',
          context: sectionId,
          priority: 1,
        },
        {
          text: "Is the evidence presented sufficient to support the conclusion, or is there an inferential leap the authors are glossing over?",
          type: 'comparison',
          context: sectionId,
          priority: 2,
        },
        {
          text: "What methodological choice in this section would a reviewer most likely push back on, and why?",
          type: 'elaboration',
          context: sectionId,
          priority: 3,
        }
      )
    } else {
      starters.push(
        {
          text: "What is the weakest link in the argument presented here — the claim that least follows from the evidence?",
          type: 'clarification',
          context: sectionId,
          priority: 1,
        },
        {
          text: "Trace the causal chain: what mechanism connects the key variables, and where does the paper leave it implicit?",
          type: 'explanation',
          context: sectionId,
          priority: 2,
        },
        {
          text: "Which prior work does this most directly challenge or build on, and how does the contribution change if that prior work is wrong?",
          type: 'comparison',
          context: sectionId,
          priority: 3,
        }
      )
    }

    return starters
  }

  private generateAIOpening(context: any): string {
    if (context.confusionHighlights > 2) {
      return "Multiple confusion signals detected in this section. What specifically is the claim or mechanism that isn't holding together?"
    } else if (context.stuckMarkers > 0) {
      return "You flagged this section. What is the specific assumption or step that isn't working — is it the method, the evidence, or the framing?"
    } else {
      return "What do you want to interrogate here — the mechanism, the evidence quality, or the relationship to prior work?"
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

    if (currentContext.confusionHighlights > 0) {
      suggestions.push("Identify which highlighted passage has the weakest connection between its claim and its supporting evidence")
    }

    if (currentContext.annotations > 0) {
      suggestions.push("Compare annotations: where do your interpretations diverge, and what does that divergence reveal about the argument's ambiguity?")
    }

    if (currentContext.stuckMarkers > 1) {
      suggestions.push("What is the shared confusion point — is it the notation, the mechanism, the evidence standard, or the framing?")
    }

    if (currentContext.timeSpent > 300000) { // 5 minutes
      suggestions.push("Reconstruct the argument from memory: what have you each retained, and where do the reconstructions differ?")
    }

    if (suggestions.length === 0) {
      suggestions.push("What is the single most contestable claim in this section, and what would falsify it?")
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

  // ============================================================================
  // STRUCTURED DEBATE (A3-facilitated — new in deep collaboration build)
  // ============================================================================

  /**
   * Trigger a structured debate session from a divergence signal.
   * Generates a paper-grounded debate prompt and returns a debateId.
   * Logs the activation as an intervention event.
   *
   * @param divergenceSignal - the passage and competing interpretations
   * @param sectionText - C_s context for grounding the prompt
   * @param participants - userId/userName pairs in the session
   * @returns debateId (string) and debate prompt (string)
   */
  async triggerStructuredDebate(
    divergenceSignal: {
      sharedPassage: string
      localReason: string
      peerReason: string
      localUserName: string
      peerUserName: string
      sectionId: string
    },
    sectionText: string,
    participants: Array<{ userId: string; userName: string }>
  ): Promise<{ debateId: string; prompt: string; groundingQuote: string }> {
    const debateId = `debate-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    // Generate grounded debate prompt via annotation-divergence API
    try {
      const res = await fetch('/api/annotation-divergence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage: divergenceSignal.sharedPassage,
          userAName: divergenceSignal.localUserName,
          userAReason: divergenceSignal.localReason,
          userBName: divergenceSignal.peerUserName,
          userBReason: divergenceSignal.peerReason,
          sectionText: sectionText.slice(0, 4000),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const prompt = data.discussionPrompt || this._fallbackDebatePrompt(divergenceSignal)
        const groundingQuote = data.groundingQuote || divergenceSignal.sharedPassage.slice(0, 120)

        console.log(`🤖 [A3] Structured debate triggered: ${debateId}`)
        this.emitEvent('debate-triggered', { debateId, prompt, groundingQuote, sectionId: divergenceSignal.sectionId, participants })

        return { debateId, prompt, groundingQuote }
      }
    } catch (err) {
      console.warn('[A3] triggerStructuredDebate API call failed:', err)
    }

    // Fallback prompt when API fails
    const prompt = this._fallbackDebatePrompt(divergenceSignal)
    return { debateId, prompt, groundingQuote: divergenceSignal.sharedPassage.slice(0, 120) }
  }

  private _fallbackDebatePrompt(sig: {
    sharedPassage: string; localReason: string; peerReason: string;
    localUserName: string; peerUserName: string
  }): string {
    return `${sig.localUserName} flagged this passage as "${sig.localReason}" while ${sig.peerUserName} marked it as "${sig.peerReason}". What does the divergence reveal — is this an ambiguity in the text, a difference in reading frame, or a substantive disagreement about what the authors are claiming?`
  }

  /**
   * Record the outcome of a structured debate into the agent's state.
   * Called when synthesis is locked (sent to Collective Knowledge Base).
   */
  recordDebateOutcome(
    debateId: string,
    outcome: {
      convergenceState: 'converging' | 'diverging' | 'stable-tension' | 'resolved'
      collectiveKnowledgeEntry: string
      sectionId: string
      participantCount: number
    }
  ): void {
    console.log(`🤖 [A3] Debate outcome recorded: ${debateId} → ${outcome.convergenceState}`)
    this.emitEvent('debate-outcome-recorded', { debateId, ...outcome })

    // Track in conversation history as a synthetic message
    const history = this.conversationHistory.get(debateId) || []
    history.push({
      type: 'debate-synthesis',
      convergenceState: outcome.convergenceState,
      collectiveKnowledgeEntry: outcome.collectiveKnowledgeEntry,
      timestamp: Date.now(),
    })
    this.conversationHistory.set(debateId, history)
  }
}

// Export singleton instance
export const agent3_discussionFacilitator = new Agent3_DiscussionFacilitator()

// Export types
export type { Agent3_DiscussionFacilitator }