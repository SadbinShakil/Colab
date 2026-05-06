'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare, Send, Users, HelpCircle,
  Brain, Lightbulb, CheckCircle, X,
  Sparkles, Loader2, Hash, BookOpen,
  GitBranch, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Markdown Renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ol key={`list-${key}`} className="list-none space-y-0.5 my-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[13px]">
              <span className="text-indigo-500 font-semibold shrink-0">{i + 1}.</span>
              <span>{parseBold(item)}</span>
            </li>
          ))}
        </ol>
      )
      listItems = []
    }
  }

  const parseBold = (s: string) => {
    const parts = s.split(/\*\*(.+?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="font-semibold text-slate-900">{part}</strong>
        : part
    )
  }

  lines.forEach((line, idx) => {
    const numberedMatch = line.match(/^\d+\.\s+(.+)/)
    if (numberedMatch) {
      listItems.push(numberedMatch[1])
    } else {
      flushList(String(idx))
      if (line.trim() === '') {
        if (elements.length > 0) elements.push(<div key={`sp-${idx}`} className="h-1" />)
      } else {
        elements.push(<p key={idx} className="text-[13px] leading-[1.5]">{parseBold(line)}</p>)
      }
    }
  })
  flushList('end')
  return <>{elements}</>
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MessageAnchor {
  sectionId: string
  sectionName: string
  passageQuote: string   // first 120 chars of the passage
  pageNumber?: number
}

export interface DivergenceSignal {
  passageKey: string
  passageText: string
  sectionName: string
  otherUserId: string
  otherUserName: string
  myReason: string
  theirReason: string
}

interface ChatMessage {
  id: string
  documentId: string
  userId: string
  userName: string
  content: string
  type: 'TEXT' | 'AI_RESPONSE' | 'SYSTEM'
  timestamp: string
  anchor?: MessageAnchor
}

interface ChatSidebarProps {
  documentId: string
  currentUser: { id: string; name: string; color: string }
  isOpen: boolean
  onClose: () => void
  topic?: string
  onSendMessage?: (message: string) => void
  collaboration?: {
    chatMessages: ChatMessage[]
    typingUsers: string[]
    activeUsers: any[]
  }
  currentAnchor?: MessageAnchor | null
  onClearAnchor?: () => void
  divergenceSignals?: DivergenceSignal[]
  onDismissDivergence?: (passageKey: string) => void
  discussionSparks?: Array<{ text: string; groundingQuote?: string; type?: string }>
  documentContent?: string
  hideHeader?: boolean
}

// ─── AI Discussion Analysis ───────────────────────────────────────────────────
function AiDiscussionTab({ messages, documentId, currentUser, onResult }: {
  messages: ChatMessage[]
  documentId: string
  currentUser: { id: string; name: string; color: string }
  onResult: (result: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<string | null>(null)

  const ACTIONS = [
    { id: 'divergence', label: 'Map interpretive divergence', sublabel: 'Where do readers disagree?',       icon: GitBranch,    color: 'text-violet-600', bg: 'hover:bg-violet-50' },
    { id: 'overreach',  label: 'Find the overreach',          sublabel: 'Evidence-to-claim gaps',           icon: AlertTriangle, color: 'text-amber-600',  bg: 'hover:bg-amber-50'  },
    { id: 'unresolved', label: 'Surface unresolved claims',   sublabel: 'Raised but not answered',          icon: HelpCircle,   color: 'text-rose-600',   bg: 'hover:bg-rose-50'   },
    { id: 'consensus',  label: 'Reconstruct shared model',    sublabel: 'What did the group agree on?',     icon: CheckCircle,  color: 'text-emerald-600',bg: 'hover:bg-emerald-50'},
  ] as const

  const runAnalysis = async (mode: typeof ACTIONS[number]['id']) => {
    if (messages.length === 0) { onResult('No messages yet. Start a discussion first.'); return }
    setIsLoading(true); setActiveMode(mode)
    try {
      const res = await fetch('/api/discussion-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ userId: m.userId, userName: m.userName, content: m.content, timestamp: new Date(m.timestamp).getTime() })),
          analysisType: mode, documentId
        })
      })
      const data = await res.json()
      onResult(data.result || data.analysis || data.response || 'Analysis complete.')
    } catch { onResult('Failed to analyze discussion. Please try again.') }
    finally { setIsLoading(false); setActiveMode(null) }
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Discussion Analysis</p>
          <p className="text-[11px] text-slate-400">{messages.length} message{messages.length !== 1 ? 's' : ''} in session</p>
        </div>
      </div>
      <div className="space-y-2">
        {ACTIONS.map((action) => (
          <button key={action.id} onClick={() => runAnalysis(action.id)} disabled={isLoading}
            className={`w-full text-left px-3.5 py-3 border border-slate-200 rounded-xl flex items-start gap-3 transition-all disabled:opacity-50 ${action.bg}`}>
            {isLoading && activeMode === action.id
              ? <Loader2 className={`w-4 h-4 ${action.color} animate-spin shrink-0 mt-0.5`} />
              : <action.icon className={`w-4 h-4 ${action.color} shrink-0 mt-0.5`} />}
            <div>
              <p className="text-[13px] font-semibold text-slate-800">{action.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{action.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Date divider between messages ───────────────────────────────────────────
function DateDivider({ ts }: { ts: string }) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const label = isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] text-slate-400 font-medium px-1">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function ChatSidebar({
  documentId, currentUser, isOpen, onClose,
  topic = 'Group Discussion', onSendMessage, collaboration,
  currentAnchor, onClearAnchor,
  divergenceSignals = [], onDismissDivergence,
  discussionSparks = [],
  documentContent,
  hideHeader = false,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'ai' | 'help'>('chat')
  const [stuckRequests, setStuckRequests] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [dismissedDivergences, setDismissedDivergences] = useState<Set<string>>(new Set())
  const [aiListening, setAiListening] = useState(false) // subtle AI presence indicator
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const displayMessages = collaboration?.chatMessages || messages
  const displayTypingUsers = collaboration?.typingUsers || typingUsers
  const displayActiveUsers = collaboration?.activeUsers || activeUsers

  const activeDivergences = divergenceSignals.filter(d => !dismissedDivergences.has(d.passageKey))

  // After 3+ messages, subtly signal AI is listening
  useEffect(() => {
    if (displayMessages.filter(m => m.type === 'TEXT').length >= 3) {
      setAiListening(true)
    }
  }, [displayMessages])

  useEffect(() => {
    if (!isOpen || !documentId) return
    loadMessages()
    fetch('/api/socket', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join-document', documentId, userId: currentUser.id, userName: currentUser.name }) })
    const interval = setInterval(loadMessages, 2000)
    return () => {
      clearInterval(interval)
      fetch('/api/socket', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave-document', documentId, userId: currentUser.id, userName: currentUser.name }) })
    }
  }, [isOpen, documentId, currentUser.id, currentUser.name])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, displayMessages, activeTab])

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/socket', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-messages', documentId }) })
      const data = await res.json()
      if (data.success) { setMessages(data.messages || []); setTypingUsers(data.typingUsers || []) }
    } catch {}
  }

  const sendMessage = async (prefilled?: string) => {
    const content = (prefilled ?? newMessage).trim()
    if (!content || isSending) return
    setIsSending(true)
    if (!prefilled) setNewMessage('')

    const optimistic: ChatMessage = {
      id: `temp_${Date.now()}`, documentId, userId: currentUser.id, userName: currentUser.name,
      content, type: 'TEXT', timestamp: new Date().toISOString(),
      anchor: currentAnchor ?? undefined
    }
    setMessages(prev => [...prev, optimistic])

    try {
      if (onSendMessage) { onSendMessage(content); return }

      await fetch('/api/socket', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message', documentId, userId: currentUser.id, userName: currentUser.name,
          messageData: { content, type: 'TEXT', anchor: currentAnchor ?? null }
        }) })

      onClearAnchor?.()

      if (content.toLowerCase().includes('@ai') || content.toLowerCase().startsWith('/ask')) {
        setIsLoading(true)
        const res = await fetch('/api/ai-help', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: content,
            documentContent: documentContent || '',
            documentTitle: topic,
            passageQuote: currentAnchor?.passageQuote,
            sectionName: currentAnchor?.sectionName,
          }) })
        const data = await res.json()
        const answer = data.response?.answer || data.answer || ''
        if (answer) {
          const aiMsg: ChatMessage = {
            id: `ai_${Date.now()}`, documentId, userId: 'coread-ai', userName: 'CoRead',
            content: answer, type: 'AI_RESPONSE', timestamp: new Date().toISOString(),
            anchor: currentAnchor ?? undefined
          }
          setMessages(prev => [...prev, aiMsg])
          await fetch('/api/socket', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send-message', documentId, userId: 'coread-ai', userName: 'CoRead',
              messageData: { content: answer, type: 'AI_RESPONSE', anchor: currentAnchor ?? null } }) })
        }
        setIsLoading(false)
      }
    } catch { }
    finally { setIsSending(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const dismissDivergence = (key: string) => {
    setDismissedDivergences(prev => new Set([...prev, key]))
    onDismissDivergence?.(key)
  }

  const startDivergenceDiscussion = (d: DivergenceSignal) => {
    const prefill = `@AI I read "${d.passageText.slice(0, 60)}…" as ${d.myReason}, but ${d.otherUserName} reads it as ${d.theirReason}. What does the text actually claim — and which reading fits the argument better?`
    setNewMessage(prefill)
    chatInputRef.current?.focus()
    dismissDivergence(d.passageKey)
  }

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Group messages: insert date dividers
  const messagesWithDividers = displayMessages.reduce<Array<{ type: 'msg'; msg: ChatMessage } | { type: 'divider'; ts: string }>>((acc, msg, i) => {
    const prev = displayMessages[i - 1]
    if (!prev || new Date(msg.timestamp).toDateString() !== new Date(prev.timestamp).toDateString()) {
      acc.push({ type: 'divider', ts: msg.timestamp })
    }
    acc.push({ type: 'msg', msg })
    return acc
  }, [])

  if (!isOpen) return null

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden font-sans">

      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-white shrink-0">
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[12px] font-semibold text-slate-900 leading-tight truncate">{topic}</h2>
            <p className="text-[10px] text-slate-400">
              {displayActiveUsers.length || 1} reading · {displayMessages.length} messages
            </p>
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 shrink-0">
            {([
              { id: 'chat', label: 'Chat',     icon: MessageSquare },
              { id: 'ai',   label: 'Analyze',  icon: Brain },
              { id: 'help', label: 'Help',      icon: HelpCircle },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1",
                  activeTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                <tab.icon className="h-3 w-3" />{tab.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full shrink-0">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Compact sub-tab bar — embedded mode */}
      {hideHeader && (
        <div className="flex items-center gap-0.5 px-3 pt-2 pb-1 shrink-0">
          {([
            { id: 'chat', label: 'Messages', icon: MessageSquare },
            { id: 'ai',   label: 'Analyze',  icon: Brain },
            { id: 'help', label: 'Stuck',    icon: HelpCircle },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50")}>
              <tab.icon className="w-3 h-3" />{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">

        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <>
            {/* Divergence banners */}
            {activeDivergences.length > 0 && (
              <div className="px-3 pt-2.5 space-y-2 shrink-0">
                {activeDivergences.map(d => (
                  <div key={d.passageKey} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <p className="text-[11px] font-semibold text-amber-800">Different readings detected</p>
                      </div>
                      <button onClick={() => dismissDivergence(d.passageKey)} className="text-amber-400 hover:text-amber-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 italic mb-1 line-clamp-2">
                      "{d.passageText.slice(0, 80)}{d.passageText.length > 80 ? '…' : ''}"
                    </p>
                    <p className="text-xs text-slate-600 mb-2">
                      You: <span className="font-semibold text-red-600">{d.myReason}</span> · {d.otherUserName}: <span className="font-semibold text-emerald-600">{d.theirReason}</span>
                    </p>
                    <button onClick={() => startDivergenceDiscussion(d)}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Discuss this
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Discussion sparks — shown as subtle prompts, not formal AI cards */}
            {discussionSparks.length > 0 && (
              <div className="px-3 pt-2 shrink-0">
                <div className="flex flex-col gap-1.5">
                  {discussionSparks.slice(0, 2).map((spark, i) => (
                    <button key={i} onClick={() => setNewMessage(spark.text)}
                      className="text-left bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-xl px-3 py-2 transition-colors group">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 mt-0.5 shrink-0 transition-colors" />
                        <div>
                          <p className="text-xs text-slate-600 group-hover:text-indigo-800 leading-snug transition-colors">{spark.text}</p>
                          {spark.groundingQuote && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">"{spark.groundingQuote}"</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-3">
              <div className="py-3 space-y-1">
                {displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 text-center px-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
                      <Users className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">
                      {displayActiveUsers.length > 1 ? 'Start the discussion' : 'Waiting for collaborators'}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {displayActiveUsers.length > 1
                        ? 'What\'s your first take on the paper?'
                        : 'Share the session link to read together'}
                    </p>
                  </div>
                ) : (
                  messagesWithDividers.map((item, i) => {
                    if (item.type === 'divider') {
                      return <DateDivider key={`div-${i}`} ts={item.ts} />
                    }
                    const msg = item.msg
                    const isMe = msg.userId === currentUser.id
                    const isAi = msg.type === 'AI_RESPONSE'
                    const prevItem = messagesWithDividers[i - 1]
                    const prevMsg = prevItem?.type === 'msg' ? prevItem.msg : null
                    const isSeq = prevMsg && prevMsg.userId === msg.userId &&
                      (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 120000

                    return (
                      <div key={msg.id} className={cn(
                        "flex flex-col",
                        isMe ? "items-end" : "items-start",
                        isSeq ? "mt-0.5" : "mt-3"
                      )}>
                        {!isSeq && (
                          <div className={cn("flex items-center gap-1.5 mb-1 px-1", isMe && "flex-row-reverse")}>
                            {/* Avatar */}
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0",
                              isAi ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                                : isMe ? "bg-slate-400"
                                  : "bg-emerald-500"
                            )}>
                              {isAi ? <Sparkles className="w-2.5 h-2.5" /> : msg.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">{isMe ? 'You' : isAi ? 'CoRead' : msg.userName}</span>
                            <span className="text-[10px] text-slate-300">{formatTime(msg.timestamp)}</span>
                          </div>
                        )}

                        {/* Passage anchor — clickable: jumps to page and flashes amber on the passage */}
                        {msg.anchor?.passageQuote && (
                          <button
                            onClick={() => {
                              if (!msg.anchor?.pageNumber) return
                              window.dispatchEvent(new CustomEvent('document-viewer-navigate', {
                                detail: {
                                  pageNumber: msg.anchor.pageNumber,
                                  highlight: msg.anchor.passageQuote.slice(0, 120),
                                }
                              }))
                            }}
                            disabled={!msg.anchor.pageNumber}
                            className={cn(
                              "flex items-start gap-1.5 mb-1 px-2.5 py-1.5 rounded-lg border-l-2 max-w-[85%] text-left transition-all group",
                              isMe ? "bg-indigo-900/10 border-indigo-300 self-end" : "bg-slate-50 border-slate-300",
                              msg.anchor.pageNumber
                                ? "cursor-pointer hover:border-amber-400 hover:bg-amber-50/60 active:bg-amber-100"
                                : "cursor-default"
                            )}
                            title={msg.anchor.pageNumber ? `Jump to page ${msg.anchor.pageNumber} and highlight passage` : undefined}
                          >
                            <Hash className={cn(
                              "w-3 h-3 shrink-0 mt-0.5 transition-colors",
                              msg.anchor.pageNumber ? "text-slate-400 group-hover:text-amber-500" : "text-slate-300"
                            )} />
                            <div className="min-w-0 flex-1">
                              {msg.anchor.sectionName && (
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5 group-hover:text-amber-600 transition-colors">
                                  §{msg.anchor.sectionName}
                                  {msg.anchor.pageNumber && (
                                    <span className="ml-1.5 normal-case font-normal text-slate-400 group-hover:text-amber-500">p.{msg.anchor.pageNumber}</span>
                                  )}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500 italic line-clamp-2 leading-relaxed">
                                &ldquo;{msg.anchor.passageQuote.slice(0, 100)}{msg.anchor.passageQuote.length > 100 ? '…' : ''}&rdquo;
                              </p>
                            </div>
                          </button>
                        )}

                        <div className={cn(
                          "px-3 py-2 text-[13px] leading-relaxed max-w-[85%]",
                          isMe
                            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                            : isAi
                              ? "bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm"
                              : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm"
                        )}>
                          {isAi && (
                            <div className="flex items-center gap-1 mb-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                              <Sparkles className="h-2.5 w-2.5" /> CoRead
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</div>
                        </div>
                      </div>
                    )
                  })
                )}

                {isLoading && (
                  <div className="flex items-center gap-2 pl-2 mt-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="bg-slate-100 rounded-full px-3 py-1.5 flex items-center gap-1">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {displayTypingUsers.length > 0 && (
                  <p className="text-[11px] text-slate-400 italic pl-2 mt-1">{displayTypingUsers[0]} is typing…</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Subtle AI listening indicator — appears after 3+ messages */}
            {aiListening && displayMessages.filter(m => m.type === 'TEXT').length >= 3 && !isLoading && (
              <div className="px-3 py-1.5 shrink-0 flex items-center gap-1.5 border-t border-slate-50">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse" />
                <p className="text-[10px] text-slate-400">CoRead is following your discussion</p>
              </div>
            )}

            {/* Active anchor chip above input */}
            {currentAnchor && (
              <div className="px-3 pb-1 shrink-0">
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                  <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Citing: {currentAnchor.sectionName}</p>
                    <p className="text-[11px] text-slate-500 italic truncate">"{currentAnchor.passageQuote.slice(0, 70)}…"</p>
                  </div>
                  <button onClick={onClearAnchor} className="text-indigo-300 hover:text-indigo-500 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Chat input */}
            <div className="px-3 py-2.5 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-300 transition-all border border-slate-200 focus-within:border-indigo-300 gap-1">
                <Input ref={chatInputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentAnchor ? `Comment on "${currentAnchor.sectionName}"…` : 'Discuss the paper… @AI to ask CoRead'}
                  className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-8 text-[13px] px-1 w-full text-slate-800 placeholder:text-slate-400"
                  disabled={isSending} />
                <Button size="icon" variant="ghost"
                  className={cn("h-7 w-7 rounded-lg shrink-0 transition-colors",
                    newMessage.trim() ? "text-indigo-600 hover:bg-indigo-50" : "text-slate-300 hover:bg-transparent")}
                  onClick={() => sendMessage()} disabled={!newMessage.trim() || isSending}>
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <AiDiscussionTab messages={displayMessages} documentId={documentId} currentUser={currentUser}
            onResult={(result) => {
              const aiMsg: ChatMessage = {
                id: `ai_${Date.now()}`, documentId, userId: 'coread-ai', userName: 'CoRead',
                content: result, type: 'AI_RESPONSE', timestamp: new Date().toISOString()
              }
              setMessages(prev => [...prev, aiMsg])
              setActiveTab('chat')
            }} />
        )}

        {activeTab === 'help' && (
          <div className="flex-1 p-5 bg-slate-50 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Help Requests</h3>
            {stuckRequests.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-3" />
                <p className="text-sm font-medium text-slate-700">Everyone is on track</p>
                <p className="text-xs text-slate-400 mt-1">No open help requests right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stuckRequests.map((req, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-amber-400">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Page {req.page}</span>
                      <span className="text-[11px] text-slate-400">{formatTime(req.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{req.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
