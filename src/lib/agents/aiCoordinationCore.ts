// lib/agents/aiCoordinationCore.ts
'use client'

import { agent1_understandingDetection } from './Agent1_UnderstandingDetection'
import { agent2_collaborationOrchestrator } from './Agent2_CollaborationOrchestrator'
import { agent3_discussionFacilitator } from './Agent3_DiscussionFacilitator'
import { agent4_annotationsAnalysis } from './Agent4_AnnotationsAnalysis'
import { agent5_storyboardCurator } from './Agent5_StoryboardCurator'
import { agent6_contentComprehension } from './Agent6_ContentComprehension'
import { agent7_implicitAssistance } from './Agent7_ImplicitAssistance'
import { interactionCollector } from '../interactionCollector'
import { interactionAnalyzer } from '../interactionAnalyzer'


/**
 * AI COORDINATION CORE
 * 
 * Central orchestrator that:
 * - Routes data to appropriate agents
 * - Activates agents based on events
 * - Prevents conflicts between agents
 * - Provides unified interface for querying system state
 * 
 * This is the "brain" that coordinates the multi-agent system
 */

export interface SystemState {
  activeAgents: string[]
  currentActivity: string
  strugglingNow: boolean
  recentBreakthrough: boolean
  pendingNotifications: number
  sessionActive: boolean
}

export interface AgentActivity {
  agentId: string
  agentName: string
  lastActivity: string
  timestamp: number
  status: 'active' | 'idle' | 'processing'
}

class AICoordinationCoreService {
  private coreId = 'ai-coordination-core'
  private isInitialized = false
  private eventLog: Array<{ event: string; timestamp: number; agent: string }> = []

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize() {
    if (this.isInitialized) return

    console.log('🧠 [AI Coordination Core] Initializing multi-agent system')

    // Activate always-on agents
    agent1_understandingDetection.activate()
    agent5_storyboardCurator.activate()

    // Activate event-based agents
    agent2_collaborationOrchestrator.activate()
    agent3_discussionFacilitator.activate()
    agent4_annotationsAnalysis.activate()
    agent6_contentComprehension.activate()
    agent7_implicitAssistance.activate()

    this.isInitialized = true
    console.log('✅ [AI Coordination Core] System initialized')

    this.logEvent('system-initialized', 'core')
  }

  shutdown() {
    console.log('🧠 [AI Coordination Core] Shutting down')

    agent1_understandingDetection.deactivate()
    agent2_collaborationOrchestrator.deactivate()
    agent3_discussionFacilitator.deactivate()
    agent4_annotationsAnalysis.deactivate()
    agent5_storyboardCurator.deactivate()
    agent6_contentComprehension.deactivate()
    agent7_implicitAssistance.deactivate()

    this.isInitialized = false
    console.log('✅ [AI Coordination Core] System shut down')
  }

  // ============================================================================
  // EVENT ROUTING
  // ============================================================================

  /**
   * Routes user actions to appropriate agents
   */
  routeUserAction(action: string, data: any) {
    this.logEvent(action, 'user')

    switch (action) {
      case 'highlight-added':
        // Agent 4 analyzes new highlight
        this.activateAgent('agent4', 'analyze-highlights', data)
        break

      case 'annotation-added':
        // Agent 4 analyzes new annotation
        this.activateAgent('agent4', 'analyze-annotations', data)
        break

      case 'stuck-marker-added':
        // Agent 1 detects struggle, Agent 7 generates notification
        this.activateAgent('agent1', 'detect-struggle', data)
        this.activateAgent('agent7', 'generate-assistance', data)
        break

      case 'page-changed':
        // Agent 1 monitors understanding
        this.activateAgent('agent1', 'monitor-understanding', data)
        break

      case 'analysis-requested':
        // Activate all agents for comprehensive analysis
        this.runComprehensiveAnalysis()
        break
    }
  }

