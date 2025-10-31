'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  BookOpen,
  Clock,
  Eye,
  Lightbulb,
  Calculator,
  Table,
  Image as ImageIcon,
  GraduationCap,
  Camera,
  AlertCircle,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Share2
} from 'lucide-react'

interface RealResearchStoryboardProps {
  isOpen: boolean
  onClose: () => void
  capturedSelections: Array<{
    text: string
    timestamp: number
    page: number
  }>
  stuckMarkers: Array<{
    id: string
    page: number
    position: { x: number; y: number }
    text: string
    timestamp: number
  }>
  currentPage: number
  totalPages: number
  showMathExplainer: boolean
  showGeneralExplainer: boolean
  showTableExplainer: boolean
  showImageExplainer: boolean
  showPrerequisiteHelper: boolean
  showScreenCapture: boolean
  selectedEquation?: string
  generalExplainerText?: string
  tableExplainerText?: string
  imageExplainerText?: string
  prerequisiteText?: string
}

interface TimelineEvent {
  id: string
  type: 'selection' | 'stuck' | 'math' | 'general' | 'table' | 'image' | 'prerequisite' | 'capture'
  timestamp: number
  page: number
  content: string
  icon: any
  color: string
}

export default function RealResearchStoryboard({
  isOpen,
  onClose,
  capturedSelections,
  stuckMarkers,
  currentPage,
  totalPages,
  showMathExplainer,
  showGeneralExplainer,
  showTableExplainer,
  showImageExplainer,
  showPrerequisiteHelper,
  showScreenCapture,
  selectedEquation = '',
  generalExplainerText = '',
  tableExplainerText = '',
  imageExplainerText = '',
  prerequisiteText = ''
}: RealResearchStoryboardProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'time' | 'page'>('time')

// Combine all activities into a timeline
// Combine all activities into a timeline
const timeline = useMemo(() => {
  // console.log('🔍 Timeline Debug - Raw Props:', {
  //   capturedSelections,
  //   capturedSelectionsLength: capturedSelections.length,
  //   capturedSelectionsFirst3: capturedSelections.slice(0, 3),
  //   stuckMarkers,
  //   stuckMarkersLength: stuckMarkers.length,
  //   showMathExplainer,
  //   showGeneralExplainer
  // });
  
  const events: TimelineEvent[] = []

  // Add captured selections with validation
  capturedSelections.forEach((selection, idx) => {
    // Ensure valid timestamp
    const timestamp = typeof selection.timestamp === 'number' 
      ? selection.timestamp 
      : Date.now() - (capturedSelections.length - idx) * 1000;
    
    // Ensure valid page
    const page = typeof selection.page === 'number' && selection.page > 0
      ? selection.page
      : currentPage;
    
    console.log(`📝 Adding selection ${idx}:`, {
      text: selection.text.substring(0, 50),
      timestamp,
      page
    });
    
    events.push({
      id: `selection-${idx}-${timestamp}`,
      type: 'selection',
      timestamp,
      page,
      content: selection.text,
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    })
  })

    // Add active explainer activities
    if (showMathExplainer && selectedEquation) {
      events.push({
        id: 'math-current',
        type: 'math',
        timestamp: Date.now(),
        page: currentPage,
        content: selectedEquation,
        icon: Calculator,
        color: 'bg-purple-100 text-purple-800 border-purple-300'
      })
    }

    if (showGeneralExplainer && generalExplainerText) {
      events.push({
        id: 'general-current',
        type: 'general',
        timestamp: Date.now(),
        page: currentPage,
        content: generalExplainerText,
        icon: Lightbulb,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      })
    }

    if (showTableExplainer && tableExplainerText) {
      events.push({
        id: 'table-current',
        type: 'table',
        timestamp: Date.now(),
        page: currentPage,
        content: tableExplainerText,
        icon: Table,
        color: 'bg-green-100 text-green-800 border-green-300'
      })
    }

    if (showImageExplainer && imageExplainerText) {
      events.push({
        id: 'image-current',
        type: 'image',
        timestamp: Date.now(),
        page: currentPage,
        content: imageExplainerText,
        icon: ImageIcon,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300'
      })
    }

    if (showPrerequisiteHelper && prerequisiteText) {
      events.push({
        id: 'prereq-current',
        type: 'prerequisite',
        timestamp: Date.now(),
        page: currentPage,
        content: prerequisiteText,
        icon: GraduationCap,
        color: 'bg-orange-100 text-orange-800 border-orange-300'
      })
    }

    if (showScreenCapture) {
      events.push({
        id: 'capture-current',
        type: 'capture',
        timestamp: Date.now(),
        page: currentPage,
        content: 'Screen capture in progress',
        icon: Camera,
        color: 'bg-teal-100 text-teal-800 border-teal-300'
      })
    }

    // Sort events
    if (sortBy === 'time') {
      events.sort((a, b) => a.timestamp - b.timestamp)
    } else {
      events.sort((a, b) => a.page - b.page)
    }

    // Filter events
    if (filterType !== 'all') {
      return events.filter(e => e.type === filterType)
    }

    return events
  }, [
    capturedSelections,
    stuckMarkers,
    showMathExplainer,
    showGeneralExplainer,
    showTableExplainer,
    showImageExplainer,
    showPrerequisiteHelper,
    showScreenCapture,
    selectedEquation,
    generalExplainerText,
    tableExplainerText,
    imageExplainerText,
    prerequisiteText,
    currentPage,
    sortBy,
    filterType
  ])

  // Calculate statistics
  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {}
    timeline.forEach(event => {
      typeCount[event.type] = (typeCount[event.type] || 0) + 1
    })

    const totalTime = timeline.length > 0
      ? timeline[timeline.length - 1].timestamp - timeline[0].timestamp
      : 0

    const pagesVisited = new Set(timeline.map(e => e.page)).size

    return {
      totalEvents: timeline.length,
      typeCount,
      totalTime,
      pagesVisited,
      avgTimePerPage: pagesVisited > 0 ? totalTime / pagesVisited : 0
    }
  }, [timeline])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedEvents(newExpanded)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      selection: 'Text Selection',
      stuck: 'Stuck Marker',
      math: 'Math Explainer',
      general: 'General Explainer',
      table: 'Table Explainer',
      image: 'Image Explainer',
      prerequisite: 'Prerequisites',
      capture: 'Screen Capture'
    }
    return labels[type] || type
  }

  const exportTimeline = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      stats,
      timeline: timeline.map(e => ({
        type: e.type,
        timestamp: new Date(e.timestamp).toISOString(),
        page: e.page,
        content: e.content
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-storyboard-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl font-bold">Research Storyboard</CardTitle>
                <p className="text-blue-100 opacity-90">Your reading journey visualized</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportTimeline}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalEvents}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pages Visited</p>
                    <p className="text-2xl font-bold text-green-600">{stats.pagesVisited}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Time</p>
                    <p className="text-2xl font-bold text-purple-600">{formatDuration(stats.totalTime)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="text-2xl font-bold text-orange-600">{Math.round((currentPage / totalPages) * 100)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              {Object.keys(stats.typeCount).map(type => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {getTypeLabel(type)} ({stats.typeCount[type]})
                </Button>
              ))}
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <Button
                variant={sortBy === 'time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('time')}
              >
                Time
              </Button>
              <Button
                variant={sortBy === 'page' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('page')}
              >
                Page
              </Button>
            </div>
          </div>

{/* DEBUG PANEL - Shows raw data */}
<Card className="bg-yellow-50 border-2 border-yellow-400 mb-6">
  <CardHeader className="bg-yellow-100">
    <CardTitle className="text-yellow-900 flex items-center gap-2">
      🔧 DEBUG PANEL - Raw Data Received
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    <div className="space-y-3 text-sm font-mono">
      <div className="bg-white p-3 rounded border">
        <div className="font-bold text-blue-600 mb-2">capturedSelections (prop):</div>
        <div className="text-xs">Length: {capturedSelections.length}</div>
        {capturedSelections.length > 0 && (
          <div className="mt-2 space-y-2">
            {capturedSelections.slice(0, 3).map((sel, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded">
                <div><strong>Selection {idx + 1}:</strong></div>
                <div>Text: {sel.text?.substring(0, 50)}...</div>
                <div>Timestamp: {sel.timestamp} (type: {typeof sel.timestamp})</div>
                <div>Page: {sel.page}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white p-3 rounded border">
        <div className="font-bold text-green-600 mb-2">timeline (computed):</div>
        <div className="text-xs">Length: {timeline.length}</div>
        {timeline.length > 0 && (
          <div className="mt-2 space-y-2">
            {timeline.slice(0, 3).map((event, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded">
                <div><strong>Event {idx + 1}:</strong></div>
                <div>Type: {event.type}</div>
                <div>Content: {event.content?.substring(0, 50)}...</div>
                <div>Timestamp: {event.timestamp}</div>
                <div>Page: {event.page}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white p-3 rounded border">
        <div className="font-bold text-purple-600 mb-2">Other Props:</div>
        <div>Stuck Markers: {stuckMarkers.length}</div>
        <div>Current Page: {currentPage}</div>
        <div>Total Pages: {totalPages}</div>
        <div>Show Math Explainer: {showMathExplainer ? 'Yes' : 'No'}</div>
        <div>Show General Explainer: {showGeneralExplainer ? 'Yes' : 'No'}</div>
      </div>
    </div>
  </CardContent>
</Card>




          {/* Timeline */}
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No activities recorded yet</p>
                <p className="text-gray-400 text-sm">Start reading and interacting with the document to build your storyboard</p>
              </div>
            ) : (
              timeline.map((event, idx) => {
                const Icon = event.icon
                const isExpanded = expandedEvents.has(event.id)
                const truncatedContent = event.content.length > 100
                  ? event.content.substring(0, 100) + '...'
                  : event.content

                return (
                  <div key={event.id} className="relative">
                    {/* Timeline connector */}
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-8 top-16 w-0.5 h-8 bg-gray-300"></div>
                    )}

                    <Card className={`border-2 ${event.color} transition-all hover:shadow-md`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className={`${event.color} rounded-full p-3 flex-shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className={event.color}>
                                  {getTypeLabel(event.type)}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  Page {event.page}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatTimestamp(event.timestamp)}
                                </span>
                              </div>
                              {event.content.length > 100 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(event.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {isExpanded ? event.content : truncatedContent}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })
            )}
          </div>

          {/* Summary Footer */}
          {timeline.length > 0 && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-800 mb-2">Session Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Selections:</span>
                  <span className="ml-2 font-medium">{stats.typeCount.selection || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Stuck Moments:</span>
                  <span className="ml-2 font-medium">{stats.typeCount.stuck || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Explainers Used:</span>
                  <span className="ml-2 font-medium">
                    {(stats.typeCount.math || 0) +
                     (stats.typeCount.general || 0) +
                     (stats.typeCount.table || 0) +
                     (stats.typeCount.image || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Time/Page:</span>
                  <span className="ml-2 font-medium">{formatDuration(stats.avgTimePerPage)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
