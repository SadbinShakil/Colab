'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { 
  Lightbulb, 
  AlertTriangle, 
  MessageSquare, 
  BookOpen, 
  HelpCircle,
  CheckCircle,
  Star,
  X,
  Send,
  Tag
} from 'lucide-react'
import { ReadingInsight } from '@/lib/collaborativeInsights'

interface AddInsightModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  currentUser: { name: string; id: string }
  pageNumber?: number
  position?: { x: number; y: number }
  onInsightAdded?: (insight: ReadingInsight) => void
}

const insightTypes = [
  { type: 'insight', label: 'Insight', icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { type: 'confusion', label: 'Confusion', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  { type: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { type: 'understanding', label: 'Understanding', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  { type: 'annotation', label: 'Annotation', icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { type: 'highlight', label: 'Highlight', icon: BookOpen, color: 'text-orange-600', bgColor: 'bg-orange-50' }
] as const

export default function AddInsightModal({
  isOpen,
  onClose,
  documentId,
  currentUser,
  pageNumber,
  position,
  onInsightAdded
}: AddInsightModalProps) {
  const [selectedType, setSelectedType] = useState<ReadingInsight['type']>('insight')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!content.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/collaborative-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          userId: currentUser.id,
          userName: currentUser.name,
          type: selectedType,
          content: content.trim(),
          pageNumber,
          position,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          isPublic
        }),
      })

      if (response.ok) {
        const result = await response.json()
        onInsightAdded?.(result.insight)
        onClose()
        // Reset form
        setContent('')
        setTags('')
        setSelectedType('insight')
        setIsPublic(true)
      } else {
        console.error('Failed to add insight')
      }
    } catch (error) {
      console.error('Error adding insight:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTypeConfig = insightTypes.find(t => t.type === selectedType)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Reading Insight</h2>
              <p className="text-sm text-gray-600">Share your thoughts with other researchers</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Insight Type Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Type of Insight</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {insightTypes.map((typeConfig) => (
                <button
                  key={typeConfig.type}
                  onClick={() => setSelectedType(typeConfig.type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === typeConfig.type
                      ? `${typeConfig.bgColor} border-purple-500`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <typeConfig.icon className={`h-6 w-6 ${typeConfig.color}`} />
                    <span className="text-sm font-medium text-gray-700">{typeConfig.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Insight
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share your ${selectedType} about this research...`}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {content.length}/500 characters
              </span>
              {selectedTypeConfig && (
                <div className="flex items-center space-x-2">
                  <selectedTypeConfig.icon className={`h-4 w-4 ${selectedTypeConfig.color}`} />
                  <span className="text-xs text-gray-600">{selectedTypeConfig.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (optional)
            </label>
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="methodology, statistics, limitations..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Separate tags with commas
            </p>
          </div>

          {/* Page Number */}
          {pageNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Number
              </label>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Page {pageNumber}</span>
              </div>
            </div>
          )}

          {/* Privacy Setting */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                Make this insight public for other researchers
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Adding as:</span>
              <Badge variant="outline">{currentUser.name}</Badge>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Add Insight
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
