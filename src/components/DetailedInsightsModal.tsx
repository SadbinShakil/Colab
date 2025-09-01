'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
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
  Star,
  Search,
  Filter,
  Calendar,
  User,
  Tag
} from 'lucide-react'
import { CollaborativeSummary, ReadingInsight } from '@/lib/collaborativeInsights'

interface DetailedInsightsModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  summary: CollaborativeSummary
}

export default function DetailedInsightsModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  summary
}: DetailedInsightsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'replies'>('likes')

  if (!isOpen) return null

  // Mock detailed insights data - in real app this would come from API
  const detailedInsights: ReadingInsight[] = [
    {
      id: "demo-1",
      documentId: "attention-is-all-you-need",
      userId: "user-1",
      userName: "Priya Patel",
      type: "insight",
      content: "The multi-head attention mechanism was the breakthrough here. I struggled initially with understanding why 8 heads specifically, but after implementing it, I realized each head learns different attention patterns - some focus on local dependencies, others on global relationships. This is why modern models like GPT and BERT use this architecture. The paper's approach to handling variable-length sequences without recurrence was revolutionary.",
      pageNumber: 3,
      position: { x: 100, y: 200 },
      color: "#fbbf24",
      tags: ["attention", "multi-head", "implementation", "gpt", "bert"],
      isPublic: true,
      likes: 23,
      replies: [
        { 
          id: "reply-1", 
          userId: "user-2", 
          userName: "Prof. Wei Zhang", 
          content: "Exactly! I found the same thing when I implemented it. The different attention patterns are crucial for the model's success. Have you tried visualizing the attention weights? It's fascinating to see what each head focuses on.", 
          timestamp: new Date().toISOString(),
          documentId: "attention-is-all-you-need",
          type: "insight",
          isPublic: true,
          likes: 5,
          replies: []
        }
      ],
      parentId: undefined,
      timestamp: new Date().toISOString()
    },
    {
      id: "demo-2",
      documentId: "attention-is-all-you-need",
      userId: "user-2",
      userName: "Wei Zhang",
      type: "understanding",
      content: "The residual connections and layer normalization were game-changers for training deep networks. I struggled with vanishing gradients in my early experiments with deep transformers. The paper shows that without these components, training becomes unstable beyond 6-8 layers. Now we see this pattern everywhere - in Vision Transformers, BERT, and even in newer architectures like Swin Transformers.",
      pageNumber: 4,
      position: { x: 150, y: 300 },
      color: "#10b981",
      tags: ["residual", "normalization", "training", "vision-transformers", "swin"],
      isPublic: true,
      likes: 31,
      replies: [],
      parentId: undefined,
      timestamp: new Date().toISOString()
    },
    {
      id: "demo-3",
      documentId: "attention-is-all-you-need",
      userId: "user-3",
      userName: "Alejandro Rodriguez",
      type: "highlight",
      content: "This paper fundamentally changed NLP. Before this, we were stuck with RNNs and LSTMs that couldn't handle long sequences well. The attention mechanism solved the bottleneck problem. Now we have models like GPT-4, PaLM, and LLaMA that can process entire documents at once. The paper's impact extends beyond NLP - we see attention in computer vision, speech recognition, and even protein folding (AlphaFold2).",
      pageNumber: 1,
      position: { x: 200, y: 100 },
      color: "#f97316",
      tags: ["impact", "nlp", "gpt-4", "palm", "llama", "alphafold"],
      isPublic: true,
      likes: 45,
      replies: [
        { 
          id: "reply-2", 
          userId: "user-4", 
          userName: "Dr. Sarah Thompson", 
          content: "Absolutely! The cross-attention mechanism in encoder-decoder models is now standard. Even in multimodal models like CLIP and DALL-E, attention is the core mechanism.", 
          timestamp: new Date().toISOString(),
          documentId: "attention-is-all-you-need",
          type: "insight",
          isPublic: true,
          likes: 3,
          replies: []
        },
        { 
          id: "reply-3", 
          userId: "user-5", 
          userName: "Prof. Rajesh Kumar", 
          content: "The scalability issue they mentioned is still relevant today. That's why we have sparse attention, linear attention, and other efficiency improvements.", 
          timestamp: new Date().toISOString(),
          documentId: "attention-is-all-you-need",
          type: "insight",
          isPublic: true,
          likes: 4,
          replies: []
        }
      ],
      parentId: undefined,
      timestamp: new Date().toISOString()
    },
    {
      id: "demo-4",
      documentId: "attention-is-all-you-need",
      userId: "user-4",
      userName: "Sarah Thompson",
      type: "confusion",
      content: "I struggled with the positional encoding formula for weeks! The sin/cos functions seemed arbitrary at first. After digging deeper, I learned that this encoding allows the model to learn relative positions easily because sin(a+b) and cos(a+b) can be expressed in terms of sin(a), cos(a), sin(b), cos(b). However, this approach has limitations - it doesn't generalize well to sequences longer than the training data. That's why newer models use learned positional embeddings or rotary positional embeddings (RoPE).",
      pageNumber: 5,
      position: { x: 250, y: 400 },
      color: "#ef4444",
      tags: ["positional-encoding", "confusion", "rope", "learned-embeddings"],
      isPublic: true,
      likes: 18,
      replies: [
        { id: "reply-4", userId: "user-1", userName: "Priya Patel", content: "I had the same struggle! RoPE (Rotary Position Embedding) is much better for long sequences. It's used in models like LLaMA and PaLM. The key insight is that it encodes relative positions in a way that generalizes to any sequence length.", timestamp: new Date().toISOString() }
      ],
      parentId: undefined
    },
    {
      id: "demo-5",
      documentId: "attention-is-all-you-need",
      userId: "user-5",
      userName: "Prof. Rajesh Kumar",
      type: "question",
      content: "Why exactly 8 attention heads? The paper doesn't provide much justification. Through experimentation, I found that the optimal number depends on the task and model size. For smaller models, 4-6 heads work better. For larger models like GPT-3, they use 96 heads! The key insight is that you want enough heads to capture different attention patterns, but not so many that you're wasting parameters. Current research shows that the number of heads should scale with the embedding dimension.",
      pageNumber: 6,
      position: { x: 300, y: 500 },
      color: "#3b82f6",
      tags: ["attention-heads", "hyperparameters", "gpt-3", "scaling"],
      isPublic: true,
      likes: 27,
      replies: [],
      parentId: undefined
    },
    {
      id: "demo-6",
      documentId: "attention-is-all-you-need",
      userId: "user-6",
      userName: "Dr. Fatima Al-Zahra",
      type: "annotation",
      content: "The computational complexity section is crucial. O(n²) complexity means it doesn't scale well to very long sequences. This is still a major limitation today. That's why we see research on sparse attention (Sparse Transformers), linear attention (Performer), and other efficiency improvements. For example, Flash Attention reduces memory usage from O(n²) to O(n). The paper's architecture is elegant but expensive - a trade-off we're still dealing with in 2024.",
      pageNumber: 7,
      position: { x: 350, y: 600 },
      color: "#8b5cf6",
      tags: ["complexity", "scalability", "sparse-attention", "flash-attention", "performer"],
      isPublic: true,
      likes: 34,
      replies: [],
      parentId: undefined
    },
    {
      id: "demo-7",
      documentId: "attention-is-all-you-need",
      userId: "user-7",
      userName: "Dr. Marcus Johnson",
      type: "insight",
      content: "The paper's approach to machine translation was revolutionary. I struggled with the encoder-decoder architecture initially, but the key insight is that the decoder can attend to any part of the encoded input, not just the last hidden state. This solved the information bottleneck problem in RNN-based translation. Today, this architecture is the foundation for models like T5, BART, and other sequence-to-sequence models. The attention mechanism allows the model to 'look back' at the source sequence when generating each target token.",
      pageNumber: 8,
      position: { x: 400, y: 700 },
      color: "#fbbf24",
      tags: ["translation", "encoder-decoder", "t5", "bart", "sequence-to-sequence"],
      isPublic: true,
      likes: 29,
      replies: [],
      parentId: null
    },
    {
      id: "demo-8",
      documentId: "attention-is-all-you-need",
      userId: "user-8",
      userName: "Prof. Mei Ling Chen",
      type: "understanding",
      content: "The paper's training methodology was ahead of its time. They used Adam optimizer with learning rate warmup, which is now standard practice. I struggled with training stability until I implemented their exact learning rate schedule. The key insight is that transformers need warmup because the attention weights are randomly initialized and need time to converge. This pattern is used in all modern transformer training - GPT, BERT, T5, etc. The paper also introduced label smoothing, which helps with generalization.",
      pageNumber: 9,
      position: { x: 450, y: 800 },
      color: "#10b981",
      tags: ["training", "adam", "warmup", "label-smoothing", "optimization"],
      isPublic: true,
      likes: 22,
      replies: [],
      parentId: null
    }
  ]

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

  // Filter and sort insights
  const filteredInsights = detailedInsights
    .filter(insight => {
      const matchesSearch = insight.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           insight.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesType = selectedType === 'all' || insight.type === selectedType
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b.likes - a.likes
        case 'replies':
          return b.replies.length - a.replies.length
        case 'date':
          return new Date(b.id).getTime() - new Date(a.id).getTime()
        default:
          return 0
      }
    })

  const insightTypes = [
    { value: 'all', label: 'All Types', icon: <Eye className="w-4 h-4" /> },
    { value: 'insight', label: 'Insights', icon: <Lightbulb className="w-4 h-4" /> },
    { value: 'confusion', label: 'Confusions', icon: <AlertTriangle className="w-4 h-4" /> },
    { value: 'question', label: 'Questions', icon: <HelpCircle className="w-4 h-4" /> },
    { value: 'understanding', label: 'Understanding', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'annotation', label: 'Annotations', icon: <MessageSquare className="w-4 h-4" /> },
    { value: 'highlight', label: 'Highlights', icon: <BookOpen className="w-4 h-4" /> }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Research Community Insights</h2>
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

        {/* Filters and Search */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search insights, researchers, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {insightTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'likes' | 'replies')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="likes">Most Liked</option>
                <option value="replies">Most Discussed</option>
                <option value="date">Recent</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{filteredInsights.length} insights found</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{summary.totalReaders} researchers</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{Math.round(summary.readingTime / 60)} min reading time</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredInsights.map((insight) => (
              <Card key={insight.id} className={getInsightColor(insight.type)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-semibold text-gray-900">{insight.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {insight.type}
                          </Badge>
                          {insight.pageNumber && (
                            <span className="text-xs text-gray-500 flex items-center space-x-1">
                              <BookOpen className="w-3 h-3" />
                              <span>Page {insight.pageNumber}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 mb-3 leading-relaxed">{insight.content}</p>
                        
                        {/* Tags */}
                        {insight.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {insight.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Engagement */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{insight.likes} likes</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Reply className="w-4 h-4" />
                            <span>{insight.replies.length} replies</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>2 days ago</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {insight.replies.length > 0 && (
                    <div className="ml-8 border-l-2 border-gray-200 pl-4 space-y-3">
                      {insight.replies.map((reply) => (
                        <div key={reply.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm text-gray-900">{reply.userName}</span>
                            <span className="text-xs text-gray-500">1 day ago</span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredInsights.length} of {detailedInsights.length} insights
            </p>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
