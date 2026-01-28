'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Eye,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Award,
  Bot
} from 'lucide-react'
import type { PDFSection } from '@/lib/pdfHeadingExtractor'
import { aiCoordinationCore } from '@/lib/agents/aiCoordinationCore'

interface SectionAssignmentPanelProps {
  sections: PDFSection[]
  collaborators: Array<{
    id: string
    name: string
    color: string
  }>
  currentUserId: string
  documentId: string
  socket: any
  onAssignmentChange: (assignments: SectionAssignment[]) => void
  onJumpToSection: (section: PDFSection) => void
  glowingSections?: Set<string>
  ghostHighlights?: any[]
  onShowJourneyReplay?: (sectionId: string, sectionName: string) => void
  reflections?: Map<string, { type: string, content: string, userName: string }>
}



interface SectionAssignment {
  sectionId: string
  userId: string
  userName: string
  status: 'assigned' | 'reading' | 'completed'
  progress: number
  assignedAt?: string
}

// interface SectionAssignmentPanelProps {
//   sections: PDFSection[]
//   collaborators: Array<{ id: string; name: string; color: string }>
//   currentUserId: string
//   documentId: string
//   onAssignmentChange: (assignments: SectionAssignment[]) => void
// }





export default function SectionAssignmentPanel({
  sections,
  collaborators,
  currentUserId,
  documentId,
  onAssignmentChange,
  onJumpToSection,
  socket,
  glowingSections = new Set(),
  ghostHighlights = [],
  onShowJourneyReplay,
  reflections = new Map()
}: SectionAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<SectionAssignment[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAssignDropdown, setShowAssignDropdown] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showSummaryModal, setShowSummaryModal] = useState<string | null>(null)
  const [summaryText, setSummaryText] = useState('')

  const handleAIAllocation = async () => {
    if (!reflections || reflections.size === 0) {
      toast.error('No reflections available for AI analysis yet.')
      return
    }

    const currentUserName = collaborators.find(c => c.id === currentUserId)?.name || 'User'

    toast.promise(
      async () => {
        // Run Agent 10 through Coordination Core
        const roles = aiCoordinationCore.requestSmartAllocation(sections, reflections, currentUserId, currentUserName)

        // Map RoleAssignments to SectionAssignments
        const newAssignments: SectionAssignment[] = roles.map(r => ({
          sectionId: r.sectionId,
          userId: r.userId,
          userName: r.userName,
          status: 'assigned',
          progress: 0,
          assignedAt: new Date().toISOString()
        }))

        setAssignments(newAssignments)
        onAssignmentChange(newAssignments)

        // Save and Broadcast
        try {
          await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'section-assigned',
              documentId,
              assignments: newAssignments
            })
          })

          if (socket?.connected) {
            socket.emit('assignment-changed', {
              documentId,
              assignments: newAssignments,
              userName: 'Agent 10: Role Allocation'
            })
          }
        } catch (err) {
          console.error(err)
        }
      },
      {
        loading: 'Agent 10 is analyzing cognitive profiles...',
        success: 'Roles allocated based on expertise gaps!',
        error: 'Allocation failed.'
      }
    )
  }

  // ✅ Clear assignments when document changes
  useEffect(() => {
    console.log('📄 Document changed, clearing assignments')
    setAssignments([])
  }, [documentId])
  // Listen for assignment updates from other users
  useEffect(() => {
    if (!documentId) return

    let lastFetchedData = ''

    const pollAssignments = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-assignments',
            documentId
          })
        })

        if (response.ok) {
          const data = await response.json()

          // Create a hash of the data to compare
          const dataHash = JSON.stringify(data.assignments || [])

          // Only update if data actually changed AND it's different from current state
          if (dataHash !== lastFetchedData) {
            const currentHash = JSON.stringify(assignments)

            if (dataHash !== currentHash) {
              lastFetchedData = dataHash

              if (data.success) {
                console.log('🔄 Assignments changed, updating:', data.assignments)
                setAssignments(data.assignments || [])
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to sync assignments:', error)
      }
    }

    // Initial fetch
    pollAssignments()

    // Poll every 3 seconds for updates
    const interval = setInterval(pollAssignments, 3000)

    return () => clearInterval(interval)
  }, [documentId, assignments])


  // Check for stale assignments (assigned >10 mins ago, still pending)
  useEffect(() => {
    const checkStaleAssignments = () => {
      const myAssignments = assignments.filter(
        a => a.userId === currentUserId && a.status === 'assigned'
      )

      myAssignments.forEach(assignment => {
        if (!assignment.assignedAt) return

        const minutesAgo = (Date.now() - new Date(assignment.assignedAt).getTime()) / 60000

        if (minutesAgo > 30 && minutesAgo < 31) {
          const section = sections.find(s => s.heading.id === assignment.sectionId)
          toast.info(`Reminder: You have "${section?.heading.text}" assigned`, {
            duration: 5000
          })
        }
      })
    }

    const interval = setInterval(checkStaleAssignments, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [assignments, currentUserId, sections])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(null)
      }
    }
    if (showAssignDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAssignDropdown])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const assignSection = async (sectionId: string, userId: string, userName: string) => {
    console.log('🎯 Assigning section:', { sectionId, userId, userName })

    const newAssignments = [...assignments]
    const existingIndex = newAssignments.findIndex(a => a.sectionId === sectionId)

    const assignment: SectionAssignment = {
      sectionId,
      userId,
      userName,
      status: 'assigned',
      progress: 0,
      assignedAt: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      newAssignments[existingIndex] = assignment
      toast.success(`Section reassigned to ${userName}`)
    } else {
      newAssignments.push(assignment)
      toast.success(`Section assigned to ${userName}`)
    }

    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    setShowAssignDropdown(null)

    // 🔥 Broadcast via REST API
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Failed to save assignment:', error)
    }

    // 🚀 Broadcast via Socket.io for instant updates
    if (socket && socket.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: currentUserId
      })
      console.log('✅ Assignment broadcasted via Socket.io')
    }
  }



  // Get ghost highlight data for a section
  const getGhostHighlight = (sectionId: string) => {
    return ghostHighlights.find(gh => gh.sectionId === sectionId)
  }

  const unassignSection = async (sectionId: string) => {
    const assignment = getAssignment(sectionId)
    const newAssignments = assignments.filter(a => a.sectionId !== sectionId)
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.info(`Unassigned from ${assignment?.userName}`)

    // Save to REST API
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Failed to save unassignment:', error)
    }

    // Broadcast via Socket.io
    if (socket && socket.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: currentUserId
      })
      console.log('✅ Unassignment broadcasted via Socket.io')
    }
  }

  const markAsReading = async (sectionId: string) => {
    const newAssignments = assignments.map(a =>
      a.sectionId === sectionId
        ? { ...a, status: 'reading' as const, progress: 25 }
        : a
    )
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.info('Status updated to Reading')

    // Save to REST API
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Failed to save status:', error)
    }

    // Broadcast via Socket.io
    if (socket && socket.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: currentUserId
      })
      console.log('✅ Reading status broadcasted')
    }
  }

  const markAsCompleted = async (sectionId: string) => {
    const newAssignments = assignments.map(a =>
      a.sectionId === sectionId
        ? { ...a, status: 'completed' as const, progress: 100 }
        : a
    )
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.success('Section marked as completed!')

    // ✅ ADD THIS: Notify team
    const assignment = assignments.find(a => a.sectionId === sectionId)
    if (assignment && socket?.connected) {
      socket.emit('section-completed', {
        documentId,
        sectionId,
        userName: assignment.userName,
        sectionName: sections.find(s => s.heading.id === sectionId)?.heading.text
      })
    }

    // Save to REST API
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Failed to save status:', error)
    }

    // Broadcast via Socket.io
    if (socket && socket.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: currentUserId
      })
      console.log('✅ Completed status broadcasted')
    }
  }


  const shareSummary = async (sectionId: string, summary: string) => {
    if (!summary.trim()) {
      toast.error('Please write a summary first')
      return
    }

    // Save summary
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-summary',
          documentId,
          sectionId,
          userId: currentUserId,
          summary: summary.trim()
        })
      })

      toast.success('Summary shared with team!')
      setShowSummaryModal(null)
      setSummaryText('')

      // Broadcast
      if (socket?.connected) {
        socket.emit('summary-shared', {
          documentId,
          sectionId,
          userName: collaborators.find(c => c.id === currentUserId)?.name,
          summary: summary.trim()
        })
      }
    } catch (error) {
      toast.error('Failed to share summary')
    }
  }


  const updateProgress = async (sectionId: string, progress: number) => {
    const newAssignments = assignments.map(a =>
      a.sectionId === sectionId
        ? { ...a, progress }
        : a
    )
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.info(`Progress updated to ${progress}%`)

    // Save to REST API
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Failed to save progress:', error)
    }

    // Broadcast via Socket.io
    if (socket && socket.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: currentUserId
      })
      console.log(`✅ Progress ${progress}% broadcasted`)
    }
  }


  const getWorkloadStats = () => {
    const stats = collaborators.map(collab => {
      const userSections = assignments.filter(a => a.userId === collab.id)
      const completed = userSections.filter(a => a.status === 'completed').length
      const reading = userSections.filter(a => a.status === 'reading').length
      const pending = userSections.filter(a => a.status === 'assigned').length

      return {
        user: collab,
        total: userSections.length,
        completed,
        reading,
        pending,
        percentage: Math.round((completed / (userSections.length || 1)) * 100)
      }
    })

    return stats
  }


  const autoAssignSections = async () => {
    if (!sections || sections.length === 0) return

    const newAssignments: SectionAssignment[] = []
    const availableCollaborators = [...collaborators]

    // Round-robin assignment for balanced workload
    sections.forEach((section, index) => {
      const assignee = availableCollaborators[index % availableCollaborators.length]

      newAssignments.push({
        sectionId: section.heading.id,
        userId: assignee.id,
        userName: assignee.name,
        status: 'assigned',
        progress: 0,
        assignedAt: new Date().toISOString()
      })
    })

    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.success(`Auto-assigned ${sections.length} sections fairly!`)

    // Save and broadcast
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'section-assigned',
          documentId,
          assignments: newAssignments
        })
      })
    } catch (error) {
      console.error('❌ Auto-assign failed:', error)
    }

    if (socket?.connected) {
      socket.emit('assignment-changed', {
        documentId,
        assignments: newAssignments,
        userName: 'AI Auto-Assign'
      })
    }
  }


  const getAssignment = (sectionId: string) => {
    return assignments.find(a => a.sectionId === sectionId)
  }

  const getUserColor = (userId: string) => {
    return collaborators.find(c => c.id === userId)?.color || '#6b7280'
  }

  const autoAssignAll = () => {
    if (!collaborators || collaborators.length === 0) {
      toast.error('No collaborators available')
      return
    }
    const unassigned = sections.filter(s => !getAssignment(s.heading.id))
    if (unassigned.length === 0) {
      toast.info('All sections already assigned')
      return
    }
    unassigned.forEach((section, i) => {
      const collab = collaborators[i % collaborators.length]
      assignSection(section.heading.id, collab.id, collab.name)
    })
    toast.success(`Auto-assigned ${unassigned.length} sections!`)
  }

  const clearAllAssignments = () => {
    if (assignments.length === 0) {
      toast.info('No assignments to clear')
      return
    }
    setAssignments([])
    onAssignmentChange([])
    toast.success('All assignments cleared')
  }





  const completedCount = assignments.filter(a => a.status === 'completed').length
  const readingCount = assignments.filter(a => a.status === 'reading').length
  const assignedCount = assignments.filter(a => a.status === 'assigned').length
  const completionPercentage = sections.length > 0
    ? Math.round((completedCount / sections.length) * 100)
    : 0


  {
    showSummaryModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[600px] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Share What You Learned</h3>
            <p className="text-sm text-gray-600 mb-4">
              Help your teammates by summarizing the key points from this section
            </p>

            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Key points:
    - Main concept...
    - Important finding...
    - Connection to..."
              className="w-full h-48 p-3 border rounded-lg text-sm"
            />

            <div className="flex gap-2 mt-4">
              <Button onClick={() => shareSummary(showSummaryModal, summaryText)}>
                Share Summary
              </Button>
              <Button variant="outline" onClick={() => setShowSummaryModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-rose-100 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-rose-900">Section Assignments</h3>
              <p className="text-xs text-rose-600">{sections.length} sections found</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white border-rose-300 text-rose-700">
            {assignments.length} / {sections.length} assigned
          </Badge>
        </div>

        {assignments.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-rose-700">
              <span>Progress</span>
              <span className="font-semibold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-rose-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="flex gap-2 flex-wrap mt-2">
              {completedCount > 0 && (
                <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full text-xs">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-medium">{completedCount} done</span>
                </div>
              )}
              {readingCount > 0 && (
                <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full text-xs">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-700 font-medium">{readingCount} reading</span>
                </div>
              )}
              {assignedCount > 0 && (
                <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full text-xs">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-700 font-medium">{assignedCount} pending</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            onClick={autoAssignSections}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Fair Distribute
          </Button>

          <Button
            onClick={handleAIAllocation}
            variant="secondary"
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm"
          >
            <Bot className="w-3 h-3 mr-1" />
            Smart AI Allocation
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Team Members
        </div>
        <div className="flex flex-wrap gap-2">
          {collaborators && collaborators.length > 0 ? (
            collaborators.map(collab => {
              const assignedSections = assignments.filter(a => a.userId === collab.id).length
              return (
                <div
                  key={collab.id}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200"
                >
                  <div
                    className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: collab.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">{collab.name}</span>
                  {assignedSections > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {assignedSections}
                    </Badge>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-sm text-gray-500 italic">No collaborators available</div>
          )}
        </div>
      </div>
      {/* 👇 PUT WORKLOAD VISUALIZATION HERE */}
      <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-b">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Team Workload
        </div>

        {getWorkloadStats().map(stat => (
          <div key={stat.user.id} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{stat.user.name}</span>
              <span className="text-xs text-gray-500">
                {stat.completed}/{stat.total} sections
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.user.color
                }}
              />
            </div>

            {stat.total > sections.length / collaborators.length + 1 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Overloaded</p>
            )}
          </div>
        ))}
      </div>
      {/* 👆 WORKLOAD VISUALIZATION ENDS HERE */}
      <div className="flex-1 px-4 py-3" style={{ overflow: 'visible' }}>
        <div className="space-y-2">
          {sections.map((section, index) => {
            const assignment = getAssignment(section.heading.id)
            const isExpanded = expandedSections.has(section.heading.id)
            const isDropdownOpen = showAssignDropdown === section.heading.id
            const isHovered = hoveredSection === section.heading.id
            const isGlowing = glowingSections.has(section.heading.id)
            const ghostHighlight = getGhostHighlight(section.heading.id)

            return (
              <div
                key={section.heading.id}
                className={`border rounded-lg overflow-visible relative transition-all duration-200 ${assignment ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'
                  } ${isHovered ? 'shadow-md scale-[1.01]' : 'shadow-sm'} ${isGlowing ? 'ai-section-glow ring-2 ring-amber-400' : ''
                  }`}
                style={{ zIndex: isDropdownOpen ? 999 : 1 }}
                onMouseEnter={() => setHoveredSection(section.heading.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-start gap-2 flex-1 cursor-pointer group"
                      onClick={() => toggleSection(section.heading.id)}
                    >
                      {section.subsections.length > 0 && (
                        <div className="flex-shrink-0 mt-0.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            §{index + 1}
                          </Badge>
                          <h4 className="font-semibold text-sm text-gray-900 group-hover:text-rose-600 transition-colors">
                            {section.heading.text}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Page</span> {section.startPage}
                            {section.endPage !== section.startPage && ` - ${section.endPage}`}
                          </span>
                          {section.heading.level && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Level</span> {section.heading.level}
                            </span>
                          )}
                          {section.subsections.length > 0 && (
                            <span className="text-blue-600">
                              {section.subsections.length} subsection{section.subsections.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {ghostHighlight && (
                          <div className="mt-2 mb-1">
                            <div className="group/ghost relative inline-block">
                              <Badge
                                variant="outline"
                                className="bg-orange-50 text-orange-700 border-orange-200 cursor-help flex items-center gap-1.5"
                              >
                                👻 {ghostHighlight.aggregatedData.totalUsers} struggled
                                <span className="text-[10px] opacity-75">
                                  (~{Math.round(ghostHighlight.aggregatedData.averageDuration / 60000)}m)
                                </span>
                              </Badge>

                              {/* Tooltip */}
                              <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-xl border p-3 hidden group-hover/ghost:block z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-xs space-y-2">
                                  <div className="flex justify-between items-center border-b pb-1">
                                    <span className="font-semibold text-orange-700">Historical Struggles</span>
                                    <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full text-[10px]">
                                      {ghostHighlight.aggregatedData.totalUsers} users
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <p className="text-gray-600">Common patterns:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {ghostHighlight.aggregatedData.commonPatterns.slice(0, 3).map((p: string, i: number) => (
                                        <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                          {p.replace('-', ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {ghostHighlight.aggregatedData.helpfulResources.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t">
                                      <p className="text-green-700 font-medium">✨ Most helpful:</p>
                                      <ul className="list-disc list-inside text-gray-600">
                                        {ghostHighlight.aggregatedData.helpfulResources.slice(0, 2).map((r: string, i: number) => (
                                          <li key={i}>{r}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs h-6 mt-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onShowJourneyReplay?.(section.heading.id, section.heading.text)
                                    }}
                                  >
                                    🎬 Replay Journey
                                  </Button>
                                </div>
                                {/* Arrow */}
                                <div className="absolute left-4 top-full w-2 h-2 bg-white border-b border-r transform rotate-45 -mt-1"></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {assignment && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                style={{
                                  backgroundColor: assignment.userId === 'lit-sense-ai' ? '#4f46e5' : getUserColor(assignment.userId),
                                  color: 'white',
                                  fontSize: '11px'
                                }}
                                className={`flex items-center gap-1 shadow-sm ${assignment.userId === 'lit-sense-ai' ? 'animate-pulse' : ''}`}
                              >
                                {assignment.userId === 'lit-sense-ai' ? <Bot className="w-3 h-3" /> : <span>👤</span>}
                                {assignment.userName}
                              </Badge>

                              {assignment.status === 'completed' && (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Completed
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowSummaryModal(section.heading.id)}
                                    className="ml-2 text-xs"
                                  >
                                    Share Summary
                                  </Button>
                                </>
                              )}
                              {assignment.status === 'reading' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Reading
                                </Badge>
                              )}
                              {assignment.status === 'assigned' && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Assigned
                                </Badge>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${assignment.status === 'completed' ? 'bg-green-500' :
                                    assignment.status === 'reading' ? 'bg-blue-500' :
                                      'bg-amber-400'
                                    }`}
                                  style={{ width: `${assignment.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600 min-w-[35px]">
                                {assignment.progress}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-start gap-2">
                      {!assignment ? (
                        <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowAssignDropdown(isDropdownOpen ? null : section.heading.id)
                            }}
                            className="whitespace-nowrap hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Assign
                          </Button>

                          {isDropdownOpen && (
                            <div
                              className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden"
                              style={{ zIndex: 999999 }}
                            >
                              <div className="p-2 bg-gray-50 border-b border-gray-200">
                                <p className="text-xs font-semibold text-gray-700">Assign to:</p>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {collaborators && collaborators.length > 0 ? (
                                  collaborators.map(collab => (
                                    <button
                                      key={collab.id}
                                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        assignSection(section.heading.id, collab.id, collab.name)
                                      }}
                                    >
                                      <div
                                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                                        style={{ backgroundColor: collab.color }}
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{collab.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {assignments.filter(a => a.userId === collab.id).length} sections assigned
                                        </p>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                                    No collaborators available
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Only show buttons if this is YOUR assignment */
                        assignment.userId === currentUserId ? (
                          <div className="flex gap-1">
                            {assignment.status === 'assigned' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsReading(section.heading.id)
                                }}
                                className="hover:bg-blue-50 hover:text-blue-700"
                                title="Mark as Reading"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}

                            {assignment.status === 'reading' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateProgress(section.heading.id, 50)
                                  }}
                                  className="hover:bg-blue-50 hover:text-blue-700 text-xs"
                                  title="50% Progress"
                                >
                                  50%
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateProgress(section.heading.id, 75)
                                  }}
                                  className="hover:bg-blue-50 hover:text-blue-700 text-xs"
                                  title="75% Progress"
                                >
                                  75%
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsCompleted(section.heading.id)
                                  }}
                                  className="hover:bg-green-50 hover:text-green-700"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                unassignSection(section.heading.id)
                              }}
                              className="hover:bg-red-50 hover:text-red-600"
                              title="Unassign"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && section.subsections.length > 0 && (
                  <div className="bg-gray-50/50 border-t border-gray-200 px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Subsections
                    </p>
                    <div className="space-y-1">
                      {section.subsections.map(subsection => (
                        <div
                          key={subsection.id}
                          className="flex items-center gap-2 text-sm text-gray-600 py-1.5 px-2 rounded hover:bg-white"
                        >
                          <span className="text-gray-400">•</span>
                          <span className="flex-1">{subsection.text}</span>
                          {subsection.level && (
                            <Badge variant="outline" className="text-xs">
                              L{subsection.level}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
            onClick={autoAssignAll}
            disabled={!collaborators || collaborators.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Assign All
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-gray-100"
            onClick={clearAllAssignments}
            disabled={assignments.length === 0}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>

        {completionPercentage === 100 && assignments.length > 0 && (
          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900">All sections completed!</p>
                <p className="text-xs text-green-700">Great teamwork! 🎉</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}