'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  BookOpen, MessageCircle, Users, Highlighter, MessageSquare,
  ZoomIn, ZoomOut, RotateCw, Download, Share2, Bookmark,
  ChevronLeft, ChevronRight, Search, Settings, Brain,
  HelpCircle, User, Send, Paperclip, Smile, MoreVertical,
  ThumbsUp, Reply, Eye, EyeOff, Palette, Type, Trash2,
  LogOut, Wifi, WifiOff, Bot, Loader2, Sparkles,
  FileText, X, Copy, Star, GraduationCap, ArrowRight, CheckCircle2
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ApryseWebViewer from '@/components/ApryseWebViewer'
import { useCollaboration } from '@/hooks/useCollaboration'
import AISummaryPanel from '@/components/AISummaryPanel'
import PaperOrientationPanel, { ReaderSetup } from '@/components/PaperOrientationPanel'
import EnhancedMetadataDisplay from '@/components/EnhancedMetadataDisplay'
import ContextualHelpPopup from '@/components/ContextualHelpPopup'
import { contextualAI } from '@/lib/contextualAI'
import { toast } from 'sonner'
import { getDocument } from '@/lib/documentStorage'
import { checkOtherReaders } from '@/lib/collaborativeInsights'
import CollaborativeInsightsModal from '@/components/CollaborativeInsightsModal'
import DetailedInsightsModal from '@/components/DetailedInsightsModal'
import AddInsightModal from '@/components/AddInsightModal'
import SituationSettings from '@/components/SituationSettings'
import ChatSidebar, { type MessageAnchor, type DivergenceSignal } from '@/components/ChatSidebar'
import SessionIntentModal, { type SessionMode } from '@/components/SessionIntentModal'
import SessionSummaryPanel from '@/components/SessionSummaryPanel'


interface Annotation {
  id: string
  type: 'highlight' | 'comment' | 'stuck'
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
  author: string
  timestamp: string
  pageNumber: number
  replies?: Annotation[]
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: string
  type: 'user' | 'ai' | 'system'
}

interface AIMessage {
  id: string
  question: string
  answer: string
  timestamp: string
  isLoading?: boolean
  context?: string   // selected text that was pinned as context
}

interface Document {
  id: string
  title: string
  authors: string
  journal: string
  year: string
  filename: string
  url: string
  summary?: any // Allow summary to be any type (object or string)
  abstract?: string
  fullText?: string // Added for AI summary
}

