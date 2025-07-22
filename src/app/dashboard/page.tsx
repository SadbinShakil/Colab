'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import InfoToast from '@/components/InfoToast'
import { 
  BookOpen, Search, Upload, Plus, Filter, Grid3X3, List, 
  FileText, Users, Clock, Star, MoreHorizontal, Eye,
  MessageCircle, Brain, Lightbulb, Settings, User,
  Bell, HelpCircle, LogOut, FolderOpen, Tags, 
  TrendingUp, Calendar, Award, Zap, ChevronRight,
  Activity, Target, Globe, Sparkles
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showInfo, setShowInfo] = useState(true)

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Clear local storage
      localStorage.removeItem('currentUser')
      sessionStorage.removeItem('currentUser')
      
      // Redirect to login
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      localStorage.removeItem('currentUser')
      sessionStorage.removeItem('currentUser')
      router.push('/auth/login')
    }
  }

  // Mock data for documents
  const documents = [
    {
      id: '1',
      title: 'Attention Is All You Need',
      authors: 'Vaswani, A., et al.',
      uploadDate: '2024-01-15',
      status: 'active',
      collaborators: 3,
      annotations: 12,
      type: 'paper',
      tags: ['NLP', 'Transformers', 'Deep Learning'],
      progress: 75,
      lastActivity: '2 hours ago'
    },
    {
      id: '2',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'Devlin, J., et al.',
      uploadDate: '2024-01-12',
      status: 'completed',
      collaborators: 5,
      annotations: 28,
      type: 'paper',
      tags: ['BERT', 'NLP', 'Language Models'],
      progress: 100,
      lastActivity: '1 day ago'
    },
    {
      id: '3',
      title: 'The Illustrated Transformer',
      authors: 'Alammar, J.',
      uploadDate: '2024-01-10',
      status: 'draft',
      collaborators: 2,
      annotations: 8,
      type: 'paper',
      tags: ['Tutorial', 'Transformers'],
      progress: 45,
      lastActivity: '3 days ago'
    },
    {
      id: '4',
      title: 'GPT-4 Technical Report',
      authors: 'OpenAI',
      uploadDate: '2024-01-08',
      status: 'active',
      collaborators: 7,
      annotations: 35,
      type: 'paper',
      tags: ['GPT', 'LLM', 'AI'],
      progress: 60,
      lastActivity: '5 hours ago'
    }
  ]

  // Recent activity data
  const recentActivity = [
    { user: 'Dr. Sarah Chen', action: 'added annotation to', document: 'Attention Is All You Need', time: '2 hours ago' },
    { user: 'Prof. Michael Ross', action: 'shared', document: 'BERT Pre-training', time: '4 hours ago' },
    { user: 'Dr. Elena Volkov', action: 'completed review of', document: 'GPT-4 Technical Report', time: '6 hours ago' },
    { user: 'You', action: 'uploaded', document: 'Transformer Architecture', time: '1 day ago' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
      {/* Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">PaperPal</h1>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search papers, authors, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Bell className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Paper
              </Button>
              <div className="relative group">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, Dr. Smith
              </h2>
              <p className="text-gray-600">
                Continue your research journey with AI-powered insights
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Pro Plan</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Papers</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Collaborations</p>
                  <p className="text-2xl font-bold text-gray-900">17</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <Users className="w-3 h-3 mr-1" />
                    3 new invites
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Insights</p>
                  <p className="text-2xl font-bold text-gray-900">142</p>
                  <p className="text-xs text-purple-600 flex items-center mt-1">
                    <Brain className="w-3 h-3 mr-1" />
                    15 this week
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Research Score</p>
                  <p className="text-2xl font-bold text-gray-900">94</p>
                  <p className="text-xs text-yellow-600 flex items-center mt-1">
                    <Award className="w-3 h-3 mr-1" />
                    Top 5% globally
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Papers</CardTitle>
                    <CardDescription className="text-gray-600">
                      Your latest research documents and collaborations
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="border-gray-300">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <div className="flex border border-gray-200 rounded-lg">
                      <Button
                        size="sm"
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none border-0"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none border-0"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                  {documents.map((doc) => (
                    <Card
                      key={doc.id}
                      className="border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer group"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{doc.authors}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{doc.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${doc.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {doc.collaborators}
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              {doc.annotations}
                            </span>
                          </div>
                          <span className="text-xs">{doc.lastActivity}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                    View All Papers
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
                <CardDescription className="text-gray-600">
                  Common tasks to accelerate your research
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4 border-gray-200 hover:border-blue-300 hover:bg-blue-50 group"
                    onClick={() => router.push('/upload')}
                  >
                    <Upload className="w-6 h-6 mb-2 text-gray-600 group-hover:text-blue-600" />
                    <span className="text-sm font-medium">Upload Paper</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4 border-gray-200 hover:border-green-300 hover:bg-green-50 group"
                  >
                    <Plus className="w-6 h-6 mb-2 text-gray-600 group-hover:text-green-600" />
                    <span className="text-sm font-medium">New Project</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4 border-gray-200 hover:border-purple-300 hover:bg-purple-50 group"
                  >
                    <Users className="w-6 h-6 mb-2 text-gray-600 group-hover:text-purple-600" />
                    <span className="text-sm font-medium">Invite Team</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 group"
                  >
                    <Brain className="w-6 h-6 mb-2 text-gray-600 group-hover:text-yellow-600" />
                    <span className="text-sm font-medium">AI Analysis</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-medium text-blue-600">{activity.document}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All Activity
                </Button>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white/80 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Trending Topic</p>
                  <p className="text-sm text-gray-600">
                    "Multimodal Learning" is gaining traction in your research area
                  </p>
                </div>
                <div className="p-3 bg-white/80 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Collaboration Opportunity</p>
                  <p className="text-sm text-gray-600">
                    Dr. Maria Santos from MIT has similar research interests
                  </p>
                </div>
                <div className="p-3 bg-white/80 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Research Gap</p>
                  <p className="text-sm text-gray-600">
                    Limited work on ethical implications in your focus area
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full border-purple-300 hover:bg-purple-50">
                  Get More Insights
                </Button>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Research Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Complete 3 paper reviews</span>
                  <span className="text-xs text-green-600 font-medium">2/3</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Publish Q1 research</span>
                  <span className="text-xs text-blue-600 font-medium">In Progress</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>

                <Button variant="ghost" size="sm" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50">
                  View All Goals
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Info Toast */}
      {showInfo && (
        <InfoToast
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
} 