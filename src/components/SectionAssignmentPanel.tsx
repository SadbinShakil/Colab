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
  Award
} from 'lucide-react'
import type { PDFSection } from '@/lib/pdfHeadingExtractor'

interface SectionAssignmentPanelProps {
  sections: PDFSection[]
  collaborators: Array<{ id: string; name: string; color: string }>
  currentUserId: string
  documentId: string
  onAssignmentChange: (assignments: SectionAssignment[]) => void
  socket?: any  // ✅ ADD THIS LINE
}



interface SectionAssignment {
  sectionId: string
  userId: string
  userName: string
  status: 'assigned' | 'reading' | 'completed'
  progress: number
  assignedAt?: string
}

interface SectionAssignmentPanelProps {
  sections: PDFSection[]
  collaborators: Array<{ id: string; name: string; color: string }>
  currentUserId: string
  documentId: string
  onAssignmentChange: (assignments: SectionAssignment[]) => void
}





export default function SectionAssignmentPanel({
  sections,
  collaborators,
  currentUserId,
  documentId,
  onAssignmentChange,
  socket  // ✅ ADD THIS LINE
}: SectionAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<SectionAssignment[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAssignDropdown, setShowAssignDropdown] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)


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

  const markAsReading = (sectionId: string) => {
    const newAssignments = assignments.map(a => 
      a.sectionId === sectionId 
        ? { ...a, status: 'reading' as const, progress: 25 }
        : a
    )
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.info('Status updated to Reading')
  }

  const markAsCompleted = (sectionId: string) => {
    const newAssignments = assignments.map(a => 
      a.sectionId === sectionId 
        ? { ...a, status: 'completed' as const, progress: 100 }
        : a
    )
    setAssignments(newAssignments)
    onAssignmentChange(newAssignments)
    toast.success('Section marked as completed!')
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

      <div className="flex-1 px-4 py-3" style={{ overflow: 'visible' }}>
        <div className="space-y-2">
          {sections.map((section, index) => {
            const assignment = getAssignment(section.heading.id)
            const isExpanded = expandedSections.has(section.heading.id)
            const isDropdownOpen = showAssignDropdown === section.heading.id
            const isHovered = hoveredSection === section.heading.id

            return (
              <div
                key={section.heading.id}
                className={`border rounded-lg overflow-visible relative transition-all duration-200 ${
                  assignment ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'
                } ${isHovered ? 'shadow-md scale-[1.01]' : 'shadow-sm'}`}
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

                        {assignment && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              style={{ backgroundColor: getUserColor(assignment.userId), color: 'white', fontSize: '11px' }}
                              className="flex items-center gap-1 shadow-sm"
                            >
                              <span>👤</span>
                              {assignment.userName}
                            </Badge>
                            
                            {assignment.status === 'completed' && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
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