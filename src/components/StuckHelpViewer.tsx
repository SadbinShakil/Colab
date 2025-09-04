'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock,
  ThumbsUp,
  X,
  Brain,
  HelpCircle,
  CheckCircle,
  User,
  Send,
  Bot
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

interface StuckHelpViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
}

export default function StuckHelpViewer({
  isOpen,
  onClose,
  documentId,
  documentTitle
}: StuckHelpViewerProps) {
  const [stuckHelps, setStuckHelps] = useState<StuckHelp[]>([])
  const [loading, setLoading] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadStuckHelps()
    }
  }, [isOpen, documentId])

  const loadStuckHelps = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stuck-help?documentId=${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setStuckHelps(data.stuckHelps || [])
      }
    } catch (error) {
      console.error('Failed to load stuck helps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResponse = async (stuckHelpId: string, type: 'human' | 'ai') => {
    if (!responseText.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/stuck-help/${stuckHelpId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'anonymous', // Anonymous response
          content: responseText,
          type
        })
      })

      if (res.ok) {
        setResponseText('')
        setRespondingTo(null)
        loadStuckHelps() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to submit response:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIGenerate = async (stuckHelp: StuckHelp) => {
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
        setResponseText(data.response)
        setRespondingTo(stuckHelp.id)
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: StuckHelp['status']) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 border-red-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200'
      case 'EXPERT_NEEDED': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Help Requests</h2>
              <p className="text-sm text-gray-600">{documentTitle}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : stuckHelps.length === 0 ? (
            <div className="text-center p-8">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No help requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stuckHelps.map((stuckHelp) => (
                <Card key={stuckHelp.id} className="bg-red-50 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-semibold text-gray-900">
                              {stuckHelp.isAnonymous ? 'Anonymous Researcher' : stuckHelp.userName}
                            </span>
                            <Badge className={getStatusColor(stuckHelp.status)}>
                              {stuckHelp.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Page {stuckHelp.page} • {stuckHelp.section}
                            </span>
                          </div>
                          <p className="text-gray-800 leading-relaxed mb-3">{stuckHelp.description}</p>
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
                    </div>

                    {/* Responses */}
                    {stuckHelp.responses && stuckHelp.responses.length > 0 && (
                      <div className="ml-8 border-l-2 border-gray-200 pl-4 space-y-3 mb-4">
                        {stuckHelp.responses.map((response) => (
                          <div key={response.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                              {response.type === 'ai' ? (
                                <Bot className="w-4 h-4 text-blue-600" />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="font-medium text-sm text-gray-900">
                                {response.type === 'ai' ? 'AI Assistant' : 'Anonymous Helper'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(response.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{response.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Response Input */}
                    <div className="ml-8 space-y-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleAIGenerate(stuckHelp)}
                          disabled={isSubmitting}
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Brain className="w-4 h-4 mr-1" />
                          Get AI Help
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setRespondingTo(respondingTo === stuckHelp.id ? null : stuckHelp.id)}
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Respond
                        </Button>
                      </div>
                      
                      {respondingTo === stuckHelp.id && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Share your explanation or help..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitResponse(stuckHelp.id, 'human')}
                              disabled={!responseText.trim() || isSubmitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Submit Response
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRespondingTo(null)
                                setResponseText('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {stuckHelps.length} help request{stuckHelps.length !== 1 ? 's' : ''} found
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