  /**
   * Routes agent events to other agents
   */
  routeAgentEvent(sourceAgent: string, event: string, data: any) {
    this.logEvent(event, sourceAgent)

    switch (event) {
      case 'struggle-detected':
        // Agent 1 detected struggle → Agent 7 generates notification
        const strugglingUserId = data.userId || interactionCollector.getCurrentSession()?.userId
        const strugglingUserName = data.userName
        const dataWithUserId = { ...data, userId: strugglingUserId }

        console.log(`🔍 [AI Core] Struggle detected for user ${strugglingUserId} in section ${data.sectionId}`)

        // Step 1: Notify the struggling user with basic help message
        agent7_implicitAssistance.generateNotification({
          type: 'struggle-awareness',
          title: '🧠 Complex Section Detected',
          message: `This section appears to be challenging. Would you like AI assistance to break it down?`,
          priority: data.severity === 'high' ? 'high' : 'medium',
          sectionId: data.sectionId,
          targetUserId: strugglingUserId,
          actionButton: {
            label: 'Get AI Help',
            action: 'open-ai-help'
          },
          secondaryButton: {
            label: 'Visualize',
            action: 'glow-section'
          }
        })

        // Step 1.5: Trigger IMPLICIT PULSE (no toast, just UI glow)
        if (data.severity === 'high') {
          agent7_implicitAssistance.generateNotification({
            type: 'pulse',
            title: 'Implicit Pulse',
            message: 'Visual cues activated',
            priority: 'low',
            sectionId: data.sectionId,
            targetUserId: strugglingUserId,
            actionButton: {
              label: 'Pulse',
              action: 'glow-section'
            }
          })
        }

        // Step 2: Find peers who can help
        const session = interactionCollector.getCurrentSession()
        if (session) {
          const matches = agent2_collaborationOrchestrator.findPeersForHelp(
            strugglingUserId,
            data.sectionId
          )
          console.log('🔍 [Agent 2] Peer matches found:', matches.length)

          if (matches.length > 0) {
            const match = matches[0]

            if (match.suggestedApproach === 'group') {
              // GROUP STUDY: Multiple people struggling on same section
              console.log('👥 [Group Study] Multiple users struggling')

              // Notify the current struggling user
              agent7_implicitAssistance.generateNotification({
                type: 'peer-suggestion',
                title: '👥 You\'re not alone!',
                message: 'Other students are also working on this section. Join group study?',
                priority: 'medium',
                sectionId: data.sectionId,
                targetUserId: strugglingUserId,
                actionButton: {
                  label: 'Join Group',
                  action: 'join-group'
                }
              })

              // ✅ ALSO notify the other struggling user(s)
              if (match.helper.status === 'struggling') {
                agent7_implicitAssistance.generateNotification({
                  type: 'peer-suggestion',
                  title: '👥 You\'re not alone!',
                  message: `${strugglingUserName} is also working on this section. Join group study?`,
                  priority: 'medium',
                  sectionId: data.sectionId,
                  targetUserId: match.helper.userId,
                  actionButton: {
                    label: 'Join Group',
                    action: 'join-group'
                  }
                })
              }
            } else {
              // PEER TUTORING: Helper available
              console.log('🤝 [Peer Match] Helper found:', match.helper.userName)

              // ✅ BIDIRECTIONAL NOTIFICATIONS (both users notified)

              // 1. Notify struggling user about available helper (NO SCORE!)
              agent7_implicitAssistance.generateNotification({
                type: 'peer-suggestion',
                title: `💡 ${match.helper.userName} can help`,
                message: `${match.helper.userName} already understood this section. Want to connect?`,
                priority: 'high',
                sectionId: data.sectionId,
                targetUserId: strugglingUserId,
                actionButton: {
                  label: 'Connect',
                  action: 'connect-peer'
                }
              })

              // 2. Notify helper about struggling user
              agent7_implicitAssistance.generateNotification({
                type: 'peer-suggestion',
                title: `🆘 ${strugglingUserName} is struggling`,
                message: `${strugglingUserName} is having trouble with ${data.sectionName}. Want to help?`,
                priority: 'medium',
                sectionId: data.sectionId,
                targetUserId: match.helper.userId,
                actionButton: {
                  label: 'Offer Help',
                  action: 'offer-help'
                },
                // ✅ ADD: Store struggling user info in notification for easy access
                invitationData: {
                  strugglingUserId: strugglingUserId,
                  strugglingUserName: strugglingUserName,
                  fromUserId: match.helper.userId,
                  fromUserName: match.helper.userName,
                  toUserId: strugglingUserId,
                  toUserName: strugglingUserName,
                  sectionId: data.sectionId,
                  documentId: data.documentId || ''
                }
              })
            }
          } else {
            console.log('ℹ️ [No Peers] No peers available to help')
          }
        }
        break

      case 'breakthrough-detected':
        // Agent 1 detected breakthrough → Agent 7 offers peer help
        agent7_implicitAssistance.onBreakthroughDetected(data)
        break

      case 'confusion-loop-detected':
        // Agent 1 detected loop → Agent 7 intervenes
        agent7_implicitAssistance.generateSlowZoneNotification(
          data.sectionId,
          data.sectionName,
          data.timeSpent
        )
        break
    }
  }

