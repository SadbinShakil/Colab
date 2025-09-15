'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { 
  MessageSquare, 
  BookOpen, 
  Lightbulb, 
  AlertTriangle, 
  ThumbsUp, 
  Reply,
  Bot,
  User,
  Users,
  Clock,
  Eye,
  Star,
  Zap
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'annotation' | 'insight' | 'stuck' | 'ai_response' | 'reading' | 'like'
  user: string
  userRole: string
  action: string
  target: string
  timestamp: Date
  details?: string
  page?: number
  isAI?: boolean
}

interface LiveActivityFeedProps {
  documentId: string
  isVisible: boolean
}

export default function LiveActivityFeed({ documentId, isVisible }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLive, setIsLive] = useState(true)

  // Hard-coded demo activities for video demonstration - more realistic and diverse
  const demoActivities: ActivityItem[] = [
    {
      id: 'activity-1',
      type: 'reading',
      user: 'Anonymous User',
      userRole: 'Graduate Student',
      action: 'is currently reading',
      target: 'Section 3.2 - Multi-Head Attention',
      timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
      page: 5,
      details: 'Trying to understand the attention mechanism...'
    },
    {
      id: 'activity-2',
      type: 'insight',
      user: 'Alex M.',
      userRole: 'Undergraduate',
      action: 'shared a question about',
      target: 'why 8 attention heads?',
      timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
      page: 4,
      details: 'Why not 4 or 16 heads? Is there a specific reason for 8?'
    },
    {
      id: 'activity-3',
      type: 'ai_response',
      user: 'AI Assistant',
      userRole: 'AI',
      action: 'politely corrected',
      target: 'a misconception about attention',
      timestamp: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
      page: 3,
      details: 'Actually, the number of heads is empirically determined. 8 heads work well for most tasks, but it can vary based on the specific application and dataset size.',
      isAI: true
    },
    {
      id: 'activity-4',
      type: 'stuck',
      user: 'Anonymous User',
      userRole: 'PhD Student',
      action: 'is confused about',
      target: 'positional encoding',
      timestamp: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      page: 6,
      details: 'The sin/cos formula seems arbitrary. Can someone explain the intuition?'
    },
    {
      id: 'activity-5',
      type: 'like',
      user: 'Sarah K.',
      userRole: 'Master\'s Student',
      action: 'found helpful',
      target: 'an explanation by Anonymous User',
      timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
      page: 5,
      details: 'This really helped clarify the concept!'
    },
    {
      id: 'activity-6',
      type: 'annotation',
      user: 'Dr. Chen',
      userRole: 'Professor',
      action: 'highlighted and added context to',
      target: 'the transformer architecture',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      page: 3,
      details: 'This architecture revolutionized NLP. Before this, we were stuck with RNNs that couldn\'t handle long sequences well.'
    },
    {
      id: 'activity-7',
      type: 'ai_response',
      user: 'AI Assistant',
      userRole: 'AI',
      action: 'suggested further reading on',
      target: 'attention mechanisms',
      timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
      page: 2,
      details: 'For those interested in diving deeper, I recommend "Attention Is All You Need" (this paper) and "The Annotated Transformer" for implementation details.',
      isAI: true
    },
    {
      id: 'activity-8',
      type: 'reading',
      user: 'Anonymous User',
      userRole: 'Researcher',
      action: 'is skimming through',
      target: 'the experimental results',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      page: 8,
      details: 'Looking for the BLEU scores and training time comparisons'
    },
    {
      id: 'activity-9',
      type: 'insight',
      user: 'Mike R.',
      userRole: 'Industry Researcher',
      action: 'shared a practical insight about',
      target: 'implementing transformers',
      timestamp: new Date(Date.now() - 18 * 60 * 1000), // 18 minutes ago
      page: 4,
      details: 'In practice, the residual connections are crucial. Without them, the model barely trains. Learned this the hard way!'
    },
    {
      id: 'activity-10',
      type: 'ai_response',
      user: 'AI Assistant',
      userRole: 'AI',
      action: 'gently corrected',
      target: 'a technical detail',
      timestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      page: 5,
      details: 'Just to clarify: the attention mechanism doesn\'t replace recurrence entirely - it replaces the need for sequential processing. The model can still learn sequential patterns, just more efficiently.',
      isAI: true
    },
    {
      id: 'activity-11',
      type: 'annotation',
      user: 'Anonymous User',
      userRole: 'Graduate Student',
      action: 'asked a follow-up question about',
      target: 'the computational complexity',
      timestamp: new Date(Date.now() - 22 * 60 * 1000), // 22 minutes ago
      page: 7,
      details: 'How does this compare to LSTM in terms of computational cost? The paper mentions it\'s more efficient but I\'m not seeing the numbers clearly.'
    },
    {
      id: 'activity-12',
      type: 'like',
      user: 'Emma L.',
      userRole: 'PhD Student',
      action: 'appreciated',
      target: 'the AI\'s explanation',
      timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      page: 3,
      details: 'Thanks AI! That really helped connect the dots for me.'
    },
    {
      id: 'activity-13',
      type: 'reading',
      user: 'Anonymous User',
      userRole: 'Undergraduate',
      action: 'is struggling with',
      target: 'the mathematical notation',
      timestamp: new Date(Date.now() - 28 * 60 * 1000), // 28 minutes ago
      page: 4,
      details: 'The attention formula is confusing. Can someone explain it in simpler terms?'
    },
    {
      id: 'activity-14',
      type: 'insight',
      user: 'Dr. Patel',
      userRole: 'Postdoc',
      action: 'shared a research perspective on',
      target: 'the paper\'s impact',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      page: 1,
      details: 'This paper literally changed the field. Every major model since 2017 uses some form of attention mechanism. It\'s incredible how one paper can reshape an entire research area.'
    },
    {
      id: 'activity-15',
      type: 'ai_response',
      user: 'AI Assistant',
      userRole: 'AI',
      action: 'encouraged discussion about',
      target: 'different perspectives',
      timestamp: new Date(Date.now() - 32 * 60 * 1000), // 32 minutes ago
      page: 2,
      details: 'Great question! Different researchers might have different interpretations. What do others think about the scalability claims in this section?',
      isAI: true
    }
  ]

  useEffect(() => {
    if (!isVisible) return

    // Initialize with demo activities
    setActivities(demoActivities)

    // Simulate live updates
    const interval = setInterval(() => {
      if (isLive) {
        const newActivity = generateRandomActivity()
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep only 10 most recent
      }
    }, 30000) // Add new activity every 30 seconds

    return () => clearInterval(interval)
  }, [isVisible, isLive])

  const generateRandomActivity = (): ActivityItem => {
    const activityTypes = ['reading', 'insight', 'annotation', 'like', 'stuck', 'ai_response'] as const
    const users = [
      { name: 'Anonymous User', role: 'Graduate Student' },
      { name: 'Alex M.', role: 'Undergraduate' },
      { name: 'Sarah K.', role: 'Master\'s Student' },
      { name: 'Mike R.', role: 'Industry Researcher' },
      { name: 'Emma L.', role: 'PhD Student' },
      { name: 'Dr. Chen', role: 'Professor' },
      { name: 'Dr. Patel', role: 'Postdoc' },
      { name: 'Anonymous User', role: 'Researcher' },
      { name: 'Anonymous User', role: 'Undergraduate' },
      { name: 'AI Assistant', role: 'AI', isAI: true }
    ]
    
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)]
    
    return {
      id: `activity-${Date.now()}`,
      type: randomType,
      user: randomUser.name,
      userRole: randomUser.role,
      action: getActionForType(randomType),
      target: getRandomTarget(),
      timestamp: new Date(),
      page: Math.floor(Math.random() * 10) + 1,
      details: getRandomDetails(randomType),
      isAI: randomUser.isAI
    }
  }

  const getActionForType = (type: string): string => {
    switch (type) {
      case 'reading': 
        const readingActions = ['is currently reading', 'is skimming through', 'is struggling with', 'is reviewing', 'is studying']
        return readingActions[Math.floor(Math.random() * readingActions.length)]
      case 'insight': 
        const insightActions = ['shared a question about', 'shared an insight about', 'shared a practical tip about', 'asked about', 'wondered about']
        return insightActions[Math.floor(Math.random() * insightActions.length)]
      case 'annotation': 
        const annotationActions = ['highlighted and commented on', 'asked a follow-up question about', 'added context to', 'questioned', 'discussed']
        return annotationActions[Math.floor(Math.random() * annotationActions.length)]
      case 'like': 
        const likeActions = ['liked', 'found helpful', 'appreciated', 'agreed with', 'upvoted']
        return likeActions[Math.floor(Math.random() * likeActions.length)]
      case 'stuck': 
        const stuckActions = ['is confused about', 'needs help with', 'is stuck on', 'is struggling with', 'doesn\'t understand']
        return stuckActions[Math.floor(Math.random() * stuckActions.length)]
      case 'ai_response': 
        const aiActions = ['politely corrected', 'gently corrected', 'provided clarification on', 'suggested further reading on', 'encouraged discussion about', 'explained', 'helped clarify']
        return aiActions[Math.floor(Math.random() * aiActions.length)]
      default: return 'is working on'
    }
  }

  const getRandomTarget = (): string => {
    const targets = [
      'multi-head attention mechanism',
      'positional encoding',
      'residual connections',
      'layer normalization',
      'scaled dot-product attention',
      'encoder-decoder architecture',
      'experimental results',
      'attention visualization'
    ]
    return targets[Math.floor(Math.random() * targets.length)]
  }

  const getRandomDetails = (type: string): string => {
    const details = {
      reading: [
        'Trying to understand the technical details...',
        'This is getting complex, need to read more carefully',
        'Looking for the key insights here',
        'The math is challenging but interesting',
        'Need to take notes on this section'
      ],
      insight: [
        'This is a really interesting point!',
        'I had the same question when I first read this',
        'In my experience, this works differently...',
        'Great observation! This connects to what I learned in...',
        'I think there might be a simpler way to explain this'
      ],
      annotation: [
        'Can someone explain this part more clearly?',
        'This is confusing - what does this formula mean?',
        'I disagree with this interpretation because...',
        'This reminds me of a similar concept in...',
        'The authors should have explained this better'
      ],
      like: [
        'This really helped clarify things!',
        'Exactly what I was thinking!',
        'Thanks for the explanation!',
        'This makes so much more sense now',
        'Great insight!'
      ],
      stuck: [
        'I\'m completely lost on this part',
        'Can someone break this down for me?',
        'The notation is confusing me',
        'I understand the concept but not the implementation',
        'This seems contradictory to what I learned before'
      ],
      ai_response: [
        'Let me help clarify this concept...',
        'That\'s a great question! Here\'s what I think...',
        'Actually, there might be a slight misunderstanding here...',
        'I\'d suggest looking at this from a different angle...',
        'This is a common point of confusion. Let me explain...'
      ]
    }
    
    const typeDetails = details[type as keyof typeof details] || ['Working on understanding this concept']
    return typeDetails[Math.floor(Math.random() * typeDetails.length)]
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reading': return <Eye className="w-4 h-4 text-blue-600" />
      case 'insight': return <Lightbulb className="w-4 h-4 text-yellow-600" />
      case 'annotation': return <MessageSquare className="w-4 h-4 text-green-600" />
      case 'stuck': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'ai_response': return <Bot className="w-4 h-4 text-purple-600" />
      case 'like': return <ThumbsUp className="w-4 h-4 text-pink-600" />
      default: return <BookOpen className="w-4 h-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'reading': return 'bg-blue-50 border-blue-200'
      case 'insight': return 'bg-yellow-50 border-yellow-200'
      case 'annotation': return 'bg-green-50 border-green-200'
      case 'stuck': return 'bg-red-50 border-red-200'
      case 'ai_response': return 'bg-purple-50 border-purple-200'
      case 'like': return 'bg-pink-50 border-pink-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  if (!isVisible) return null

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Zap className="w-6 h-6 text-orange-600" />
            <span>Live Activity</span>
          </h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-600">
                {isLive ? 'Live Updates' : 'Paused'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className="text-xs"
            >
              {isLive ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>
        <p className="text-gray-600">
          Real-time collaboration and research activity on this document
        </p>
      </div>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`p-3 rounded-lg border ${getActivityColor(activity.type)} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {activity.isAI ? (
                  <Bot className="w-4 h-4 text-purple-600" />
                ) : (
                  getActivityIcon(activity.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">
                    {activity.user}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {activity.userRole}
                  </Badge>
                  {activity.page && (
                    <Badge variant="secondary" className="text-xs">
                      Page {activity.page}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-800 mb-1">
                  <span className="font-medium">{activity.action}</span>{' '}
                  <span className="text-blue-600 font-medium">{activity.target}</span>
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-600 mb-2">
                    {activity.details}
                  </p>
                )}
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                  {activity.isAI && (
                    <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                      AI
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No recent activity</p>
            <p className="text-sm">Collaborative insights will appear here as researchers work on the document</p>
          </div>
        )}
      </div>
    </div>
  )
}
