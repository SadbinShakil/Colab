// components/InteractionAnalysisDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Activity,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Lightbulb,
  Target,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'
import { interactionCollector } from '@/lib/interactionCollector'
import { interactionAnalyzer, type AnalysisResult } from '@/lib/interactionAnalyzer'
import { aiCoordinationCore } from '@/lib/agents/aiCoordinationCore'

interface InteractionAnalysisDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function InteractionAnalysisDashboard({
  isOpen,
  onClose
}: InteractionAnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'patterns' | 'timeline'>('overview')

  useEffect(() => {
    if (isOpen) {
      runAnalysis()
    }
  }, [isOpen])

  const runAnalysis = () => {
    setLoading(true)
    
    // Use coordination core for comprehensive analysis
    const result = aiCoordinationCore.runComprehensiveAnalysis()
    setAnalysis(result)
    
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    if (score >= 40) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Interaction Analysis</h2>
              <p className="text-sm text-gray-600">AI-powered reading insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => interactionCollector.downloadSessionData()}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full w-10 h-10 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'sections', label: 'Sections', icon: Target },
            { id: 'patterns', label: 'Patterns', icon: TrendingUp },
            { id: 'timeline', label: 'Timeline', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Analyzing your interactions...</p>
              </div>
            </div>
          ) : !analysis ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No analysis data available yet</p>
                <Button onClick={runAnalysis}>Run Analysis</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">



{/* Active Agents Display */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Activity className="w-5 h-5 text-blue-600" />
      Active Agents
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {aiCoordinationCore.getAgentActivities().map((agent, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium text-sm">{agent.agentName}</p>
              <p className="text-xs text-gray-600">{agent.lastActivity}</p>
            </div>
          </div>
          <Badge variant="outline" className={agent.status === 'active' ? 'bg-green-50' : 'bg-gray-50'}>
            {agent.status}
          </Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>





                  {/* Score Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={`${getScoreBg(100 - analysis.overallStruggleScore)} border-2`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Struggle Level</span>
                          <TrendingDown className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(100 - analysis.overallStruggleScore)}`}>
                          {analysis.overallStruggleScore}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {analysis.overallStruggleScore < 30 ? 'Low' : analysis.overallStruggleScore < 60 ? 'Moderate' : 'High'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className={`${getScoreBg(analysis.overallUnderstandingScore)} border-2`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Understanding</span>
                          <Brain className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.overallUnderstandingScore)}`}>
                          {analysis.overallUnderstandingScore}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {analysis.overallUnderstandingScore >= 80 ? 'Excellent' : analysis.overallUnderstandingScore >= 60 ? 'Good' : 'Needs work'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className={`${getScoreBg(analysis.overallEngagementScore)} border-2`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Engagement</span>
                          <Activity className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.overallEngagementScore)}`}>
                          {analysis.overallEngagementScore}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {analysis.overallEngagementScore >= 80 ? 'Very active' : analysis.overallEngagementScore >= 60 ? 'Active' : 'Passive'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className={`${getScoreBg(analysis.readingEfficiency)} border-2`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Efficiency</span>
                          <BarChart3 className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.readingEfficiency)}`}>
                          {analysis.readingEfficiency}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {analysis.readingPattern}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-600" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg border-l-4 ${
                              rec.priority === 'high'
                                ? 'bg-red-50 border-red-500'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-50 border-yellow-500'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {rec.type === 'intervention' ? (
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              ) : rec.type === 'praise' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                                <p className="text-sm font-medium text-gray-900">💡 {rec.actionable}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Reading Behavior */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Reading Behavior
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Pattern</p>
                          <p className="font-semibold capitalize">{analysis.readingPattern}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Time</p>
                          <p className="font-semibold">{Math.round(analysis.timeDistribution.totalActiveTime / 60000)} min</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Avg/Section</p>
                          <p className="font-semibold">{Math.round(analysis.timeDistribution.avgTimePerSection / 1000)} sec</p>
                        </div>
                      </div>

                      {analysis.focusAreas.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Focus Areas:</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.focusAreas.map((area, idx) => (
                              <Badge key={idx} variant="outline" className="bg-blue-50">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.weakAreas.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Challenging Areas:</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.weakAreas.map((area, idx) => (
                              <Badge key={idx} variant="outline" className="bg-red-50">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Sections Tab */}
              {activeTab === 'sections' && (
                <div className="space-y-6">
                  {/* Struggling Sections */}
                  {analysis.strugglingSections.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          Struggling Sections ({analysis.strugglingSections.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.strugglingSections.map((section, idx) => (
                          <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{section.sectionName}</h4>
                              <Badge variant="destructive">Score: {section.struggleScore}</Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{section.summary}</p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Time:</span>
                                <span className="ml-2 font-medium">{Math.round(section.timeSpent / 1000)}s</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Revisits:</span>
                                <span className="ml-2 font-medium">{section.revisits}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Confusion:</span>
                                <span className="ml-2 font-medium">{section.highlightRatio.confusion}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Understood Sections */}
                  {analysis.understoodSections.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Well Understood Sections ({analysis.understoodSections.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysis.understoodSections.map((section, idx) => (
                          <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{section.sectionName}</h4>
                              <Badge className="bg-green-600">Score: {section.understandingScore}</Badge>
                            </div>
                            <p className="text-sm text-gray-700">{section.summary}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Patterns Tab */}
              {activeTab === 'patterns' && (
                <div className="space-y-4">
                  {analysis.patterns.map((pattern, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            pattern.type === 'struggle' ? 'bg-red-100' :
                            pattern.type === 'mastery' ? 'bg-green-100' :
                            pattern.type === 'confusion' ? 'bg-yellow-100' :
                            pattern.type === 'engagement' ? 'bg-blue-100' :
                            'bg-gray-100'
                          }`}>
                            {pattern.type === 'struggle' && <AlertCircle className="w-6 h-6 text-red-600" />}
                            {pattern.type === 'mastery' && <CheckCircle className="w-6 h-6 text-green-600" />}
                            {pattern.type === 'confusion' && <TrendingDown className="w-6 h-6 text-yellow-600" />}
                            {pattern.type === 'engagement' && <TrendingUp className="w-6 h-6 text-blue-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg capitalize">{pattern.type}</h3>
                              <Badge variant="outline">
                                {Math.round(pattern.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-gray-700 mb-3">{pattern.description}</p>
                            <div className="space-y-1">
                              {pattern.evidence.map((ev, i) => (
                                <p key={i} className="text-sm text-gray-600">• {ev}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {analysis.patterns.length === 0 && (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No patterns detected yet. Keep reading!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Timeline view coming soon...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