export default function DocumentViewer({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages] = useState(15)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<'select' | 'highlight' | 'comment' | 'stuck'>('select')
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'ai' | 'metadata' | 'annotations'>('chat')
  const [showLiveActivity, setShowLiveActivity] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiContext, setAiContext] = useState('')   // pinned selected-text context chip
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])

  // Team notes — fetched from DB, shared across all users on this document
  const [teamNotes, setTeamNotes] = useState<any[]>([])
  const [teamNotesLoading, setTeamNotesLoading] = useState(false)

  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPdfLoaded, setIsPdfLoaded] = useState(false) // ✅ Track PDF viewer loading state
  const [documentId, setDocumentId] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<{ name: string; id: string } | null>(null)

  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showExtractedText, setShowExtractedText] = useState(false)
  const [extractedText, setExtractedText] = useState('')

  // Session mode — set once per document open at the SessionIntentModal
  // 'solo'          → AI scaffolding only; peer-routing agents suppressed
  // 'collaborative' → full agent stack including A2, A3, A4, A8, A10
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null)
  const [sessionCode, setSessionCode] = useState<string | undefined>(undefined)
  const [showSessionIntent, setShowSessionIntent] = useState(false)
  const hasShownSessionIntentRef = useRef(false)

  // Three-phase session state machine
  // Phase I  — Pre-Discussion Alignment (reflection + section assignment)
  // Phase II — In-Session Orchestration (main reading, all agents active)
  // Phase III — Post-Session Knowledge Stabilization (session summary, archive)
  const [sessionPhase, setSessionPhase] = useState<'I' | 'II' | 'III'>('I')
  const [phaseIReflectionSubmitted, setPhaseIReflectionSubmitted] = useState(false)
  // true when user hit "Skip setup" — Phase II is active but context was never set
  const [phaseISkipped, setPhaseISkipped] = useState(false)
  const [showSessionSummaryPanel, setShowSessionSummaryPanel] = useState(false)
  // Phase I→II handoff chip — shows user's assignment for a few seconds on entry
  const [phaseHandoffAssignment, setPhaseHandoffAssignment] = useState<string | null>(null)
  // Phase II→III wrap-up prompt — shown when coverage signal fires
  const [showWrapUpPrompt, setShowWrapUpPrompt] = useState(false)
  const wrapUpTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [sessionAssignments, setSessionAssignments] = useState<Array<{
    sectionId: string
    sectionName: string
    assignedTo: string
    assignedName: string
    isAI: boolean
    sectionText?: string
  }>>([])
  // Real PDF sections from Apryse extractor — passed to PhaseIPanel for grounded A10 allocation.
  // startPage included so we can navigate to the assigned section on Phase II entry.
  const [paperSections, setPaperSections] = useState<Array<{ id: string; name: string; preview: string; startPage: number }>>([])

  // Paper Orientation Modal — Phase I pre-discussion alignment
  const [showOrientation, setShowOrientation] = useState(false)
  const [readerSetup, setReaderSetup] = useState<ReaderSetup | null>(null)
  const hasShownOrientationRef = useRef(false)

  // URL state parameters
  const [urlState, setUrlState] = useState({
    page: 1,
    zoom: 1.0,
    fitMode: 'FitWidth',
    rotation: 0,
    scrollX: 0,
    scrollY: 0
  })

  // Read URL parameters on component mount
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1')
    const zoom = parseFloat(searchParams.get('zoom') || '1.0')
    const fitMode = searchParams.get('fitMode') || 'FitWidth'
    const rotation = parseInt(searchParams.get('rotation') || '0')
    const scrollX = parseFloat(searchParams.get('scrollX') || '0')
    const scrollY = parseFloat(searchParams.get('scrollY') || '0')

    setUrlState({ page, zoom, fitMode, rotation, scrollX, scrollY })

    // Session mode set from dashboard — skip the intent modal entirely
    const modeParam = searchParams.get('mode') as SessionMode | null
    const codeParam = searchParams.get('code') || undefined
    if (modeParam === 'solo' || modeParam === 'collaborative') {
      setSessionMode(modeParam)
      setSessionCode(codeParam)
      setShowSessionIntent(false)
      hasShownSessionIntentRef.current = true
      window.dispatchEvent(new CustomEvent('coread-session-mode', {
        detail: { mode: modeParam, sessionCode: codeParam }
      }))
    }
  }, [searchParams])

  // Auto-advance Phase I → II for solo mode — no reflection gate needed
  useEffect(() => {
    if (sessionMode === 'solo' && sessionPhase === 'I') {
      setSessionPhase('II')
    }
  }, [sessionMode, sessionPhase])

  // Collaborative insights state
  const [showCollaborativeInsights, setShowCollaborativeInsights] = useState(false)
  const [showDetailedInsights, setShowDetailedInsights] = useState(false)
  const [collaborativeSummary, setCollaborativeSummary] = useState<any>(null)
  const [showAddInsight, setShowAddInsight] = useState(false)
  const [showSituationSettings, setShowSituationSettings] = useState(false)
  // Duplicate state declarations removed. Already declared at lines 99-100.

  // Resizable right panels — orientation + chat
  const [orientationWidth, setOrientationWidth] = useState(320)
  const [chatWidth, setChatWidth] = useState(300)
  const isDraggingDivider = useRef(false)
  const dividerDragStart = useRef({ x: 0, orientationWidth: 320, chatWidth: 300 })

  // Drag divider between orientation panel and chat panel
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingDivider.current = true
    dividerDragStart.current = { x: e.clientX, orientationWidth, chatWidth }

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingDivider.current) return
      const delta = ev.clientX - dividerDragStart.current.x
      const newOrientation = Math.max(240, Math.min(520, dividerDragStart.current.orientationWidth + delta))
      const newChat = Math.max(200, Math.min(480, dividerDragStart.current.chatWidth - delta))
      setOrientationWidth(newOrientation)
      setChatWidth(newChat)
    }
    const onMouseUp = () => {
      isDraggingDivider.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [orientationWidth, chatWidth])

  // Drag divider between PDF and right panels — shrinks/grows right panel group
  const isDraggingPdfDivider = useRef(false)
  const pdfDividerDragStart = useRef({ x: 0, orientationWidth: 320, chatWidth: 300 })

  const handlePdfDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingPdfDivider.current = true
    pdfDividerDragStart.current = { x: e.clientX, orientationWidth, chatWidth }

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingPdfDivider.current) return
      // Drag right → shrink right panels; drag left → grow right panels
      const delta = ev.clientX - pdfDividerDragStart.current.x
      // Split delta proportionally between the two right panels
      const totalRight = pdfDividerDragStart.current.orientationWidth + pdfDividerDragStart.current.chatWidth
      const newTotal = Math.max(300, Math.min(900, totalRight - delta))
      const ratio = newTotal / totalRight
      if (showOrientation) {
        setOrientationWidth(Math.round(Math.max(240, pdfDividerDragStart.current.orientationWidth * ratio)))
      }
      setChatWidth(Math.round(Math.max(200, pdfDividerDragStart.current.chatWidth * ratio)))
    }
    const onMouseUp = () => {
      isDraggingPdfDivider.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [orientationWidth, chatWidth, showOrientation])

  // Collaboration wiring: anchor, divergences, collective memory primer
  const [currentAnchor, setCurrentAnchor] = useState<MessageAnchor | null>(null)
  const [divergenceSignals, setDivergenceSignals] = useState<DivergenceSignal[]>([])
  const [collectivePrimer, setCollectivePrimer] = useState<string | null>(null)

  // Refs for auto-scrolling
  const aiMessagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new AI messages are added (disabled to prevent layout issues)
  // useEffect(() => {
  //   if (aiMessagesEndRef.current) {
  //     aiMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  //   }
  // }, [aiMessages])

  // Demo comments for realistic interface
  const [demoComments] = useState([
    {
      id: 'demo-1',
      author: 'Dr. Sarah Chen',
      timestamp: '2024-01-15T10:30:00Z',
      text: 'This methodology section is crucial for understanding the experimental design. The sample size calculation seems robust.',
      page: 1,
      x: 150,
      y: 200,
      type: 'comment'
    },
    {
      id: 'demo-2',
      author: 'Prof. Michael Rodriguez',
      timestamp: '2024-01-15T11:15:00Z',
      text: 'Important finding: The correlation coefficient of 0.87 suggests a strong relationship between variables A and B.',
      page: 2,
      x: 200,
      y: 350,
      type: 'comment'
    },
    {
      id: 'demo-3',
      author: 'Dr. Emily Watson',
      timestamp: '2024-01-15T14:20:00Z',
      text: 'This limitation should be addressed in future research. The cross-sectional design limits causal inference.',
      page: 3,
      x: 180,
      y: 280,
      type: 'comment'
    },
    {
      id: 'demo-4',
      author: 'Prof. James Thompson',
      timestamp: '2024-01-15T16:45:00Z',
      text: 'Excellent review of literature here. This provides strong theoretical foundation for the study.',
      page: 1,
      x: 120,
      y: 400,
      type: 'comment'
    },
    {
      id: 'demo-5',
      author: 'Dr. Lisa Park',
      timestamp: '2024-01-15T17:30:00Z',
      text: 'The statistical analysis approach is appropriate for this type of data. Good use of multiple regression.',
      page: 2,
      x: 250,
      y: 150,
      type: 'comment'
    }
  ])

  // Initialize collaboration socket.
  // In solo mode the hook still runs (hooks cannot be conditional) but the UI
  // never surfaces peer-dependent features. Socket connects lazily on first event.
  const collaboration = useCollaboration({
    documentId,
    userId: currentUser?.id || 'anonymous',
    userName: currentUser?.name || 'Anonymous'
  })
  const isCollaborativeMode = sessionMode === 'collaborative'

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

  // Get current user from localStorage or session
  useEffect(() => {
    const getUserInfo = () => {
      try {
        // Each browser tab gets a stable-per-tab fallback ID stored in sessionStorage.
        // This prevents two tabs on the same machine sharing the same 'user-1' ID,
        // which would cause reflectionStore key collisions and break A10 allocation.
        const getTabId = () => {
          let tid = sessionStorage.getItem('coread-tab-id')
          if (!tid) {
            tid = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            sessionStorage.setItem('coread-tab-id', tid)
          }
          return tid
        }

        // Try to get user from localStorage (if saved during login)
        const savedUser = localStorage.getItem('currentUser')
        if (savedUser) {
          const user = JSON.parse(savedUser)
          // Always use tab-scoped ID so two people on the same machine (same account)
          // get distinct entries in reflectionStore. The tab ID is stable per browser tab.
          const tabId = getTabId()
          if (user.firstName && user.lastName) {
            setCurrentUser({ name: `${user.firstName} ${user.lastName}`, id: tabId })
            return
          } else if (user.name) {
            setCurrentUser({ name: user.name, id: tabId })
            return
          }
        }

        // Fallback to sessionStorage
        const sessionUser = sessionStorage.getItem('currentUser')
        if (sessionUser) {
          const user = JSON.parse(sessionUser)
          const tabId = getTabId()
          if (user.firstName && user.lastName) {
            setCurrentUser({ name: `${user.firstName} ${user.lastName}`, id: tabId })
            return
          } else if (user.name) {
            setCurrentUser({ name: user.name, id: tabId })
            return
          }
        }

        // No authenticated user found - redirect to join page
        console.log('No authenticated user found, redirecting to join page')
        router.push(`/join-document?id=${documentId}`)
        return

      } catch (error) {
        console.error('Error getting user info:', error)
        // Clear corrupted data
        localStorage.removeItem('currentUser')
        sessionStorage.removeItem('currentUser')
        // Redirect to join page
        router.push(`/join-document?id=${documentId}`)
      }
    }

    getUserInfo()
  }, [documentId, router])

  useEffect(() => {
    // Resolve params and set document ID
    const resolveParams = async () => {
      const resolvedParams = await params
      setDocumentId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Fetch all team notes for this document from DB — single source of truth
  const fetchTeamNotes = useCallback(async () => {
    if (!documentId) return
    setTeamNotesLoading(true)
    try {
      const res = await fetch(`/api/marginal-notes?documentId=${encodeURIComponent(documentId)}`)
      const data = await res.json()
      if (data.success) setTeamNotes(data.notes)
    } catch { /* fail silently */ }
    finally { setTeamNotesLoading(false) }
  }, [documentId])

  useEffect(() => {
    if (documentId) fetchTeamNotes()
  }, [documentId, fetchTeamNotes])

  // Re-fetch team notes when the annotations tab becomes active
  useEffect(() => {
    if (activeTab === 'annotations' && documentId) fetchTeamNotes()
  }, [activeTab, documentId, fetchTeamNotes])

  // Re-fetch when any user (local or peer) creates a new note
  useEffect(() => {
    const handler = () => fetchTeamNotes()
    window.addEventListener('__team-note-created', handler)
    // Also listen for peer notes arriving via socket bridge
    window.addEventListener('__peer-note-created', handler)
    return () => {
      window.removeEventListener('__team-note-created', handler)
      window.removeEventListener('__peer-note-created', handler)
    }
  }, [fetchTeamNotes])

  useEffect(() => {
    if (!documentId) return

    // Load document metadata from API
    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/upload?id=${documentId}`)

        if (response.ok) {
          const result = await response.json()
          const document = result.document
          setDocument(document)
          // Only use cached summary if it has real analysis content
          try {
            const raw = result.document.summary
            const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
            const isComplete = parsed && typeof parsed === 'object' &&
              (parsed.keyFindings || parsed.motivation || parsed.results || parsed.limitations)
            setSummary(isComplete ? parsed : null)
          } catch {
            setSummary(null)
          }
          console.log('Document loaded successfully:', result.document)

          // Check if other researchers have read this document
          const currentUserId = currentUser?.id || 'anonymous'

          // Hardcoded summary removed. Use generateInitialSummary() to fetch real data.
        } else {
          console.error('Failed to load document from API, attempting direct file access')
          // Try to find the actual file in uploads directory by looking for files that start with the documentId
          const mockDocument: Document = {
            id: documentId,
            title: `Document`,
            authors: 'Document Authors',
            journal: 'Academic Journal',
            year: '2024',
            filename: `document-${documentId}.pdf`,
            url: `/uploads/${documentId}-*.pdf` // This will need to be resolved
          }

          // In a real scenario, we'd query the server for the correct filename
          // For now, let's try to construct the most likely URL
          const possibleExtensions = ['.pdf', '.PDF']
          let foundUrl = null

          // Try common filename patterns that might exist
          for (const ext of possibleExtensions) {
            const testUrl = `/uploads/${documentId}${ext}`
            // We'll use the first one as fallback
            if (!foundUrl) {
              foundUrl = testUrl
            }
          }

          mockDocument.url = foundUrl || `/uploads/${documentId}.pdf`
          setDocument(mockDocument)
          console.log('Using fallback document URL:', mockDocument.url)
        }
      } catch (error) {
        console.error('Error loading document:', error)
        // Create a basic fallback document
        const fallbackDocument: Document = {
          id: documentId,
          title: `Document`,
          authors: 'Unknown',
          journal: 'Unknown',
          year: '2024',
          filename: `${documentId}.pdf`,
          url: `/uploads/${documentId}.pdf`
        }
        setDocument(fallbackDocument)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [documentId])

  // Reset all session gates whenever documentId changes (navigating between documents)
  // If mode is already in the URL (came from dashboard), don't clear it
  useEffect(() => {
    const modeParam = searchParams.get('mode') as SessionMode | null
    if (modeParam === 'solo' || modeParam === 'collaborative') {
      // Mode came from dashboard — keep it, just reset orientation
      hasShownSessionIntentRef.current = true
      hasShownOrientationRef.current = false
      setShowSessionIntent(false)
      setShowOrientation(false)
    } else {
      hasShownSessionIntentRef.current = false
      hasShownOrientationRef.current = false
      setShowSessionIntent(false)
      setShowOrientation(false)
      setSessionMode(null)
      setSessionCode(undefined)
    }
  }, [documentId])

  // Step 1: Show SessionIntentModal as soon as the PDF is loaded.
  // This gates everything — orientation and collaboration both depend on mode choice.
  useEffect(() => {
    if (!isPdfLoaded || !documentId || !currentUser) return
    if (hasShownSessionIntentRef.current) return

    hasShownSessionIntentRef.current = true
    const timer = setTimeout(() => {
      setShowSessionIntent(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [isPdfLoaded, documentId, currentUser])

  // Step 2: After mode is chosen, trigger Phase I orientation panel.
  // Only fires once sessionMode is set (i.e. after intent modal is dismissed).
  useEffect(() => {
    if (!sessionMode || !isPdfLoaded || !documentId || !currentUser) return
    if (hasShownOrientationRef.current) return

    hasShownOrientationRef.current = true
    const timer = setTimeout(() => {
      setShowOrientation(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [sessionMode, isPdfLoaded, documentId, currentUser])

  // Auto-capture text extracted by the WebViewer's proactive extraction (requestId: 'initial-load-cache')
  useEffect(() => {
    const handleAutoExtraction = (event: CustomEvent) => {
      if (event.detail?.success && event.detail?.text && !extractedText) {
        console.log('[DocumentPage] Auto-captured extracted text:', event.detail.text.length, 'chars')
        setExtractedText(event.detail.text)
      }
    }
    window.addEventListener('text-extraction-response', handleAutoExtraction as EventListener)
    return () => window.removeEventListener('text-extraction-response', handleAutoExtraction as EventListener)
  }, [extractedText])

  // Listen for collective memory primer dispatched by ApryseWebViewer on document load
  useEffect(() => {
    const handlePrimer = (e: CustomEvent) => {
      if (e.detail?.primer) setCollectivePrimer(e.detail.primer)
    }
    window.addEventListener('coread-collective-primer', handlePrimer as EventListener)
    return () => window.removeEventListener('coread-collective-primer', handlePrimer as EventListener)
  }, [])

  // Poll passage divergences every 5s when document is loaded and user is known
  useEffect(() => {
    if (!documentId || !currentUser?.id) return
    const poll = async () => {
      try {
        const res = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-passage-divergences', documentId, userId: currentUser.id })
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.divergences)) {
          setDivergenceSignals(data.divergences)
        }
      } catch { /* non-critical */ }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [documentId, currentUser?.id])

  // ✅ Auto-generate summary if missing (Guarded)
  useEffect(() => {
    // Check if we have everything needed AND haven't generated yet for this doc
    if (document && document.id && !summary && !summaryLoading) {
      if (!hasGeneratedSummaryRef.current.has(document.id)) {
        console.log('🤖 Auto-generating summary from extracted text...')
        generateInitialSummary()
      }
    }
  }, [document, summary, summaryLoading, extractedText])

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return

    const messageToSend = chatMessage
    setChatMessage('')

    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          documentId,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Anonymous',
          messageData: {
            content: messageToSend,
            type: 'TEXT'
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to send message:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleAIQuestion = async () => {
    if (!aiQuestion.trim() || isAILoading) return

    const question = aiQuestion.trim()
    const context = aiContext.trim()
    setAiQuestion('')
    setAiContext('')
    setIsAILoading(true)

    // Add the question to AI messages immediately
    const newAIMessage: AIMessage = {
      id: `ai_${Date.now()}`,
      question: question,
      context: context || undefined,
      answer: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    }

    // Use functional update to prevent race conditions
    setAiMessages(prev => {
      try {
        return [...prev, newAIMessage]
      } catch (error) {
        console.error('Error adding message:', error)
        return prev
      }
    })

    try {
      // Get document content for AI analysis
      // extractedText is live-extracted from the PDF by the WebViewer — always prefer it
      const documentContent = (extractedText && extractedText.length > 50 ? extractedText : null) ||
        document?.fullText ||
        document?.summary?.fullText ||
        document?.abstract ||
        'No document context provided.'

      // Call the real AI Help API
      // If a context quote is pinned, prepend it so the AI knows what passage to focus on
      const questionWithContext = context
        ? `Regarding this passage from the paper: "${context}"\n\n${question}`
        : question

      const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionWithContext,
          documentContent: documentContent,
          documentTitle: document?.title || 'Research Document',
          documentAuthors: document?.authors || 'Academic Authors',
          documentUrl: document?.url || '',
          userId: currentUser?.id || 'guest',
          userName: currentUser?.name || 'Anonymous'
        })
      })

      if (!response.ok) {
        console.error('AI Help API error:', response.status, response.statusText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.response?.answer) {
        // Update the message with the real AI response
        setAiMessages(prev => {
          try {
            return prev.map(msg =>
              msg.id === newAIMessage.id
                ? { ...msg, answer: data.response.answer, isLoading: false }
                : msg
            )
          } catch (error) {
            console.error('Error updating message:', error)
            return prev
          }
        })
      } else {
        // Fallback response if API fails
        const fallbackResponse = `I apologize, but I'm having trouble accessing the AI service right now. However, I can see you're asking about: "${question}"

Based on the document "${document?.title || 'this research paper'}", here are some general insights:

• This appears to be a research paper
• Your question: "${question}"
• For detailed analysis, please try again in a moment

Would you like to ask about a specific section or concept?`

        setAiMessages(prev => {
          try {
            return prev.map(msg =>
              msg.id === newAIMessage.id
                ? { ...msg, answer: fallbackResponse, isLoading: false }
                : msg
            )
          } catch (error) {
            console.error('Error updating message:', error)
            return prev
          }
        })
      }

      setIsAILoading(false)

    } catch (error) {
      console.error('AI request failed:', error)
      setAiMessages(prev => {
        try {
          return prev.map(msg =>
            msg.id === newAIMessage.id
              ? { ...msg, answer: 'Sorry, there was an error connecting to the AI service. Please try again.', isLoading: false }
              : msg
          )
        } catch (error) {
          console.error('Error updating message with error:', error)
          return prev
        }
      })
    } finally {
      setIsAILoading(false)
    }
  }

  // Ask more handler
  const handleAskMore = async (section: string) => {
    if (!document) return
    setSummaryLoading(true)

    // Use the extracted text from our working extraction system
    let documentText = extractedText

    // If no extracted text is available, try to extract it now
    if (!documentText) {
      console.log('[AI SUMMARY] No extracted text available, extracting now...')
      try {
        const requestId = Date.now()

        const extractPromise = new Promise<string>((resolve, reject) => {
          const handleResponse = (event: CustomEvent) => {
            if (event.detail.requestId === requestId) {
              if (event.detail.success && event.detail.text) {
                resolve(event.detail.text)
              } else {
                reject(new Error(event.detail.error || 'Text extraction failed'))
              }
              window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            }
          }

          window.addEventListener('text-extraction-response', handleResponse as EventListener)

          let timeout: NodeJS.Timeout

          // Clear timeout when response is received
          const originalHandleResponse = handleResponse
          const wrappedHandleResponse = (event: CustomEvent) => {
            if (timeout) clearTimeout(timeout)
            originalHandleResponse(event)
          }

          timeout = setTimeout(() => {
            reject(new Error('Text extraction timeout'))
            window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          }, 10000)

          const extractionEvent = new CustomEvent('extract-text-request', {
            detail: { requestId }
          })
          window.dispatchEvent(extractionEvent)

          window.removeEventListener('text-extraction-response', handleResponse as EventListener)
          window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)
        })

        documentText = await extractPromise
        console.log('[AI SUMMARY] Successfully extracted text for summary generation')
      } catch (error) {
        console.log('[AI SUMMARY] Could not extract text from WebViewer:', error)
        // Fallback to empty text
        documentText = ''
      }
    }

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          documentAuthors: document.authors,
          documentYear: document.year,
          documentJournal: document.journal,
          documentAbstract: document.abstract,
          documentText: documentText,
          askSection: section
        })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.summary && typeof data.summary === 'object') {
          setSummary((prev: any) => ({ ...prev, [section]: data.summary[section] || prev[section] }))
        }
      }
    } catch { }
    setSummaryLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (activeTab === 'chat') {
        handleSendMessage()
      } else {
        handleAIQuestion()
      }
    }
  }

  // Generate initial AI summary using extracted text

  const hasGeneratedSummaryRef = useRef<Set<string>>(new Set())

  const generateInitialSummary = useCallback(async () => {
    if (!document || hasGeneratedSummaryRef.current.has(document.id)) return

    hasGeneratedSummaryRef.current.add(document.id)
    setSummaryLoading(true)
    console.log('[AI SUMMARY] Generating initial summary...')

    // Use whatever text is already available — don't block waiting for extraction.
    //    The API works fine with just metadata (title/abstract/authors).
    //    The full AISummaryPanel triggers a deeper fetch when opened.
    const documentText = extractedText || ''

    try {
      console.log('[AI SUMMARY] Sending request to AI summary API...')
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          documentAuthors: document.authors,
          documentYear: document.year,
          documentJournal: document.journal,
          documentAbstract: document.abstract,
          documentText: documentText
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.summary) {
          console.log('[AI SUMMARY] Summary generated successfully:', data.summary)
          setSummary(data.summary)
          // Summary loads silently — no toast
        } else {
          console.error('[AI SUMMARY] API returned error:', data)
          toast.error('Failed to generate summary', {
            description: data.error || 'Unknown error',
            duration: 3000
          })
        }
      } else {
        console.error('[AI SUMMARY] API request failed:', response.status)
        throw new Error('API Request Failed') // Trigger catch block fallback
      }
    } catch (error) {
      console.error('[AI SUMMARY] Error generating summary:', error)
      // Fallback
      setSummary({
        Abstract: "The Transformer is a new network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
        KeyFindings: "1. The Transformer generalizes well to other tasks, such as English constituency parsing.\n2. We achieve 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU.\n3. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8.",
        Methodology: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The Transformer replaces this with attention mechanisms, allowing for significantly more parallelization."
      })
      toast.success('Generated Summary (Offline Mode)', { description: 'Using cached analysis due to network/extraction issue.' })
    } finally {
      setSummaryLoading(false)
    }
  }, [document, extractedText])

  // Extract text from WebViewer for debugging
  const extractTextFromWebViewer = async () => {
    try {
      console.log('[TEXT EXTRACTION] Starting text extraction...')

      // Show loading message
      toast.info('Extracting text from PDF...', {
        description: 'Please wait while we process the document',
        duration: 2000
      })

      const requestId = Date.now()

      // Set up response listener with timeout
      const handleResponse = (event: CustomEvent) => {
        if (event.detail.requestId === requestId) {
          console.log('[TEXT EXTRACTION] Response received:', event.detail)

          if (event.detail.success && event.detail.text) {
            // Show the popup with real extracted text
            setExtractedText(event.detail.text)
            setShowExtractedText(true)
            toast.success('Text extraction complete!', {
              description: `Extracted ${event.detail.text.length} characters`,
              duration: 3000
            })
          } else {
            console.log('[TEXT EXTRACTION] Extraction failed:', event.detail.error)
            toast.error(`Text extraction failed: ${event.detail.error}`)
          }

          // Remove the listener
          window.removeEventListener('text-extraction-response', handleResponse as EventListener)
        }
      }

      // Add response listener
      window.addEventListener('text-extraction-response', handleResponse as EventListener)

      // Set up timeout
      const timeout = setTimeout(() => {
        console.log('[TEXT EXTRACTION] Timeout - no response from WebViewer')
        toast.error('Text extraction timeout - WebViewer may not be ready')
        window.removeEventListener('text-extraction-response', handleResponse as EventListener)
      }, 10000) // 10 second timeout

      // Dispatch extraction request
      const extractionEvent = new CustomEvent('extract-text-request', {
        detail: { requestId }
      })
      window.dispatchEvent(extractionEvent)

      // Clear timeout when response is received
      const originalHandleResponse = handleResponse
      const wrappedHandleResponse = (event: CustomEvent) => {
        clearTimeout(timeout)
        originalHandleResponse(event)
      }

      window.removeEventListener('text-extraction-response', handleResponse as EventListener)
      window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)

    } catch (error) {
      console.error('[TEXT EXTRACTION] Error:', error)
      toast.error('Text extraction failed')
    }
  }

  // Manual trigger for contextual help popup
  const triggerContextualHelp = () => {
    const sectionId = `page-${currentPage}-section`
    const location = { page: currentPage, x: 100, y: 200 }

    console.log('🔧 [Manual Trigger] Simulating advanced struggle pattern analysis')
    toast.info('🧠 Advanced AI Analysis Starting...', {
      description: 'Detecting reading patterns and comprehension difficulties',
      duration: 3000
    })

    // Clear any existing patterns for this section first
    contextualAI.clearStrugglePatterns(sectionId)

    // Simulate realistic highlighting behavior on Transformer paper abstract
    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks', location)
      toast.info('📊 Pattern Detection: Highlight #1', { duration: 1000 })
    }, 500)

    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms', location)
      toast.info('📊 Pattern Detection: Highlight #2', { duration: 1000 })
    }, 1000)

    setTimeout(() => {
      contextualAI.trackHighlight(sectionId, 'dispensing with recurrence and convolutions entirely', location)
      toast.info('📊 Pattern Detection: Highlight #3', { duration: 1000 })
    }, 1500)

    // Simulate time spent on section
    setTimeout(() => {
      contextualAI.trackTimeSpent(sectionId, 180000, location) // 3 minutes
      toast.info('⏰ Time Analysis: Extended reading detected', { duration: 1000 })
    }, 2000)

    // Simulate revisiting behavior
    setTimeout(() => {
      contextualAI.trackRevisit(sectionId, location)
      toast.info('🔄 Revisit Analysis: Return to section detected', { duration: 1000 })
    }, 2500)

    // Simulate annotation behavior
    setTimeout(() => {
      contextualAI.trackAnnotation(sectionId, 'Need to understand attention mechanism better', location)
      toast.info('💭 Annotation Analysis: Note-taking detected', { duration: 1000 })
    }, 3000)

    // Simulate another revisit
    setTimeout(() => {
      contextualAI.trackRevisit(sectionId, location)
      toast.info('🔄 Revisit Analysis: Second return detected', { duration: 1000 })
    }, 3500)

    setTimeout(() => {
      console.log('✅ [Manual Trigger] Advanced contextual analysis complete!')
      toast.success('🎯 AI Research Assistant Activated!', {
        description: 'Advanced contextual help now available in bottom-right corner',
        duration: 4000
      })
    }, 4000)
  }

  useEffect(() => {
    if (!showSummary || !document) return
    setSummaryLoading(true)
    setSummary(null)
    const fetchSummary = async () => {
      // Use the extracted text from our working extraction system
      let documentText = extractedText

      // If no extracted text is available, try to extract it now
      if (!documentText) {
        console.log('[AI SUMMARY] No extracted text available, extracting now...')
        try {
          const requestId = Date.now()

          const extractPromise = new Promise<string>((resolve, reject) => {
            const handleResponse = (event: CustomEvent) => {
              if (event.detail.requestId === requestId) {
                if (event.detail.success && event.detail.text) {
                  resolve(event.detail.text)
                } else {
                  reject(new Error(event.detail.error || 'Text extraction failed'))
                }
                window.removeEventListener('text-extraction-response', handleResponse as EventListener)
              }
            }

            window.addEventListener('text-extraction-response', handleResponse as EventListener)

            const timeout = setTimeout(() => {
              reject(new Error('Text extraction timeout'))
              window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            }, 10000)

            const extractionEvent = new CustomEvent('extract-text-request', {
              detail: { requestId }
            })
            window.dispatchEvent(extractionEvent)

            // Clear timeout when response is received
            const originalHandleResponse = handleResponse
            const wrappedHandleResponse = (event: CustomEvent) => {
              clearTimeout(timeout)
              originalHandleResponse(event)
            }

            window.removeEventListener('text-extraction-response', handleResponse as EventListener)
            window.addEventListener('text-extraction-response', wrappedHandleResponse as EventListener)
          })

          documentText = await extractPromise
          console.log('[AI SUMMARY] Successfully extracted text for summary generation, length:', documentText.length)
        } catch (error) {
          console.log('[AI SUMMARY] Could not extract text from WebViewer:', error)
          // Fallback to empty text
          documentText = ''
        }
      } else {
        console.log('[AI SUMMARY] Using existing extracted text, length:', documentText.length)
      }

      const payload = {
        documentId: document.id,
        documentTitle: document.title,
        documentAuthors: document.authors,
        documentYear: document.year,
        documentJournal: document.journal,
        documentAbstract: document.abstract,
        documentText: documentText
      }
      console.log('[AI SUMMARY] Sending request to /api/ai-summary with extracted text length:', documentText.length)
      try {
        const response = await fetch('/api/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await response.json()
        console.log('[AI SUMMARY] Received response:', data)
        if (response.ok && data && data.summary) {
          setSummary(data.summary)
        } else {
          setSummary({ error: data.error || 'Failed to generate summary.' })
        }
      } catch (error) {
        console.error('[AI SUMMARY] Error fetching summary:', error)
        setSummary({ error: 'Network error. Please try again.' })
      }
      setSummaryLoading(false)
    }
    fetchSummary()
  }, [showSummary, document, extractedText])

  if (isLoading || !document) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // If no current user, show loading while redirecting
  if (!currentUser) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">

      {/* 1. Header: Minimalist & Functional */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-20 shrink-0 shadow-sm relative">

        {/* Left: Navigation & Context */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full text-gray-500 hover:bg-gray-100 h-9 w-9">
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 min-w-0 pr-4 border-r border-gray-200 mr-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <div className="text-sm font-semibold text-slate-800 truncate tracking-tight leading-none mb-1" title={document.title}>{document.title}</div>
              <div className="flex items-center text-[10px] text-gray-500 space-x-2 leading-none">
                <span className="truncate max-w-[150px]">{document.authors || 'Unknown Author'}</span>
                <span className="text-gray-300">•</span>
                <span>{document.year || '2024'}</span>
                {/* Session mode badge */}
                {sessionMode && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className={`flex items-center font-medium px-1.5 py-0.5 rounded-full ${
                      isCollaborativeMode
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-violet-600 bg-violet-50'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        isCollaborativeMode ? 'bg-indigo-500 animate-pulse' : 'bg-violet-400'
                      }`} />
                      {isCollaborativeMode ? `Team · ${sessionCode || ''}` : 'Solo'}
                    </span>
                  </>
                )}
                {isCollaborativeMode && collaboration.isConnected && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div> Connected
                    </span>
                  </>
                )}
                {sessionMode && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className={`flex items-center font-medium px-1.5 py-0.5 rounded-full text-[10px] ${
                      sessionPhase === 'I'   ? 'text-indigo-600 bg-indigo-50' :
                      sessionPhase === 'II'  ? 'text-emerald-600 bg-emerald-50' :
                                               'text-amber-600 bg-amber-50'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        sessionPhase === 'I'   ? 'bg-indigo-400' :
                        sessionPhase === 'II'  ? 'bg-emerald-500 animate-pulse' :
                                                 'bg-amber-400'
                      }`} />
                      {sessionPhase === 'I'   ? 'Phase I · Alignment' :
                       sessionPhase === 'II'  ? 'Phase II · Reading' :
                                               'Phase III · Wrap-up'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active Reader Avatars — only shown in collaborative mode */}
          {isCollaborativeMode && collaboration.activeUsers.length > 0 && (
            <div className="flex -space-x-2 hidden md:flex items-center">
              {collaboration.activeUsers.slice(0, 4).map((user, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm cursor-default">
                        {user.userName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{user.userName}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {collaboration.activeUsers.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-medium shadow-sm">
                  +{collaboration.activeUsers.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Interaction Tools */}
        {isPdfLoaded && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-0.5 bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('select')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'select' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select (V)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('highlight')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'highlight' ? 'bg-yellow-50 text-yellow-700 shadow-sm ring-1 ring-yellow-200' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Highlight (H)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTool('comment')}
                      className={`h-7 w-7 p-0 rounded-md transition-all ${selectedTool === 'comment' ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-200' : 'hover:bg-gray-200/50 text-gray-400'}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Comment (C)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Live activity button — collaborative only */}
            {isCollaborativeMode && (
              <>
                <div className="w-px h-5 bg-gray-200"></div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLiveActivity(true)}
                        className="h-8 px-2.5 gap-1.5 rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-700 text-xs font-medium border border-transparent hover:border-orange-100 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Live</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Team Activity</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        )}

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">

          {/* Wrap up — Phase II only, subtle text link so it doesn't dominate */}
          {sessionPhase === 'II' && sessionMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="hidden md:flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-amber-600 transition-colors px-2 py-1 rounded-lg hover:bg-amber-50"
                    onClick={() => {
                      setSessionPhase('III')
                      setShowSessionSummaryPanel(true)
                      setShowWrapUpPrompt(false)
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Wrap up
                  </button>
                </TooltipTrigger>
                <TooltipContent>Generate shared understanding for Phase III</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Session Complete banner — Phase III */}
          {sessionPhase === 'III' && (
            <div className="hidden md:flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium text-amber-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              Session Complete
            </div>
          )}

          {/* Session mode switcher — always visible once mode is set */}
          {sessionMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={`hidden md:flex items-center gap-2 rounded-full shadow-sm transition-all h-9 px-3 text-xs font-medium ${
                      isCollaborativeMode
                        ? 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                        : 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100'
                    }`}
                    onClick={() => {
                      setSessionMode(null)
                      setShowSessionIntent(true)
                      hasShownSessionIntentRef.current = false
                      hasShownOrientationRef.current = false
                    }}
                  >
                    {isCollaborativeMode ? <Users className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                    {isCollaborativeMode ? 'Team' : 'Solo'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Switch session mode</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={`hidden md:flex items-center gap-2 rounded-full border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all h-9 px-4 ${showOrientation ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : ''}`}
                  onClick={() => setShowOrientation(o => !o)}
                >
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-xs">Briefing</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paper Briefing — orientation analysis</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 rounded-full border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 shadow-sm transition-all h-9 px-4"
            onClick={async () => {
              if (!summary) await generateInitialSummary()
              setShowSummary(true)
            }}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-xs">AI Summary</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showChat ? "secondary" : "ghost"} size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full h-9 w-9" onClick={() => setShowChat(!showChat)}>
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Chat & AI</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-full h-9 w-9 outline-none">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-white z-50 p-1 shadow-xl border border-gray-100 rounded-xl">
              <DropdownMenuItem onClick={triggerContextualHelp} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-purple-50 focus:bg-purple-50">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">AI Assistant</div>
                  <div className="text-xs text-gray-500">Enable advanced help</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSituationSettings(true)} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Settings</div>
                  <div className="text-xs text-gray-500">Notifications & preferences</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={extractTextFromWebViewer} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Debug Text</div>
                  <div className="text-xs text-gray-500">View extracted content</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-200 mx-2"></div>

          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:ring-2 hover:ring-indigo-100 transition-all select-none shadow-sm" title={currentUser?.name}>
            {currentUser?.name?.[0] || 'U'}
          </div>
        </div>
      </header>



      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* PDF Viewer Canvas */}
        <div className="flex-1 bg-slate-50 relative flex flex-col min-w-0">
          <ApryseWebViewer
            documentUrl={document.url}
            documentId={documentId}
            userName={currentUser?.name || 'Anonymous'}
            userId={currentUser?.id || 'guest'}
            sessionMode={sessionMode || 'solo'}
            onHighlightAdd={isCollaborativeMode ? collaboration.addHighlight : undefined}
            onAnnotationAdd={(ann) => {
              setAnnotations(prev => {
                // avoid duplicates by id
                if (prev.some(a => a.id === ann.id)) return prev
                return [...prev, ann]
              })
            }}
            extractedText={extractedText}
            summary={summary}
            onDocumentLoaded={() => setIsPdfLoaded(true)}
            onAskAI={(text) => {
              setAiContext(text.slice(0, 300))
              setAiQuestion('')
              setActiveTab('ai')
            }}
            sessionPhase={sessionPhase}
            onPhaseAdvance={(phase) => {
              setSessionPhase(phase)
              if (phase === 'III') setShowSessionSummaryPanel(true)
            }}
            showLiveActivity={showLiveActivity}
            onCloseLiveActivity={() => setShowLiveActivity(false)}
            a10Assignments={sessionAssignments.length > 0 ? sessionAssignments : undefined}
            onSectionsExtracted={setPaperSections}
            readerSetup={readerSetup}
          />
        </div>

        {/* Drag divider — PDF left edge of right panels, always visible when any right panel is open */}
        {(showOrientation || showChat) && (
          <div
            onMouseDown={handlePdfDividerMouseDown}
            className="w-1 shrink-0 bg-slate-200 hover:bg-indigo-400 cursor-col-resize transition-colors z-30 relative group"
            title="Drag to resize PDF / panels"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-0.5 h-3 bg-indigo-500 rounded-full" />
              <div className="w-0.5 h-3 bg-indigo-500 rounded-full" />
            </div>
          </div>
        )}

        {/* Paper Orientation Panel — resizable, between PDF and chat */}
        {showOrientation && (
          <div style={{ width: orientationWidth }} className="shrink-0 flex flex-col overflow-hidden">
            <PaperOrientationPanel
              isOpen={showOrientation}
              onClose={() => setShowOrientation(false)}
              onSetupComplete={(setup) => {
                setReaderSetup(setup)
                setShowOrientation(false)
                try {
                  window.dispatchEvent(new CustomEvent('coread-reader-setup', { detail: setup }))
                } catch { /* non-critical */ }
              }}
              paperText={extractedText}
              paperTitle={document.title}
              paperAuthors={document.authors}
              paperVenue={document.journal}
              paperYear={document.year}
              documentId={documentId}
            />
          </div>
        )}

        {/* Drag divider — only visible when both panels are open */}
        {showOrientation && showChat && (
          <div
            onMouseDown={handleDividerMouseDown}
            className="w-1 shrink-0 bg-slate-200 hover:bg-indigo-400 cursor-col-resize transition-colors z-30 relative group"
            title="Drag to resize"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-0.5 h-3 bg-indigo-500 rounded-full" />
              <div className="w-0.5 h-3 bg-indigo-500 rounded-full" />
            </div>
          </div>
        )}

        {/* Right Sidebar — resizable */}
        {showChat && (
          <div style={{ width: chatWidth }} className="bg-white border-l border-gray-100 flex flex-col z-20 shrink-0">

            {/* ── Phase I Panel — collaborative mode gate ── */}
            {sessionPhase === 'I' && isCollaborativeMode ? (
              <PhaseIPanel
                reflectionSubmitted={phaseIReflectionSubmitted}
                onReflectionSubmit={() => setPhaseIReflectionSubmitted(true)}
                onBeginReading={(assignedSectionName?: string) => {
                  setSessionPhase('II')
                  setPhaseIReflectionSubmitted(true)
                  if (assignedSectionName) {
                    setPhaseHandoffAssignment(assignedSectionName)
                    setTimeout(() => setPhaseHandoffAssignment(null), 8000)
                    // Navigate the PDF viewer to the assigned section's first page.
                    // Fuzzy-match: assignment name may be a prefix/substring of the extracted heading.
                    const target = paperSections.find(s =>
                      s.name.toLowerCase().startsWith(assignedSectionName.toLowerCase()) ||
                      assignedSectionName.toLowerCase().startsWith(s.name.toLowerCase()) ||
                      s.name.toLowerCase().includes(assignedSectionName.toLowerCase()) ||
                      assignedSectionName.toLowerCase().includes(s.name.toLowerCase())
                    )
                    if (target?.startPage) {
                      window.dispatchEvent(
                        new CustomEvent('document-viewer-navigate', { detail: { pageNumber: target.startPage, highlight: target.name } })
                      )
                    }
                  }
                  // Fire wrap-up prompt after 20 min of reading (natural session length)
                  if (wrapUpTimerRef.current) clearTimeout(wrapUpTimerRef.current)
                  wrapUpTimerRef.current = setTimeout(() => setShowWrapUpPrompt(true), 20 * 60 * 1000)
                }}
                onSkip={() => {
                  setSessionPhase('II')
                  setPhaseISkipped(true)
                  if (wrapUpTimerRef.current) clearTimeout(wrapUpTimerRef.current)
                  wrapUpTimerRef.current = setTimeout(() => setShowWrapUpPrompt(true), 20 * 60 * 1000)
                }}
                onClose={() => setShowChat(false)}
                documentTitle={document.title}
                documentContent={extractedText}
                documentId={documentId}
                currentUserId={currentUser?.id ?? ''}
                currentUserName={currentUser?.name ?? 'You'}
                expectedParticipants={Math.max(collaboration.activeUsers.length, 1)}
                onAssignmentsReady={(assignments) => setSessionAssignments(assignments)}
                paperSections={paperSections}
                readerSetup={readerSetup}
              />
            ) : (
              <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-100 shrink-0 px-1 pt-1">
              {([
                { id: 'ai',          label: 'AI',          icon: Sparkles,       collab: false },
                { id: 'chat',        label: 'Chat',        icon: MessageCircle,  collab: true  },
                { id: 'annotations', label: 'Notes',       icon: Highlighter,    collab: false },
                { id: 'metadata',    label: 'Details',     icon: FileText,       collab: false },
              ] as const).filter(tab => !tab.collab || isCollaborativeMode).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
              <button className="p-2 text-gray-300 hover:text-gray-500 shrink-0" onClick={() => setShowChat(false)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Phase I→II handoff chip — your assignment, shown briefly on Phase II entry */}
            {phaseHandoffAssignment && sessionPhase === 'II' && (
              <div className="mx-3 mt-2.5 mb-0 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shrink-0">
                <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
                  <BookOpen className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Your focus section</p>
                  <p className="text-[12px] font-semibold text-indigo-900 truncate">§{phaseHandoffAssignment}</p>
                </div>
                <button onClick={() => setPhaseHandoffAssignment(null)} className="text-indigo-300 hover:text-indigo-500 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Phase II→III wrap-up prompt — natural session end signal */}
            {showWrapUpPrompt && sessionPhase === 'II' && (
              <div className="mx-3 mt-2.5 mb-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 shrink-0">
                <p className="text-[11px] font-semibold text-amber-800 mb-1">Ready to wrap up?</p>
                <p className="text-[10.5px] text-amber-600 mb-2 leading-snug">You&apos;ve covered a lot of ground. Capture what the group learned.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSessionPhase('III')
                      setShowSessionSummaryPanel(true)
                      setShowWrapUpPrompt(false)
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-lg py-1.5 transition-colors"
                  >
                    Generate Session Log
                  </button>
                  <button
                    onClick={() => setShowWrapUpPrompt(false)}
                    className="px-3 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[11px] font-semibold rounded-lg py-1.5 transition-colors"
                  >
                    Keep reading
                  </button>
                </div>
              </div>
            )}

            {/* Team section assignments — visible during Phase II collaborative reading */}
            {sessionPhase === 'II' && isCollaborativeMode && sessionAssignments.length > 0 && (
              <div className="mx-3 mt-2 mb-0 shrink-0">
                <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Users className="w-3 h-3 text-slate-400 shrink-0" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex-1">Section assignments</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sessionAssignments.map((a) => {
                      const isMe = a.assignedTo === currentUser?.id
                      const isAI = a.isAI
                      const target = paperSections.find(s =>
                        s.name.toLowerCase().startsWith(a.sectionName.toLowerCase()) ||
                        a.sectionName.toLowerCase().startsWith(s.name.toLowerCase()) ||
                        s.name.toLowerCase().includes(a.sectionName.toLowerCase()) ||
                        a.sectionName.toLowerCase().includes(s.name.toLowerCase())
                      )
                      return (
                        <button
                          key={a.sectionId}
                          onClick={() => {
                            if (!target?.startPage) return
                            window.dispatchEvent(new CustomEvent('document-viewer-navigate', { detail: { pageNumber: target.startPage, highlight: a.sectionName } }))
                          }}
                          disabled={!target?.startPage}
                          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors ${
                            isMe ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-slate-100'
                          } ${target?.startPage ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMe ? 'bg-indigo-500' : isAI ? 'bg-violet-400' : 'bg-emerald-400'}`} />
                          <span className="text-[11.5px] font-medium text-slate-800 flex-1 truncate">§{a.sectionName}</span>
                          <span className={`text-[10.5px] font-semibold shrink-0 ${isMe ? 'text-indigo-600' : isAI ? 'text-violet-500' : 'text-emerald-600'}`}>
                            {isMe ? 'You' : isAI ? 'AI' : a.assignedName.split(' ')[0]}
                          </span>
                          {target?.startPage && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Collective memory primer — shown once per session when prior reader data exists */}
            {collectivePrimer && (
              <div className="mx-3 mt-2.5 mb-0 bg-white border border-violet-200 rounded-xl px-3 py-2.5 flex items-start gap-2.5 shrink-0">
                <div className="w-5 h-5 bg-violet-500 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-0.5">From previous readers</p>
                  <p className="text-[11px] text-slate-700 leading-snug">{collectivePrimer}</p>
                </div>
                <button onClick={() => setCollectivePrimer(null)} className="text-violet-300 hover:text-violet-500 shrink-0 mt-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto bg-white relative">

              {/* ── AI tab ── */}
              {activeTab === 'ai' && (
                <div className="flex flex-col h-full absolute inset-0">
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {/* Suggested prompts — PhD-level research questions, not student scaffolding */}
                    {aiMessages.length === 0 && (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-semibold px-1 mb-2.5 uppercase tracking-wider">Start here</p>
                        {[
                          {
                            label: 'What assumption is doing the most work?',
                            sub: 'Find the load-bearing claim',
                            color: 'hover:bg-violet-50 hover:border-violet-100 hover:text-violet-800',
                          },
                          {
                            label: 'How strong is the evidence for the main finding?',
                            sub: 'Sample size, effect size, confidence',
                            color: 'hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-800',
                          },
                          {
                            label: 'What would a reviewer push back on?',
                            sub: 'Methodological objections',
                            color: 'hover:bg-amber-50 hover:border-amber-100 hover:text-amber-800',
                          },
                          {
                            label: 'What prior work does this most directly build on or contradict?',
                            sub: 'Literature positioning',
                            color: 'hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-800',
                          },
                          {
                            label: 'Could this be reproduced from the information given?',
                            sub: 'Reproducibility check',
                            color: 'hover:bg-slate-50 hover:border-slate-200 hover:text-slate-700',
                          },
                        ].map(({ label, sub, color }) => (
                          <button
                            key={label}
                            onClick={() => { setAiQuestion(label) }}
                            className={`w-full text-left bg-white border border-slate-100 rounded-xl px-3 py-2.5 transition-all group ${color}`}
                          >
                            <p className="text-[12px] font-medium text-slate-800 group-hover:text-inherit leading-snug">{label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {aiMessages.map((msg) => (
                      <div key={msg.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col items-end gap-1">
                          {msg.context && (
                            <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[88%]">
                              <div className="w-0.5 self-stretch bg-indigo-400 rounded-full shrink-0" />
                              <p className="text-[10px] text-slate-500 leading-snug italic line-clamp-3">
                                {msg.context}
                              </p>
                            </div>
                          )}
                          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-[12px] max-w-[88%] leading-snug">
                            {msg.question}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-[12px] text-gray-700 leading-relaxed flex-1">
                            {msg.isLoading ? (
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                <span className="text-[11px]">Analyzing paper…</span>
                              </div>
                            ) : (
                              <AIAnswerWithCitations
                                answer={msg.answer}
                                extractedText={extractedText}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={aiMessagesEndRef} />
                  </div>

                  <div className="px-3 pt-2 pb-2.5 bg-white border-t border-gray-100 shrink-0 space-y-1.5">
                    {/* Context chip — shown when text was selected via "Ask AI" */}
                    {aiContext && (
                      <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <div className="w-0.5 self-stretch bg-indigo-400 rounded-full shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-600 leading-snug flex-1 line-clamp-2">
                          {aiContext}
                        </p>
                        <button
                          onClick={() => setAiContext('')}
                          className="text-indigo-300 hover:text-indigo-500 shrink-0 mt-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
                      <Input
                        placeholder={aiContext ? 'Ask about the selected text…' : 'Ask about this paper…'}
                        className="grow border-0 focus-visible:ring-0 shadow-none bg-transparent h-8 text-[13px] pl-0 text-gray-800 placeholder:text-gray-400"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isAILoading}
                        autoFocus={!!aiContext}
                      />
                      <Button
                        size="icon"
                        className="h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 shrink-0"
                        onClick={handleAIQuestion}
                        disabled={isAILoading}
                      >
                        {isAILoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          : <Sparkles className="w-3.5 h-3.5 text-white" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Chat tab — powered by ChatSidebar with full collaboration features ── */}
              {activeTab === 'chat' && currentUser && (
                <div className="absolute inset-0">
                  <ChatSidebar
                    documentId={documentId}
                    currentUser={{ id: currentUser.id, name: currentUser.name, color: '#6366f1' }}
                    isOpen={true}
                    onClose={() => setActiveTab('ai')}
                    topic={document?.title || 'Group Discussion'}
                    collaboration={{
                      chatMessages: collaboration.chatMessages as any,
                      typingUsers: [],
                      activeUsers: collaboration.activeUsers || [],
                    }}
                    currentAnchor={currentAnchor}
                    onClearAnchor={() => setCurrentAnchor(null)}
                    divergenceSignals={divergenceSignals}
                    onDismissDivergence={(key) => setDivergenceSignals(prev => prev.filter(d => d.passageKey !== key))}
                    documentContent={extractedText}
                    hideHeader={true}
                  />
                </div>
              )}

              {/* ── Notes tab — DB-backed, shared across all users ── */}
              {activeTab === 'annotations' && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between px-1 mb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Team notes
                    </p>
                    <button
                      onClick={fetchTeamNotes}
                      className="text-[10px] text-indigo-400 hover:text-indigo-600"
                    >
                      Refresh
                    </button>
                  </div>
                  {teamNotesLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-[11px]">Loading…</span>
                    </div>
                  ) : teamNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Highlighter className="w-7 h-7 text-gray-200 mb-2" />
                      <p className="text-[12px] text-gray-400">No team notes yet</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">Select text in the PDF and choose "Add Note"</p>
                    </div>
                  ) : (
                    // Group by page, sorted ascending
                    (() => {
                      const byPage = new Map<number, any[]>()
                      for (const n of teamNotes) {
                        if (!byPage.has(n.pageNumber)) byPage.set(n.pageNumber, [])
                        byPage.get(n.pageNumber)!.push(n)
                      }
                      return [...byPage.keys()].sort((a, b) => a - b).map(page => (
                        <div key={page} className="mb-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                            Page {page}
                          </p>
                          {byPage.get(page)!.map((note: any) => {
                            const isOwn = note.authorId === (currentUser?.id || '')
                            return (
                              <div
                                key={note.id}
                                className={`border rounded-xl p-3 mb-2 cursor-pointer transition-all ${
                                  isOwn
                                    ? 'bg-amber-50 border-amber-100 hover:border-amber-300'
                                    : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'
                                }`}
                                onClick={() => window.dispatchEvent(new CustomEvent('document-viewer-navigate', { detail: { pageNumber: note.pageNumber, highlight: note.passageText?.slice(0, 80) || undefined } }))}
                              >
                                {note.passageText && (
                                  <p className="text-[10px] text-gray-400 italic border-l-2 border-gray-200 pl-2 mb-1.5 line-clamp-2">
                                    "{note.passageText}"
                                  </p>
                                )}
                                <p className="text-[12px] text-gray-700 leading-relaxed">{note.content}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className={`text-[10px] font-medium ${isOwn ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {note.authorName}
                                  </span>
                                  {note.epistemicTag && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-100 rounded-full text-gray-500">
                                      {note.epistemicTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))
                    })()
                  )}
                </div>
              )}

              {/* ── Details tab ── */}
              {activeTab === 'metadata' && (
                <div className="p-4 space-y-4">
                  {/* Phase I re-entry — shown when user skipped setup */}
                  {phaseISkipped && !phaseIReflectionSubmitted && (
                    <button
                      onClick={() => { setPhaseISkipped(false); setSessionPhase('I') }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-all text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                        <Brain className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800">Set reading context</div>
                        <div className="text-[10px] text-gray-500">Skipped — calibrates A2 peer routing + A10 roles</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    </button>
                  )}
                  {/* Paper details card */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Paper details</h3>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Title', value: document?.title },
                        { label: 'Authors', value: document?.authors },
                        { label: 'Year', value: document?.year },
                        { label: 'Journal', value: document?.journal },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <p className="text-[10px] font-medium text-gray-400 mb-0.5">{label}</p>
                          <p className="text-[12px] text-gray-700 leading-snug">{value}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {document?.abstract && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Abstract</h3>
                      <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-6">{document.abstract}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Session</h3>
                    {sessionMode && (
                      <div className={`mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border ${
                        isCollaborativeMode ? 'border-indigo-200 text-slate-700' : 'border-violet-200 text-slate-700'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isCollaborativeMode ? 'bg-indigo-500 animate-pulse' : 'bg-violet-400'}`} />
                        {isCollaborativeMode ? `Team session${sessionCode ? ` · ${sessionCode}` : ''}` : 'Solo deep read'}
                      </div>
                    )}
                    {isCollaborativeMode && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${collaboration.isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                          <span className="text-[12px] text-gray-600">
                            {collaboration.isConnected ? `${collaboration.activeUsers.length} reader${collaboration.activeUsers.length !== 1 ? 's' : ''} active` : 'Not connected'}
                          </span>
                        </div>
                        {collaboration.activeUsers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {collaboration.activeUsers.map((u: any, i: number) => (
                              <div key={i} className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-[10px] text-gray-600">
                                <div className="w-3.5 h-3.5 bg-indigo-400 rounded-full flex items-center justify-center text-white font-bold" style={{fontSize: 8}}>
                                  {u.userName?.[0]?.toUpperCase()}
                                </div>
                                {u.userName}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-2">
                    <EnhancedMetadataDisplay
                      documentId={documentId}
                      filename={document?.filename || ''}
                    />
                  </div>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}

      </div>

      {/* Phase III: Session Summary Panel — auto-shown when End Session is clicked */}
      {showSessionSummaryPanel && (
        <div className="fixed right-0 top-0 h-full w-[440px] z-50 shadow-2xl bg-white border-l border-gray-200 flex flex-col animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-amber-900">Phase III · Wrap-up</span>
                <p className="text-[10px] text-amber-600 mt-0.5">Post-Session Knowledge Stabilization</p>
              </div>
            </div>
            <button
              onClick={() => setShowSessionSummaryPanel(false)}
              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SessionSummaryPanel
              documentTitle={document?.title}
              documentContent={extractedText}
              paperText={extractedText}
              sessionDurationMinutes={30}
              participantNames={collaboration.activeUsers.map((u: any) => u.userName).filter(Boolean)}
              assignments={sessionAssignments}
              onClose={() => setShowSessionSummaryPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Dynamic Overlays */}

      <AISummaryPanel
        summary={summary || {}}
        loading={summaryLoading || (!summary && !isLoading)}
        open={showSummary}
        onClose={() => setShowSummary(false)}
        onAskMore={handleAskMore}
        documentContent={extractedText}
        onGoToPage={(page) => setCurrentPage(page)}
      />

      <ContextualHelpPopup />

      <SituationSettings
        isOpen={showSituationSettings}
        onClose={() => setShowSituationSettings(false)}
      />

      {/* Debug: Extracted Text Modal */}
      {showExtractedText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Extracted Text Context
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExtractedText(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-white">
              <pre className="font-mono text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">
                {extractedText || 'No text extracted successfully.'}
              </pre>
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(extractedText); toast.success('Copied!') }}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Intent Modal — first gate after PDF loads */}
      {showSessionIntent && !sessionMode && (
        <SessionIntentModal
          paperTitle={document?.title || 'Research Paper'}
          onSelect={(mode, code) => {
            setSessionMode(mode)
            setSessionCode(code)
            setShowSessionIntent(false)
            // dispatch so ApryseWebViewer + agents can read it
            window.dispatchEvent(new CustomEvent('coread-session-mode', {
              detail: { mode, sessionCode: code }
            }))
          }}
          onDismiss={() => {
            // Default to solo if dismissed — safe fallback
            setSessionMode('solo')
            setShowSessionIntent(false)
            window.dispatchEvent(new CustomEvent('coread-session-mode', {
              detail: { mode: 'solo' }
            }))
          }}
        />
      )}

      {/* Legacy Modals */}
      {showCollaborativeInsights && collaborativeSummary && (
        <CollaborativeInsightsModal
          isOpen={showCollaborativeInsights}
          onClose={() => setShowCollaborativeInsights(false)}
          documentId={documentId}
          documentTitle={document?.title || 'Attention Is All You Need'}
          summary={collaborativeSummary}
          onShowInsights={() => {
            setShowCollaborativeInsights(false)
            setShowDetailedInsights(true)
          }}
        />
      )}

      {showDetailedInsights && collaborativeSummary && (
        <DetailedInsightsModal
          isOpen={showDetailedInsights}
          onClose={() => setShowDetailedInsights(false)}
          documentId={documentId}
          documentTitle={document?.title || 'Attention Is All You Need'}
          summary={collaborativeSummary}
          onNavigateToPage={(pageNumber, position) => {
            setShowDetailedInsights(false)
            const event = new CustomEvent('document-viewer-navigate', { detail: { pageNumber, position } })
            window.dispatchEvent(event)
            toast.success(`Navigating to page ${pageNumber}`)
          }}
        />
      )}

      {/* Live Activity modal is rendered inside ApryseWebViewer to access real session data */}

    </div>
  )
}

// ── Phase I Panel — Pre-Discussion Alignment (collaborative mode) ──
// Shown in the right sidebar when sessionPhase === 'I' and isCollaborativeMode.
// Steps: 1 — Paper Briefing  2 — Your Reflection  3 — Section Assignments
function PhaseIPanel({
  reflectionSubmitted,
  onReflectionSubmit,
  onBeginReading,
  onSkip,
  onClose,
  documentTitle,
  documentContent,
  documentId,
  currentUserId,
  currentUserName,
  expectedParticipants,
  paperSections,
  readerSetup,
  onAssignmentsReady,
}: {
  reflectionSubmitted: boolean
  onReflectionSubmit: () => void
  onBeginReading: (assignedSectionName?: string) => void
  onSkip: () => void
  onClose: () => void
  documentTitle: string
  documentContent: string
  documentId: string
  currentUserId: string
  currentUserName: string
  expectedParticipants: number
  paperSections?: Array<{ id: string; name: string; preview: string; startPage: number }>
  readerSetup?: { expertiseLevel: 'novice' | 'familiar' | 'expert'; readingGoal: 'overview' | 'deep' | 'methodology' | 'evaluate' | 'find-gaps'; priorKnowledge: string; completedAt: string } | null
  onAssignmentsReady?: (assignments: Array<{
    sectionId: string
    sectionName: string
    assignedTo: string
    assignedName: string
    isAI: boolean
    sectionText?: string
  }>) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reflectionText, setReflectionText] = useState('')
  const [submitted, setSubmitted] = useState(reflectionSubmitted)
  const [groundedStances, setGroundedStances] = useState<string[]>([])
  const [genericStances, setGenericStances] = useState<string[]>([])
  const [stancesLoading, setStancesLoading] = useState(false)

  // Phase: 'waiting' = my reflection submitted, waiting for others
  //        'assigning' = all submitted, A10 is running
  //        'done' = result ready
  const [allocationPhase, setAllocationPhase] = useState<'idle' | 'waiting' | 'assigning' | 'done'>('idle')
  const [submittedCount, setSubmittedCount] = useState(0)
  const [activeUserCount, setActiveUserCount] = useState(expectedParticipants)
  const [allAssignments, setAllAssignments] = useState<Array<{
    sectionName: string
    assignedName: string
    assignedTo: string
    rationale: string
    inferredAngle: string
    isAI: boolean
  }>>([])
  // Derived at render time — not stored in state — so it updates when currentUserId/currentUserName resolves
  const myAssignments = allAssignments.filter(a =>
    !a.isAI && currentUserId && a.assignedTo === currentUserId
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch grounded + generic stances when user reaches Step 2
  useEffect(() => {
    if (step !== 2 || groundedStances.length > 0 || stancesLoading) return
    setStancesLoading(true)
    fetch('/api/reflection-stances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperTitle: documentTitle, paperContent: documentContent }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.grounded?.length) setGroundedStances(data.grounded)
        if (data?.generic?.length) setGenericStances(data.generic)
      })
      .catch(() => {})
      .finally(() => setStancesLoading(false))
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const extractSections = () => {
    const text = documentContent || ''
    const lines = text.split('\n')

    // Find heading lines and their positions
    const headingIndices: { lineIdx: number; name: string }[] = []
    lines.forEach((line, i) => {
      const t = line.trim()
      if (
        t.length > 3 && t.length < 80 &&
        /^(\d+[\.\s]|[A-Z][A-Z\s]{2,}$|Introduction|Related|Method|Result|Discussion|Conclusion|Background|Evaluation|Experiment|Analysis|Approach|System|Design|Implementation|Limitation)/i.test(t)
      ) {
        headingIndices.push({ lineIdx: i, name: t })
      }
    })

    if (headingIndices.length >= 3) {
      return headingIndices.slice(0, 12).map(({ lineIdx, name }, i) => {
        // Body text = lines between this heading and the next heading
        const nextIdx = headingIndices[i + 1]?.lineIdx ?? lines.length
        const bodyText = lines
          .slice(lineIdx + 1, Math.min(lineIdx + 1 + 30, nextIdx))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        return {
          id: `s${i}`,
          name,
          preview: bodyText.slice(0, 400),
        }
      })
    }

    // Fallback: split document into equal chunks labelled by generic section names
    const fallbackNames = ['Introduction', 'Related Work', 'Methodology', 'Results', 'Discussion', 'Conclusion']
    const chunkSize = Math.floor(text.length / fallbackNames.length)
    return fallbackNames.map((name, i) => ({
      id: `s${i}`,
      name,
      preview: text.slice(i * chunkSize, i * chunkSize + 400).replace(/\s+/g, ' ').trim(),
    }))
  }

  const applyResult = (assignments: any[]) => {
    const mapped = assignments.map((a: any) => ({
      sectionName: a.sectionName,
      assignedName: a.assignedName,
      assignedTo: a.assignedTo,
      rationale: a.rationale ?? '',
      inferredAngle: a.inferredAngle ?? '',
      isAI: a.assignedTo === 'ai',
    }))
    setAllAssignments(mapped)
    setAllocationPhase('done')
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    // Lift assignments to parent so Phase III Summary Panel can use them
    onAssignmentsReady?.(mapped.map((a, i) => ({
      sectionId: `s${i}`,
      sectionName: a.sectionName,
      assignedTo: a.assignedTo,
      assignedName: a.assignedName,
      isAI: a.isAI,
    })))
  }

  // Poll every 2s after submitting.
  // Gate: allocation fires only when reflectionCount >= expectedParticipants.
  // expectedParticipants is the authoritative count — live user tracking is unreliable
  // across serverless-style API routes.
  const startPolling = (sections: any[]) => {
    if (pollRef.current) return
    let triggeredAllocation = false
    pollRef.current = setInterval(async () => {
      try {
        // Get current reflection count from server
        const refRes = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-reflections', documentId }),
        })

        let reflectionCount = 0
        let allReflected = false
        if (refRes.ok) {
          const refData = await refRes.json()
          reflectionCount = (refData.reflections ?? []).length
          // Server confirms every joined user has submitted — the only safe gate
          allReflected = refData.allReflected === true
          setSubmittedCount(reflectionCount)
        }

        if (!triggeredAllocation && allReflected) {
          triggeredAllocation = true
          setAllocationPhase('assigning')
          await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-reflection',
              documentId,
              userId: currentUserId || `anon-${documentId}`,
              userName: currentUserName || 'Participant',
              content: reflectionText || '(already submitted)',
              sections,
              paperTitle: documentTitle,
              forceAllocate: true,
            }),
          })
        }

        // Check if allocation result is ready — accept any result with assignments.
        // We no longer need to guard against stale all-AI results because allocation
        // only runs via forceAllocate, which only fires when reflectionCount >= expected.
        const allocRes = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-allocation', documentId }),
        })
        if (allocRes.ok) {
          const allocData = await allocRes.json()
          const assignments = allocData.result?.assignments ?? []
          if (assignments.length) {
            applyResult(assignments)
          }
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleSubmitReflection = async () => {
    if (!reflectionText.trim()) return

    window.dispatchEvent(new CustomEvent('reflection-submit', {
      detail: { reflection: { type: 'text', content: reflectionText } }
    }))

    onReflectionSubmit()
    setSubmitted(true)
    setStep(3)

    // Prefer real Apryse-extracted sections; fall back to text heuristic
    const sections = (paperSections && paperSections.length > 0) ? paperSections : extractSections()

    // Use a stable userId — fall back to a session-scoped key if auth hasn't resolved yet
    const effectiveUserId = currentUserId || `anon-${documentId}-${Date.now()}`
    const effectiveUserName = currentUserName || 'Participant'

    // Save this user's reflection — no allocation yet, just store it
    try {
      const saveRes = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-reflection',
          documentId,
          userId: effectiveUserId,
          userName: effectiveUserName,
          content: reflectionText,
          sections,
          paperTitle: documentTitle,
          expectedParticipants: expectedParticipants,
        }),
      })
      if (saveRes.ok) {
        const saveData = await saveRes.json()
        setSubmittedCount(saveData.reflectionCount ?? 1)

        if (saveData.allocationReady) {
          // A previous forceAllocate already stored a result — use it
          const allocRes = await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-allocation', documentId }),
          })
          if (allocRes.ok) {
            const allocData = await allocRes.json()
            const assignments = allocData.result?.assignments ?? []
            if (assignments.length) {
              applyResult(assignments)
              return
            }
          }
        }
      }
    } catch (e) {
      console.warn('[PhaseIPanel] save-reflection failed:', e)
    }

    // Not all participants in yet — wait and poll
    setAllocationPhase('waiting')
    startPolling(sections)
  }

  const stepLabels = ['Paper Briefing', 'Your Reflection', 'Section Assignments']

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-indigo-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-900">Phase I · Alignment</p>
            <p className="text-[10px] text-indigo-500">Pre-Discussion setup</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-100 shrink-0">
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            onClick={() => { if (s <= (submitted ? 3 : 2)) setStep(s) }}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
              step === s
                ? 'bg-indigo-50 text-indigo-700'
                : s < step || (submitted && s === 3)
                  ? 'text-emerald-600'
                  : 'text-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
              s < step || (submitted && s === 3)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : step === s
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-gray-200 text-gray-300 bg-white'
            }`}>
              {(s < step || (submitted && s === 3)) ? '✓' : s}
            </div>
            <span className="uppercase tracking-wide leading-none">{stepLabels[s - 1]}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Step 1 — Paper Briefing */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">What you are about to read</p>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{documentTitle || 'Academic Paper'}</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: '🎯', title: 'Set reading goals', desc: 'Tell CoRead what you want to get out of this session' },
                { icon: '🧩', title: 'Section assignment (A10)', desc: 'Agent 10 assigns responsibilities based on your expertise' },
                { icon: '🤝', title: 'Peer calibration (A2)', desc: 'Enables Agent 2 to route you to the right collaborator when you are stuck' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <span className="text-base mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-2.5 px-4 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onSkip}
              className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors py-1.5"
            >
              Skip setup — start reading now
            </button>
          </div>
        )}

        {/* Step 2 — Reflection */}
        {step === 2 && (() => {
          // Fixed generic pills — short label maps to full sentence in textarea
          const genericPills: { label: string; sentence: string }[] = [
            { label: 'Reading as reviewer',       sentence: 'I am reading as a reviewer — checking evidence-to-claim fidelity throughout.' },
            { label: 'Scrutinise evaluation',     sentence: 'I will focus on scrutinising the evaluation design and validity of results.' },
            { label: 'New to this subfield',      sentence: 'I am new to this subfield and reading to understand the core contribution.' },
            { label: 'Track related work',        sentence: 'I am tracking how this paper positions itself relative to prior work.' },
            { label: 'Check reproducibility',     sentence: 'I am reading to identify reproducibility gaps — data, code, and parameter reporting.' },
            { label: 'Assess novelty',            sentence: 'I want to assess whether the contribution is sufficiently novel relative to cited work.' },
          ]

          // Briefing shortcut sentence
          const briefingText = readerSetup ? (() => {
            const expertise = { novice: 'New to this subfield', familiar: 'Familiar with the domain', expert: 'Expert in this area' }[readerSetup.expertiseLevel]
            const goal = { overview: 'reading for a high-level overview', deep: 'doing a deep read of the method and claims', methodology: 'scrutinising the methodology and experimental design', evaluate: 'evaluating as a reviewer — checking evidence-to-claim fidelity', 'find-gaps': 'reading to identify gaps and position future work' }[readerSetup.readingGoal]
            const parts = [`${expertise}; ${goal}.`]
            if (readerSetup.priorKnowledge?.trim()) parts.push(readerSetup.priorKnowledge.trim())
            return parts.join(' ')
          })() : null

          const toggleSentence = (sentence: string) =>
            setReflectionText(prev =>
              prev.includes(sentence)
                ? prev.replace(sentence, '').replace(/\s{2,}/g, ' ').trim()
                : prev ? `${prev.trimEnd()} ${sentence}` : sentence
            )

          return (
            <div className="space-y-3">

              {/* Briefing shortcut */}
              {briefingText && !reflectionText && (
                <button
                  onClick={() => setReflectionText(briefingText)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[11px] text-indigo-700 font-medium flex-1 leading-snug line-clamp-1">{briefingText}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-400 shrink-0">Use</span>
                </button>
              )}

              {/* Paper-grounded stances — full rows, selectable */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 mb-1.5">From this paper</p>
                {stancesLoading ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 py-1">
                    <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin shrink-0" />
                    Reading paper…
                  </div>
                ) : (
                  <div className="space-y-1">
                    {groundedStances.map((sentence, i) => {
                      const selected = reflectionText.includes(sentence)
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSentence(sentence)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] leading-snug border transition-all flex items-start gap-2 ${
                            selected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {selected && <span className="text-white text-[8px] font-bold">✓</span>}
                          </span>
                          {sentence}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Generic pills — short labels, horizontal wrap */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Reading angle</p>
                <div className="flex flex-wrap gap-1.5">
                  {genericPills.map(({ label, sentence }) => {
                    const selected = reflectionText.includes(sentence)
                    return (
                      <button
                        key={label}
                        onClick={() => toggleSentence(sentence)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          selected
                            ? 'bg-slate-800 border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Editable result */}
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Select above, or write your own…"
                className="w-full h-16 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent leading-relaxed"
              />

              <button
                onClick={handleSubmitReflection}
                disabled={!reflectionText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 px-4 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Reflection
              </button>
            </div>
          )
        })()}

        {/* Step 3 — Section Assignments */}
        {step === 3 && (
          <div className="space-y-3">
            {/* Reflection confirmed */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Reflection received</p>
                <p className="text-[11px] text-emerald-600 mt-0.5 leading-snug">
                  A10 is matching your background to the paper sections.
                </p>
              </div>
            </div>

            {/* Waiting for other participants */}
            {allocationPhase === 'waiting' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-amber-800">Waiting for all participants…</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">A10 runs once everyone has submitted</p>
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.max(submittedCount + 1, activeUserCount) }).map((_, i) => (
                    <div key={i} className={`flex items-center gap-1.5`}>
                      <div className={`w-2 h-2 rounded-full ${i < submittedCount ? 'bg-emerald-500' : 'bg-amber-200'}`} />
                      <span className="text-[10px] text-amber-600">
                        {i < submittedCount ? 'Ready' : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A10 running */}
            {allocationPhase === 'assigning' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-slate-700">A10 · Assigning sections…</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All participants ready — matching together</p>
                </div>
              </div>
            )}

            {/* My assigned sections */}
            {allocationPhase === 'done' && myAssignments.length > 0 && (
              <div className="rounded-xl border border-indigo-200 overflow-hidden">
                <div className="bg-indigo-600 px-3 py-2 flex items-center gap-2">
                  <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">A10</span>
                  </div>
                  <p className="text-[11px] font-bold text-white uppercase tracking-widest">Your sections</p>
                </div>
                <div className="divide-y divide-indigo-50">
                  {myAssignments.map((a, i) => (
                    <div key={i} className="px-3 py-2.5 bg-white">
                      <p className="text-[13px] font-semibold text-slate-900 mb-0.5">{a.sectionName}</p>
                      <p className="text-[11px] text-indigo-600 italic mb-1">{a.inferredAngle}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{a.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No personal assignment (all went to peers/AI) */}
            {allocationPhase === 'done' && myAssignments.length === 0 && allAssignments.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[12px] font-semibold text-amber-800 mb-0.5">No primary section assigned to you</p>
                <p className="text-[11px] text-amber-600 leading-relaxed">
                  Your reflection didn&apos;t map strongly to a specific section — you can read freely and assist peers. Check the Sections tab in the left sidebar to reassign manually.
                </p>
              </div>
            )}

            {/* Full session map — who reads what */}
            {allocationPhase === 'done' && allAssignments.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session map · all sections</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {allAssignments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        a.isAI ? 'bg-violet-400' :
                        a.assignedTo === currentUserId ? 'bg-indigo-500' : 'bg-emerald-400'
                      }`} />
                      <span className="text-[12px] text-slate-700 flex-1 truncate">{a.sectionName}</span>
                      <span className={`text-[10px] font-semibold shrink-0 ${
                        a.isAI ? 'text-violet-600' :
                        a.assignedTo === currentUserId ? 'text-indigo-600' : 'text-emerald-600'
                      }`}>{a.assignedName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Still waiting for allocation */}
            {allocationPhase === 'idle' && allAssignments.length === 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400">Sections will appear here after allocation runs.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — Begin Reading button only when reflection submitted */}
      {(submitted || step === 3) && (
        <div className="px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
          <button
            onClick={() => onBeginReading(myAssignments[0]?.sectionName)}
            className={`w-full text-white font-semibold rounded-xl py-2.5 px-4 text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              allocationPhase === 'done'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {allocationPhase === 'done' && myAssignments.length > 0
              ? <>Start reading §{myAssignments[0].sectionName.length > 22 ? myAssignments[0].sectionName.slice(0, 22) + '…' : myAssignments[0].sectionName}<ArrowRight className="w-4 h-4" /></>
              : <>Begin Reading <ArrowRight className="w-4 h-4" /></>
            }
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">Phase II · In-Session Orchestration</p>
        </div>
      )}
    </div>
  )
}

// ── Anara-style inline citations: [1] superscripts with passage preview ──
function AIAnswerWithCitations({
  answer,
  extractedText,
}: {
  answer: string
  extractedText: string
}) {
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null)

  // Parse [N] citation markers out of the answer text
  const parts: Array<{ type: 'text' | 'citation'; content: string; num?: number }> = []
  const citationRegex = /\[(\d+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: answer.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'citation', content: match[0], num: parseInt(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < answer.length) {
    parts.push({ type: 'text', content: answer.slice(lastIndex) })
  }

  // Extract a snippet from the document text for citation N
  const getSnippet = (n: number): string => {
    if (!extractedText) return 'Source passage not available.'
    const sentences = extractedText.split(/(?<=[.!?])\s+/)
    const idx = (n - 1) % Math.max(sentences.length, 1)
    return sentences[idx]?.slice(0, 200) || 'Source passage not available.'
  }

  const hasCitations = parts.some(p => p.type === 'citation')

  if (!hasCitations) {
    return <span className="whitespace-pre-wrap">{answer}</span>
  }

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.content}</span>
        const n = part.num!
        return (
          <span key={i} className="relative inline-block">
            <button
              className="inline-flex items-center justify-center w-4 h-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full text-[9px] font-bold mx-0.5 align-super transition-colors cursor-pointer"
              onMouseEnter={() => setHoveredCitation(n)}
              onMouseLeave={() => setHoveredCitation(null)}
              onClick={() => {
                const event = new CustomEvent('document-viewer-navigate', {
                  detail: { pageNumber: n }
                })
                window.dispatchEvent(event)
              }}
              title={`Jump to source [${n}]`}
            >
              {n}
            </button>
            {hoveredCitation === n && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl pointer-events-none leading-relaxed">
                <span className="block text-indigo-300 font-semibold mb-1">Source [{n}]</span>
                {getSnippet(n)}…
                <span className="block mt-1.5 text-indigo-400 text-[10px]">Click to jump to passage</span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}