  // ============================================================================
  // AGENT ACTIVATION
  // ============================================================================

  private activateAgent(agentId: string, task: string, data: any) {
    console.log(`🤖 [AI Core] Activating ${agentId} for ${task}`)

    // Agents are already activated, they just process tasks
    // This method is for logging and future orchestration logic

    this.logEvent(`agent-activated:${task}`, agentId)
  }

  // ============================================================================
  // COMPREHENSIVE ANALYSIS
  // ============================================================================

  runComprehensiveAnalysis() {
    console.log('🧠 [AI Core] Running comprehensive analysis')

    const session = interactionCollector.getCurrentSession()
    if (!session) return null

    // Run all agents
    const understandingState = agent1_understandingDetection.getUnderstandingState()
    const strugglingSections = agent1_understandingDetection.getCurrentStrugglingSections()
    const breakthroughs = agent1_understandingDetection.getRecentBreakthroughs()

    const annotationAnalysis = agent4_annotationsAnalysis.analyze()

    const notifications = agent7_implicitAssistance.getActiveNotifications()
    const suggestions = agent7_implicitAssistance.generateSuggestions(
      strugglingSections,
      annotationAnalysis?.patterns || [],
      Date.now() - session.startTime
    )

    // Run main analyzer
    const mainAnalysis = interactionAnalyzer.analyzeSession(session)

    // Combine all agent outputs
    return {
      // From main analyzer
      ...mainAnalysis,

      // From Agent 1
      currentUnderstandingState: understandingState,
      activeStruggles: strugglingSections,
      recentBreakthroughs: breakthroughs,

      // From Agent 4
      annotationInsights: annotationAnalysis,

      // From Agent 7
      smartNotifications: notifications,
      implicitSuggestions: suggestions,

      // Meta info
      agentsActive: this.getActiveAgents(),
      timestamp: Date.now()
    }
  }

  // ============================================================================
  // SYSTEM STATE
  // ============================================================================

  getSystemState(): SystemState {
    const session = interactionCollector.getCurrentSession()
    const notifications = agent7_implicitAssistance.getActiveNotifications()
    const struggling = agent1_understandingDetection.isUserStruggling()
    const breakthroughs = agent1_understandingDetection.getRecentBreakthroughs()

    return {
      activeAgents: this.getActiveAgents(),
      currentActivity: this.getCurrentActivity(),
      strugglingNow: struggling,
      recentBreakthrough: breakthroughs.length > 0,
      pendingNotifications: notifications.length,
      sessionActive: session !== null
    }
  }

