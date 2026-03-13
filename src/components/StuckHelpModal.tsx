'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Clock,
  ThumbsUp,
  Reply,
  X,
  Brain,
  HelpCircle,
  CheckCircle,
  Star,
  User,
  Tag,
  Send,
  Bot,
  Users,
  Lightbulb,
  ExternalLink
} from 'lucide-react'

interface StuckHelp {
  id: string
  paperId: string
  userId: string
  userName: string
  section: string
  description: string
  page: number
  position: { x: number; y: number; width: number; height: number }
  isResolved: boolean
  isAnonymous: boolean
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'EXPERT_NEEDED'
  createdAt: string
  updatedAt: string
  responses?: StuckHelpResponse[]
}

interface StuckHelpResponse {
  id: string
  stuckHelpId: string
  userId: string
  userName: string
  content: string
  type: 'human' | 'ai'
  isHelpful: boolean
  likes: number
  createdAt: string
}

interface StuckHelpModalProps {
  isOpen: boolean
  onClose: () => void
  stuckHelp: StuckHelp | null
  documentId: string
  documentTitle: string
  onResponseSubmit: (response: string, type: 'human' | 'ai') => Promise<void>
  onMarkResolved: (stuckHelpId: string) => Promise<void>
  onNavigateToPage?: (pageNumber: number, position?: { x: number; y: number }) => void
}

