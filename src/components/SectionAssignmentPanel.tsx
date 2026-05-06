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
  Bot,
  Brain,
  HelpCircle,
  AlertOctagon,
  MessageSquare,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import type { PDFSection } from '@/lib/pdfHeadingExtractor'
import { aiCoordinationCore } from '@/lib/agents/aiCoordinationCore'
import type { RoleAssignment } from '@/lib/agents/Agent10_RoleAllocation'

interface SectionAssignmentPanelProps {
  sections: PDFSection[]
  collaborators: Array<{
    id: string
    name: string
    color: string
  }>
  currentUserId: string
  documentId: string
  documentTitle?: string
  socket: any
  onAssignmentChange: (assignments: SectionAssignment[]) => void
  onJumpToSection: (section: PDFSection) => void
  glowingSections?: Set<string>
  ghostHighlights?: any[]
  onShowJourneyReplay?: (sectionId: string, sectionName: string) => void
  reflections?: Map<string, { type: string, content: string, userName: string }>
  /** A10 Phase I allocation result — pre-seeds assignments when available */
  a10Assignments?: Array<{ sectionId: string; sectionName: string; assignedTo: string; assignedName: string; isAI: boolean }>
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
  documentTitle,
  onAssignmentChange,
  onJumpToSection,
  socket,
  glowingSections = new Set(),
  ghostHighlights = [],
  onShowJourneyReplay,
  reflections = new Map(),
  a10Assignments,
}: SectionAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<SectionAssignment[]>([])
  const [seededFromA10, setSeededFromA10] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAssignDropdown, setShowAssignDropdown] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showSummaryModal, setShowSummaryModal] = useState<string | null>(null)
  const [summaryText, setSummaryText] = useState('')
  /** Rationale + AI briefs from A10 — keyed by sectionId */
  const [roleDetails, setRoleDetails] = useState<Map<string, RoleAssignment>>(new Map())
  const [expandedRationale, setExpandedRationale] = useState<Set<string>>(new Set())
  // Knowledge cards — keyed by sectionId
  const [knowledgeCards, setKnowledgeCards] = useState<Map<string, {
    loading: boolean
    error?: string
    mainArgument?: string
    keyTerms?: string[]
    criticalQuestions?: string[]
    confusionSignal?: string | null
  }>>(new Map())
  const [expandedKnowledge, setExpandedKnowledge] = useState<Set<string>>(new Set())

  const fetchKnowledgeCard = async (section: PDFSection) => {
    const id = section.heading.id
    // Prevent duplicate fetches (but allow retry on error)
    const existing = knowledgeCards.get(id)
    if (existing && !existing.error && !existing.loading) return

    setKnowledgeCards(prev => new Map(prev).set(id, { loading: true }))
    setExpandedKnowledge(prev => new Set(prev).add(id))

    try {
      const subsectionNames = section.subsections.map(s => s.text).join(', ')
      const sectionDesc = subsectionNames ? `${section.heading.text} (subsections: ${subsectionNames})` : section.heading.text

      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate a structured knowledge card for the section "${sectionDesc}" from this paper. Return ONLY valid JSON with these fields: {"mainArgument": "one-sentence core claim of this section", "keyTerms": ["term1","term2","term3"], "criticalQuestions": ["question1","question2"]}. No markdown, no preamble.`,
          documentTitle: documentTitle || 'Research Paper',
          sectionName: section.heading.text,
          documentContent: `Section: ${sectionDesc}\nPaper: ${documentTitle || 'Research Paper'}`,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      // The ai-help endpoint returns { answer: '...' }
      // Try to parse the answer as JSON; fall back to using it as mainArgument
      let card: { mainArgument?: string; keyTerms?: string[]; criticalQuestions?: string[]; confusionSignal?: string | null } = {}
      const raw = data.answer || data.content || ''
      try {
        // Strip any markdown fences if present
        const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        card = {
          mainArgument: parsed.mainArgument || raw,
          keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
          criticalQuestions: Array.isArray(parsed.criticalQuestions) ? parsed.criticalQuestions : [],
          confusionSignal: null,
        }
      } catch {
        // GPT returned prose — use it as the main argument
        card = {
          mainArgument: raw.replace(/^\*\*Analysis:\*\*\s*/i, '').split('**Tension:')[0].trim(),
          keyTerms: [],
          criticalQuestions: [],
          confusionSignal: null,
        }
      }

      setKnowledgeCards(prev => new Map(prev).set(id, { loading: false, ...card }))
    } catch {
      setKnowledgeCards(prev => new Map(prev).set(id, {
        loading: false,
        error: 'Could not load knowledge card — check connection.',
      }))
    }
  }

  const toggleKnowledgeCard = (section: PDFSection) => {
    const id = section.heading.id
    const isOpen = expandedKnowledge.has(id)
    if (isOpen) {
      setExpandedKnowledge(prev => { const n = new Set(prev); n.delete(id); return n })
    } else {
      fetchKnowledgeCard(section)
    }
  }

  const handleAIAllocation = async () => {
    if (!reflections || reflections.size === 0) {
      toast.error('Submit your pre-session reflection first — A10 needs it to assign sections.')
      return
    }

    toast.promise(
      async () => {
        // A10 — semantic allocation via GPT-4o
        const roles = await aiCoordinationCore.requestSmartAllocation(
          sections,
          reflections,
          documentTitle
        )

        // Store full role detail for UI rendering
        const detailMap = new Map<string, RoleAssignment>()
        roles.forEach(r => detailMap.set(r.sectionId, r))
        setRoleDetails(detailMap)

        // Map to SectionAssignment shape used by the rest of the system
        const newAssignments: SectionAssignment[] = roles.map(r => ({
          sectionId: r.sectionId,
          userId: r.userId,
          userName: r.userName,
          status: 'assigned',
          progress: 0,
          assignedAt: new Date().toISOString(),
        }))

        setAssignments(newAssignments)
        onAssignmentChange(newAssignments)

        // Persist and broadcast
        await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'section-assigned', documentId, assignments: newAssignments }),
        })

        if (socket?.connected) {
          socket.emit('assignment-changed', {
            documentId,
            assignments: newAssignments,
            userName: 'A10: Role Allocation',
          })
        }

        // Auto-expand all sections so rationale is visible
        setExpandedSections(new Set(sections.map(s => s.heading.id)))
      },
      {
        loading: 'A10 reading reflections and matching to sections…',
        success: 'Sections assigned — rationale shown below each section',
        error: 'Allocation failed — check connection',
      }
    )
  }

  // ✅ Clear assignments when document changes
  useEffect(() => {
    console.log('📄 Document changed, clearing assignments')
    setAssignments([])
    setSeededFromA10(false)
  }, [documentId])

  // Seed assignments from A10 Phase I result when it arrives
  useEffect(() => {
    if (!a10Assignments?.length || seededFromA10) return
    const seeded: SectionAssignment[] = a10Assignments.map(a => ({
      sectionId: a.sectionId,
      userId: a.assignedTo,
      userName: a.assignedName,
      status: 'assigned' as const,
      progress: 0,
      assignedAt: new Date().toISOString(),
    }))
    setAssignments(seeded)
    setSeededFromA10(true)
    onAssignmentChange(seeded)
  }, [a10Assignments, seededFromA10, onAssignmentChange])
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





  // Inline SVG progress ring — 20px outer, 6px stroke
  const ProgressRing = ({ progress, status }: { progress: number; status: SectionAssignment['status'] }) => {
    const r = 7
    const circ = 2 * Math.PI * r
    const stroke = status === 'completed' ? '#10b981' : status === 'reading' ? '#38bdf8' : '#cbd5e1'
    const filled = circ * (progress / 100)
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="10" cy="10" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
        <circle
          cx="10" cy="10" r={r} fill="none"
          stroke={stroke} strokeWidth="2.5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
    )
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

  // Helper: initials avatar colour — stable per userId
  const avatarColor = (userId: string) => {
    const palette = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
    let h = 0
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffff
    return palette[h % palette.length]
  }
  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // Decide which list to render: fallback (A10 only) or full pdfSections
  const useFallback = sections.length === 0 && seededFromA10 && !!a10Assignments?.length

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-semibold text-slate-800 tracking-tight">Reading roles</h3>
          <span className="text-[11px] text-slate-400 font-medium tabular-nums">
            {assignments.length}/{useFallback ? a10Assignments!.length : sections.length} assigned
          </span>
        </div>

        {seededFromA10 ? (
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-indigo-500 shrink-0" />
            <p className="text-[11px] text-indigo-600">
              Assigned by A10 from pre-session reflections
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAIAllocation}
              disabled={!reflections || reflections.size === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[11px] font-semibold transition-colors"
            >
              <Brain className="w-3 h-3" />
              Assign by reflection
            </button>
            {(!reflections || reflections.size === 0) && (
              <span className="text-[11px] text-slate-400">Waiting for reflections…</span>
            )}
          </div>
        )}
      </div>

      {/* ── Section list ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Fallback: pdfSections not extracted yet, show A10 result directly */}
        {useFallback && (
          <div className="divide-y divide-slate-100">
            {a10Assignments!.map((a, index) => {
              const isMe = a.assignedTo === currentUserId
              const color = a.isAI ? '#6366f1' : avatarColor(a.assignedTo)
              return (
                <div key={a.sectionId} className={`px-4 py-3 ${isMe ? 'bg-indigo-50/40' : 'bg-white'}`}>
                  <div className="flex items-start gap-3">
                    {/* Section number */}
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 w-5 shrink-0 text-right">
                      §{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 leading-snug">{a.sectionName}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {a.isAI ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <Bot className="w-3 h-3 text-indigo-500" />
                          </div>
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {initials(a.assignedName)}
                          </div>
                        )}
                        <span className={`text-[11px] font-medium ${isMe ? 'text-indigo-700' : 'text-slate-600'}`}>
                          {a.assignedName}{isMe ? ' · you' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Full view: pdfSections extracted */}
        {!useFallback && (
          <div className="divide-y divide-slate-100">
            {sections.map((section, index) => {
              const assignment = getAssignment(section.heading.id)
              const isExpanded = expandedSections.has(section.heading.id)
              const isDropdownOpen = showAssignDropdown === section.heading.id
              const isGlowing = glowingSections.has(section.heading.id)
              const ghostHighlight = getGhostHighlight(section.heading.id)
              const roleDetail = roleDetails.get(section.heading.id)
              const rationaleOpen = expandedRationale.has(section.heading.id)
              const isMe = assignment?.userId === currentUserId

              return (
                <div
                  key={section.heading.id}
                  className={`relative ${isGlowing ? 'ring-1 ring-inset ring-amber-300' : ''}`}
                  style={{ zIndex: isDropdownOpen ? 999 : 'auto' }}
                >
                  <div className={`px-4 py-3 ${isMe ? 'bg-indigo-50/30' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">

                      {/* Section number + progress ring */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0 w-5 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 text-right w-full">
                          §{index + 1}
                        </span>
                        {assignment && (
                          <ProgressRing progress={assignment.progress} status={assignment.status} />
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-left flex-1 min-w-0"
                            onClick={() => onJumpToSection(section)}
                          >
                            <p className="text-[13px] font-semibold text-slate-800 leading-snug hover:text-indigo-700 transition-colors">
                              {section.heading.text}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              p.{section.startPage}{section.endPage !== section.startPage ? `–${section.endPage}` : ''}
                              {section.subsections.length > 0 && ` · ${section.subsections.length} subsections`}
                            </p>
                          </button>

                          {/* Assignee avatar or assign button */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {assignment ? (
                              <div className="flex items-center gap-1.5">
                                {assignment.userId === 'coread-ai' || assignment.userId === 'ai' ? (
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Bot className="w-3.5 h-3.5 text-indigo-500" />
                                  </div>
                                ) : (
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: avatarColor(assignment.userId) }}
                                    title={assignment.userName}
                                  >
                                    {initials(assignment.userName)}
                                  </div>
                                )}
                                {/* Status dot */}
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  assignment.status === 'completed' ? 'bg-emerald-500' :
                                  assignment.status === 'reading'   ? 'bg-sky-500' :
                                  'bg-slate-300'
                                }`} title={assignment.status} />
                              </div>
                            ) : (
                              <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAssignDropdown(isDropdownOpen ? null : section.heading.id)
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Assign
                                </button>
                                {isDropdownOpen && (
                                  <div
                                    className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                                    style={{ zIndex: 999999 }}
                                  >
                                    <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                      Assign to
                                    </p>
                                    {collaborators.map(collab => (
                                      <button
                                        key={collab.id}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          assignSection(section.heading.id, collab.id, collab.name)
                                        }}
                                      >
                                        <div
                                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                          style={{ backgroundColor: avatarColor(collab.id) }}
                                        >
                                          {initials(collab.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[12px] font-medium text-slate-800">{collab.name}</p>
                                          <p className="text-[10px] text-slate-400">
                                            {assignments.filter(a => a.userId === collab.id).length} sections
                                          </p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Assignee name + actions (only when assigned) */}
                        {assignment && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] text-slate-600 font-medium">
                              {assignment.userName}{isMe ? ' · you' : ''}
                            </span>
                            <span className="text-slate-200">·</span>
                            {isMe && assignment.status === 'assigned' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markAsReading(section.heading.id) }}
                                className="text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors"
                              >
                                Start reading
                              </button>
                            )}
                            {isMe && assignment.status === 'reading' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markAsCompleted(section.heading.id) }}
                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                              >
                                Mark done
                              </button>
                            )}
                            {assignment.status === 'completed' && (
                              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Done
                              </span>
                            )}
                            {isMe && (
                              <button
                                onClick={(e) => { e.stopPropagation(); unassignSection(section.heading.id) }}
                                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors ml-auto"
                                title="Unassign"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Ghost highlight — prior session struggle signal */}
                        {ghostHighlight && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-600 font-medium">
                              {ghostHighlight.aggregatedData.totalUsers} prior readers struggled here
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onShowJourneyReplay?.(section.heading.id, section.heading.text) }}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                            >
                              Replay
                            </button>
                          </div>
                        )}

                        {/* A10 reading angle — always shown when available, most useful signal */}
                        {roleDetail && (
                          <div className="mt-2 space-y-1.5">
                            {roleDetail.inferredAngle && (
                              <p className="text-[11px] text-slate-500 italic leading-snug">
                                {roleDetail.inferredAngle}
                              </p>
                            )}
                            {/* AI brief toggle for AI-assigned sections */}
                            {roleDetail.isAI && roleDetail.aiBrief && (
                              <>
                                <button
                                  onClick={() => setExpandedRationale(prev => {
                                    const next = new Set(prev)
                                    if (next.has(section.heading.id)) next.delete(section.heading.id)
                                    else next.add(section.heading.id)
                                    return next
                                  })}
                                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                >
                                  <Bot className="w-3 h-3" />
                                  {rationaleOpen ? 'Hide AI brief' : 'Show AI brief'}
                                  {rationaleOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                                {rationaleOpen && (
                                  <div className="mt-2 space-y-2 pl-2 border-l-2 border-indigo-100">
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Main argument</p>
                                      <p className="text-[12px] text-slate-700 leading-relaxed">{roleDetail.aiBrief.mainArgument}</p>
                                    </div>
                                    {roleDetail.aiBrief.criticalQuestions.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Critical questions</p>
                                        <ol className="space-y-1">
                                          {roleDetail.aiBrief.criticalQuestions.map((q, i) => (
                                            <li key={i} className="text-[12px] text-slate-700 leading-relaxed flex gap-1.5">
                                              <span className="text-slate-400 shrink-0 font-medium">{i + 1}.</span>
                                              {q}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                    {roleDetail.aiBrief.watchOut && (
                                      <div className="rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2">
                                        <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">Watch out</p>
                                        <p className="text-[12px] text-slate-700 leading-relaxed">{roleDetail.aiBrief.watchOut}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Subsections — collapsible */}
                        {section.subsections.length > 0 && (
                          <button
                            onClick={() => toggleSection(section.heading.id)}
                            className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {section.subsections.length} subsection{section.subsections.length > 1 ? 's' : ''}
                          </button>
                        )}
                        {isExpanded && (
                          <div className="mt-1.5 pl-3 space-y-1 border-l border-slate-100">
                            {section.subsections.map(sub => (
                              <p key={sub.id} className="text-[11px] text-slate-500 leading-snug">{sub.text}</p>
                            ))}
                          </div>
                        )}

                        {/* Knowledge card toggle */}
                        {(() => {
                          const kc = knowledgeCards.get(section.heading.id)
                          const isKcOpen = expandedKnowledge.has(section.heading.id)
                          return (
                            <>
                              <button
                                onClick={() => toggleKnowledgeCard(section)}
                                className="mt-2 flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
                              >
                                {kc?.loading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Lightbulb className="w-3 h-3" />
                                )}
                                {isKcOpen ? 'Hide knowledge card' : 'Section knowledge card'}
                                {isKcOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>

                              {isKcOpen && kc && !kc.loading && (
                                <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/40 overflow-hidden">
                                  {kc.error ? (
                                    <p className="px-3 py-2.5 text-[12px] text-rose-600">{kc.error}</p>
                                  ) : (
                                    <div className="px-3 py-2.5 space-y-2.5">
                                      {kc.mainArgument && (
                                        <div>
                                          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-0.5">Core argument</p>
                                          <p className="text-[12px] text-slate-700 leading-relaxed">{kc.mainArgument}</p>
                                        </div>
                                      )}
                                      {kc.keyTerms && kc.keyTerms.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1">Key terms</p>
                                          <div className="flex flex-wrap gap-1">
                                            {kc.keyTerms.slice(0, 6).map((term, i) => (
                                              <span key={i} className="px-1.5 py-0.5 rounded-md bg-violet-100 text-[10px] font-medium text-violet-700">
                                                {term}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {kc.criticalQuestions && kc.criticalQuestions.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1">Critical questions</p>
                                          <ol className="space-y-1">
                                            {kc.criticalQuestions.slice(0, 3).map((q, i) => (
                                              <li key={i} className="flex gap-1.5 text-[12px] text-slate-700 leading-relaxed">
                                                <span className="text-slate-400 font-medium shrink-0">{i + 1}.</span>
                                                {q}
                                              </li>
                                            ))}
                                          </ol>
                                        </div>
                                      )}
                                      {kc.confusionSignal && (
                                        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2">
                                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                          <p className="text-[11px] text-amber-700 leading-relaxed">{kc.confusionSignal}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      {!seededFromA10 && (
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-white">
          <button
            onClick={clearAllAssignments}
            disabled={assignments.length === 0}
            className="text-[11px] text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors font-medium"
          >
            Clear all
          </button>
          {completionPercentage === 100 && assignments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              All sections covered
            </span>
          )}
        </div>
      )}
    </div>
  )
}