  getActiveAgents(): string[] {
    const agents: string[] = []

    if (agent1_understandingDetection.getStatus().active) {
      agents.push('Agent 1: Understanding Detection')
    }

    if (agent4_annotationsAnalysis.getStatus().active) {
      agents.push('Agent 4: Annotations Analysis')
    }

    if (agent7_implicitAssistance.getStatus().active) {
      agents.push('Agent 7: Implicit Assistance')
    }

    return agents
  }

  getAgentActivities(): AgentActivity[] {
    return [
      {
        agentId: 'agent-1',
        agentName: 'Understanding Detection',
        lastActivity: 'Monitoring understanding levels',
        timestamp: Date.now(),
        status: agent1_understandingDetection.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-2',
        agentName: 'Collaboration Orchestrator',
        lastActivity: 'Matching peers for collaboration',
        timestamp: Date.now(),
        status: agent2_collaborationOrchestrator.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-3',
        agentName: 'Discussion Facilitator',
        lastActivity: 'Managing conversations',
        timestamp: Date.now(),
        status: agent3_discussionFacilitator.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-4',
        agentName: 'Annotations Analysis',
        lastActivity: 'Analyzing highlight patterns',
        timestamp: Date.now(),
        status: agent4_annotationsAnalysis.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-5',
        agentName: 'Storyboard Curator',
        lastActivity: 'Logging reading journey',
        timestamp: Date.now(),
        status: agent5_storyboardCurator.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-6',
        agentName: 'Content Comprehension',
        lastActivity: 'Preparing explanations',
        timestamp: Date.now(),
        status: agent6_contentComprehension.getStatus().active ? 'active' : 'idle'
      },
      {
        agentId: 'agent-7',
        agentName: 'Implicit Assistance',
        lastActivity: 'Generating notifications',
        timestamp: Date.now(),
        status: agent7_implicitAssistance.getStatus().active ? 'active' : 'idle'
      }
    ]
  }

  private getCurrentActivity(): string {
    const session = interactionCollector.getCurrentSession()
    if (!session) return 'No active session'

    const recentEvents = this.eventLog.slice(-5)
    if (recentEvents.length === 0) return 'Monitoring'

    const lastEvent = recentEvents[recentEvents.length - 1]
    return lastEvent.event
  }

  // ============================================================================
  // CONFLICT PREVENTION
  // ============================================================================

  /**
   * Prevents multiple agents from interfering with each other
   */
  preventConflicts() {
    // Example: Don't show notifications while user is actively reading
    // Example: Don't trigger interventions too frequently

    const notifications = agent7_implicitAssistance.getActiveNotifications()

    // Limit high-priority notifications
    const highPriority = notifications.filter(n => n.priority === 'high')
    if (highPriority.length > 3) {
      console.log('⚠️ [AI Core] Too many high-priority notifications, suppressing some')
      // Could implement suppression logic here
    }
  }

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  private logEvent(event: string, agent: string) {
    this.eventLog.push({
      event,
      agent,
      timestamp: Date.now()
    })

    // Keep only last 100 events
    if (this.eventLog.length > 100) {
      this.eventLog.shift()
    }
  }

  getEventLog() {
    return [...this.eventLog]
  }

  getRecentEvents(count: number = 10) {
    return this.eventLog.slice(-count)
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Unified query interface for dashboard/UI
   */
  query(queryType: string, params?: any) {
    switch (queryType) {
      case 'system-state':
        return this.getSystemState()

      case 'active-agents':
        return this.getActiveAgents()

      case 'agent-activities':
        return this.getAgentActivities()

      case 'notifications':
        return agent7_implicitAssistance.getActiveNotifications()

      case 'struggling-sections':
        return agent1_understandingDetection.getCurrentStrugglingSections()

      case 'topics':
        return agent4_annotationsAnalysis.getTopConfusedTopics()

      case 'comprehensive-analysis':
        return this.runComprehensiveAnalysis()

      default:
        return null
    }
  }
}

// Export singleton instance
export const aiCoordinationCore = new AICoordinationCoreService()

// Export types
export type { AICoordinationCoreService }