export default function StuckHelpModal({
  isOpen,
  onClose,
  stuckHelp,
  documentId,
  documentTitle,
  onResponseSubmit,
  onMarkResolved,
  onNavigateToPage
}: StuckHelpModalProps) {
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAIResponse, setShowAIResponse] = useState(false)
  const [aiResponse, setAiResponse] = useState('')

  // Hard-coded collaborative responses for video demonstration - more realistic and diverse
  const demoResponses: StuckHelpResponse[] = [
    {
      id: 'response-1',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'user-1',
      userName: 'Anonymous User',
      content: "I had the same confusion when I first read this paper! The key insight is that the multi-head attention allows the model to focus on different types of relationships simultaneously. Think of it like having 8 different 'experts' each looking at the same text but paying attention to different aspects - some focus on syntax, others on semantics, etc.",
      type: 'human',
      isHelpful: true,
      likes: 12,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'response-2',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'ai-assistant',
      userName: 'AI Assistant',
      content: "Great question! Let me break down the multi-head attention mechanism step by step:\n\n1. **Single Head**: Each attention head computes attention weights between all positions\n2. **Multiple Heads**: 8 parallel heads each learn different attention patterns\n3. **Concatenation**: All head outputs are combined and projected\n4. **Why 8 heads?**: Empirically found to work well - allows specialization\n\nThink of it as having 8 different 'perspectives' on the same input, each learning to focus on different types of relationships (local vs global, syntactic vs semantic, etc.).",
      type: 'ai',
      isHelpful: true,
      likes: 18,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    {
      id: 'response-3',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'user-2',
      userName: 'Alex M.',
      content: "Actually, I think there might be a small error in the previous explanation. The parallelizability is great, but it's not just about speed - it's about learning different types of patterns. Each head can specialize in different linguistic phenomena. I learned this in my NLP course last semester.",
      type: 'human',
      isHelpful: true,
      likes: 5,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 minutes ago
    },
    {
      id: 'response-4',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'ai-assistant',
      userName: 'AI Assistant',
      content: "Alex makes a good point! I should clarify: while parallelizability is important, the main benefit is indeed the specialization. Each head learns to focus on different linguistic patterns. However, I'd add that the computational efficiency (O(n²) vs O(n) for RNNs) is also significant for longer sequences. Thanks for the correction!",
      type: 'ai',
      isHelpful: true,
      likes: 22,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    },
    {
      id: 'response-5',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'user-3',
      userName: 'Sarah K.',
      content: "If you're still confused, I recommend looking at the attention visualization in Figure 2. It shows how different heads learn to focus on different linguistic phenomena. Head 1 might learn subject-verb relationships, while Head 3 focuses on pronoun resolution. This is what makes the model so powerful!",
      type: 'human',
      isHelpful: true,
      likes: 15,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 minutes ago
    },
    {
      id: 'response-6',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'user-4',
      userName: 'Anonymous User',
      content: "I'm still confused about the math. Can someone explain the attention formula in simpler terms? The Q, K, V matrices are confusing me.",
      type: 'human',
      isHelpful: false,
      likes: 2,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
    },
    {
      id: 'response-7',
      stuckHelpId: stuckHelp?.id || '',
      userId: 'ai-assistant',
      userName: 'AI Assistant',
      content: "Great question! Let me explain Q, K, V in simple terms:\n\n- **Q (Query)**: \"What am I looking for?\" - represents the current position\n- **K (Key)**: \"What information is available?\" - represents all positions\n- **V (Value)**: \"What's the actual content?\" - the information to retrieve\n\nThe attention mechanism asks: \"For this query, which keys are most relevant, and what values should I pay attention to?\" It's like a smart search through the input sequence!",
      type: 'ai',
      isHelpful: true,
      likes: 25,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    }
  ]

  useEffect(() => {
    if (isOpen) {
      setResponseText('')
      setShowAIResponse(false)
      setAiResponse('')
    }
  }, [isOpen, stuckHelp])

  if (!isOpen || !stuckHelp) return null

  const getStatusColor = (status: StuckHelp['status']) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 border-red-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200'
      case 'EXPERT_NEEDED': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: StuckHelp['status']) => {
    switch (status) {
      case 'OPEN': return <AlertTriangle className="w-4 h-4" />
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />
      case 'EXPERT_NEEDED': return <Users className="w-4 h-4" />
      default: return <HelpCircle className="w-4 h-4" />
    }
  }

  const handleSubmitResponse = async (type: 'human' | 'ai') => {
    if (!responseText.trim()) return

    setIsSubmitting(true)
    try {
      await onResponseSubmit(responseText, type)
      setResponseText('')
      setShowAIResponse(false)
      setAiResponse('')
    } catch (error) {
      console.error('Failed to submit response:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!stuckHelp) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ai/stuck-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stuckHelpId: stuckHelp.id,
          description: stuckHelp.description,
          section: stuckHelp.section,
          documentTitle,
          page: stuckHelp.page
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiResponse(data.response)
        setShowAIResponse(true)
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">I'm Stuck Here</h2>
              <p className="text-sm text-gray-600">{documentTitle} - Page {stuckHelp.page}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(stuckHelp.status)}>
              {getStatusIcon(stuckHelp.status)}
              <span className="ml-1">{stuckHelp.status.replace('_', ' ')}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Stuck Help Details */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="font-semibold text-gray-900">
                        {stuckHelp.isAnonymous ? 'Anonymous Researcher' : stuckHelp.userName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stuckHelp.section}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 flex items-center space-x-1">
                          <BookOpen className="w-3 h-3" />
                          <span>Page {stuckHelp.page}</span>
                        </span>
                        {onNavigateToPage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateToPage(stuckHelp.page, stuckHelp.position)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-6"
                            title="Go to this page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800 leading-relaxed mb-4">{stuckHelp.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(stuckHelp.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{stuckHelp.responses?.length || 0} responses</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Response Section */}
            {showAIResponse && aiResponse && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span>AI Assistant Response</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-800 leading-relaxed mb-4">{aiResponse}</p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmitResponse('ai')}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Use This Response
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAIResponse(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Responses */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Community Responses</h3>
              {(stuckHelp.responses && stuckHelp.responses.length > 0 ? stuckHelp.responses : demoResponses).map((response) => (
                <Card key={response.id} className={response.type === 'ai' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {response.type === 'ai' ? (
                        <Bot className="w-5 h-5 text-blue-600 mt-1" />
                      ) : (
                        <User className="w-5 h-5 text-gray-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {response.type === 'ai' ? 'AI Assistant' : response.userName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {response.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed mb-3">{response.content}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{response.likes} helpful</span>
                          </span>
                          {response.isHelpful && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Marked as helpful
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Response Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Help This Researcher</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Share your explanation, insights, or suggestions to help resolve this confusion..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleSubmitResponse('human')}
                      disabled={!responseText.trim() || isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Submit Response
                    </Button>
                    <Button
                      onClick={handleAIGenerate}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      Get AI Help
                    </Button>
                  </div>
                  {!stuckHelp.isResolved && (
                    <Button
                      onClick={() => onMarkResolved(stuckHelp.id)}
                      variant="outline"
                      className="border-green-300 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Help the research community by sharing your knowledge and insights
            </p>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-red-600 to-orange-600 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
