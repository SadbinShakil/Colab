'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Users, 
  Lightbulb, 
  AlertTriangle, 
  MessageSquare, 
  BookOpen, 
  Clock,
  ThumbsUp,
  Reply,
  X,
  Eye,
  Brain,
  Target,
  HelpCircle,
  CheckCircle,
  Star
} from 'lucide-react'
import { CollaborativeSummary, ReadingInsight } from '@/lib/collaborativeInsights'

interface CollaborativeInsightsModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  summary: CollaborativeSummary
  onShowInsights?: () => void
}

export default function CollaborativeInsightsModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  summary,
  onShowInsights
}: CollaborativeInsightsModalProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'insights' | 'confusions' | 'readers'>('overview')

  if (!isOpen) return null

  const getInsightIcon = (type: ReadingInsight['type']) => {
    switch (type) {
      case 'insight': return <Lightbulb className="w-4 h-4 text-yellow-600" />
      case 'confusion': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'question': return <HelpCircle className="w-4 h-4 text-blue-600" />
      case 'understanding': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'annotation': return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'highlight': return <BookOpen className="w-4 h-4 text-orange-600" />
      default: return <Star className="w-4 h-4 text-gray-600" />
    }
  }

  const getInsightColor = (type: ReadingInsight['type']) => {
    switch (type) {
      case 'insight': return 'bg-yellow-50 border-yellow-200'
      case 'confusion': return 'bg-red-50 border-red-200'
      case 'question': return 'bg-blue-50 border-blue-200'
      case 'understanding': return 'bg-green-50 border-green-200'
      case 'annotation': return 'bg-purple-50 border-purple-200'
      case 'highlight': return 'bg-orange-50 border-orange-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Collaborative Reading Insights</h2>
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

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'overview'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('insights')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'insights'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Key Insights</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('confusions')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'confusions'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Common Confusions</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('readers')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'readers'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Readers</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-900">{summary.totalReaders}</p>
                        <p className="text-sm text-blue-700">Researchers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Lightbulb className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-900">{summary.totalInsights}</p>
                        <p className="text-sm text-green-700">Insights</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-purple-900">{Math.round(summary.readingTime / 60)}</p>
                        <p className="text-sm text-purple-700">Minutes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Star className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold text-orange-900">{summary.topInsights.length}</p>
                        <p className="text-sm text-orange-700">Top Insights</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span>Research Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Insights from Researchers:</h4>
                    <div className="space-y-2">
                      {summary.keyInsights.slice(0, 3).map((insight, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Common Confusions:</h4>
                    <div className="space-y-2">
                      {summary.commonConfusions.slice(0, 2).map((confusion, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{confusion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'insights' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Insights from Researchers</h3>
              {summary.topInsights.map((insight, index) => (
                <Card key={insight.id} className={getInsightColor(insight.type)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 mb-2">{insight.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{insight.userName}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <ThumbsUp className="w-3 h-3" />
                              <span>{insight.likes} likes</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Reply className="w-3 h-3" />
                              <span>{insight.replies.length} replies</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {insight.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedTab === 'confusions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Confusions & Questions</h3>
              {summary.commonConfusions.map((confusion, index) => (
                <Card key={index} className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-800">{confusion}</p>
                        <p className="text-xs text-gray-600 mt-2">Multiple researchers found this confusing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedTab === 'readers' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Community</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {summary.totalReaders} Researchers
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      have read and shared insights about this paper
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Lightbulb className="w-4 h-4" />
                        <span>{summary.totalInsights} insights shared</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{Math.round(summary.readingTime / 60)} min total reading time</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Last updated: {new Date(summary.lastUpdated).toLocaleDateString()}
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Ignore
              </Button>
              <Button
                onClick={onShowInsights}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                View All Insights
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
