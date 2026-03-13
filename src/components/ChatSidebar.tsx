'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare, Send, Bot, User, Users, HelpCircle,
  Brain, Lightbulb, AlertCircle, CheckCircle, Clock,
  X, ChevronRight, MessageCircleQuestion, Sparkles,
  Zap, Hash, GraduationCap, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Markdown Renderer ───────────────────────────────────────────────────────
// Parses a subset of markdown into clean JSX — no raw syntax shown to users.
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
              <span className="text-[#1a73e8] font-semibold shrink-0">{i + 1}.</span>
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
        ? <strong key={i} className="font-semibold text-[#202124]">{part}</strong>
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

interface ChatMessage {
  id: string
  documentId: string
  userId: string
  userName: string
  content: string
  type: 'TEXT' | 'AI_RESPONSE' | 'SYSTEM'
  timestamp: string
}

interface ChatSidebarProps {
  documentId: string
  currentUser: {
    id: string
    name: string
    color: string
  }
  isOpen: boolean
  onClose: () => void
  topic?: string // New prop for discussion topic
  onSendMessage?: (message: string) => void // Optional custom send handler
  collaboration?: {
    chatMessages: ChatMessage[]
    typingUsers: string[]
    activeUsers: any[]
  }
}

// ─── AI Discussion Analysis Sub-component ────────────────────────────────────
function AiDiscussionTab({
  messages,
  documentId,
  currentUser,
  onResult
}: {
  messages: ChatMessage[]
  documentId: string
  currentUser: { id: string; name: string; color: string }
  onResult: (result: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<string | null>(null)

  const ACTIONS = [
    { id: 'summary', label: 'Summarize discussion', icon: MessageSquare, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
    { id: 'insights', label: 'Extract key insights', icon: Brain, color: 'text-purple-600', bg: 'hover:bg-purple-50' },
    { id: 'gaps', label: 'Find knowledge gaps', icon: HelpCircle, color: 'text-amber-600', bg: 'hover:bg-amber-50' },
    { id: 'consensus', label: 'Check team consensus', icon: Users, color: 'text-green-600', bg: 'hover:bg-green-50' },
  ] as const

  const runAnalysis = async (mode: typeof ACTIONS[number]['id']) => {
    if (messages.length === 0) {
      onResult('No messages in the chat yet to analyze. Start a discussion first!')
      return
    }
    setIsLoading(true)
    setActiveMode(mode)
    try {
      const res = await fetch('/api/discussion-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            userId: m.userId, userName: m.userName,
            content: m.content, timestamp: new Date(m.timestamp).getTime()
          })),
          analysisType: mode,
          documentId
        })
      })
      const data = await res.json()
      const result = data.result || data.analysis || data.response || 'Analysis complete.'
      onResult(result)
    } catch {
      onResult('Failed to analyze discussion. Please try again.')
    } finally {
      setIsLoading(false)
      setActiveMode(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">AI Facilitator</div>
          <div className="text-[11px] text-gray-500">Analyze the group discussion</div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{messages.length} message{messages.length !== 1 ? 's' : ''} in discussion</p>

      <div className="space-y-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => runAnalysis(action.id)}
            disabled={isLoading}
            className={`w-full text-left px-3.5 py-3 border border-gray-200 rounded-xl flex items-center gap-3 transition-all disabled:opacity-60 ${action.bg}`}
          >
            {isLoading && activeMode === action.id ? (
              <Loader2 className={`w-4 h-4 ${action.color} animate-spin flex-shrink-0`} />
            ) : (
              <action.icon className={`w-4 h-4 ${action.color} flex-shrink-0`} />
            )}
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ChatSidebar({
  documentId,
  currentUser,
  isOpen,
  onClose,
  topic = "General Discussion",
  onSendMessage,
  collaboration
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'ai' | 'help'>('chat')
  const [stuckRequests, setStuckRequests] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Use collaboration data if available, otherwise use local state
  const displayMessages = collaboration?.chatMessages || messages
  const displayTypingUsers = collaboration?.typingUsers || typingUsers
  const displayActiveUsers = collaboration?.activeUsers || activeUsers

  // Load existing messages and set up real-time updates
  useEffect(() => {
    if (isOpen && documentId) {
      loadMessages()

      // Join the chat room
      fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-document',
          documentId,
          userId: currentUser.id,
          userName: currentUser.name
        })
      })

      // Set up real-time polling for new messages
      const interval = setInterval(() => {
        loadMessages()
      }, 2000) // Poll every 2 seconds

      return () => {
        clearInterval(interval)
        // Leave the chat room
        fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave-document',
            documentId,
            userId: currentUser.id,
            userName: currentUser.name
          })
        })
      }
    }
  }, [isOpen, documentId, currentUser.id, currentUser.name])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, displayMessages, activeTab])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-messages',
          documentId
        })
      })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
        setTypingUsers(data.typingUsers || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async (isAiRequest: boolean = false) => {
    const content = isAiRequest ? aiQuestion : newMessage
    if (!content.trim() || isSending) return

    setIsSending(true)
    if (!isAiRequest) setNewMessage('')
    else setAiQuestion('')

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}_${currentUser.id}`,
      documentId,
      userId: currentUser.id,
      userName: currentUser.name,
      content: content.trim(),
      type: 'TEXT',
      timestamp: new Date().toISOString()
    }

    // Add message immediately for better UX
    setMessages(prev => [...prev, optimisticMessage])

    try {
      // Check for custom handler (e.g. for peer chat)
      if (onSendMessage && !isAiRequest) {
        onSendMessage(content.trim())
        setIsSending(false)
        return
      }

      // 1. Send user message via default socket
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          documentId,
          userId: currentUser.id,
          userName: currentUser.name,
          messageData: {
            content: content.trim(),
            type: 'TEXT'
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Replace optimistic message with real one
          setMessages(prev => prev.map(msg =>
            msg.id === optimisticMessage.id ? { ...msg, id: result.chatMessage.id } : msg
          ))
        }
      }

      // 2. If it's an AI request or explicitly tagged, trigger AI
      if (isAiRequest || content.toLowerCase().includes('@ai')) {
        setIsLoading(true)
        const aiResponse = await fetch('/api/ai-help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            question: content,
            userId: currentUser.id,
            context: `Topic: ${topic}` // Pass topic context
          })
        })

        const aiData = await aiResponse.json()
        const aiAnswer = aiData.response?.answer || aiData.answer || ''
        if (aiAnswer) {
          // Send AI response to socket so everyone sees it
          await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-message',
              documentId,
              userId: 'ai-assistant',
              userName: 'AI Facilitator',
              messageData: {
                content: aiAnswer,
                type: 'AI_RESPONSE'
              }
            })
          })

          // Also update local state immediately
          const aiMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            documentId,
            userId: 'ai-assistant',
            userName: 'AI Facilitator',
            content: aiAnswer,
            type: 'AI_RESPONSE',
            timestamp: new Date().toISOString()
          }
          setMessages(prev => [...prev, aiMessage])
        }
        setIsLoading(false)
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove optimistic message if absolutely failed (optional)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: 'chat' | 'ai') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (action === 'chat') sendMessage(false)
      else sendMessage(true)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Premium Icon Component
  const Avatar = ({ name, color, isAi }: { name: string, color?: string, isAi?: boolean }) => {
    if (isAi) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md ring-2 ring-white">
          <Sparkles className="h-4 w-4 text-white animate-pulse" />
        </div>
      )
    }
    return (
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white"
        style={{ backgroundColor: color || '#6B7280' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {(topic || 'U').replace('Chat with ', '').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[12px] font-semibold text-gray-900 leading-tight truncate">{topic}</h2>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
            {displayActiveUsers.length} online
          </p>
        </div>
        {/* Pill Tabs inline in header */}
        <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5 shrink-0">
          <button onClick={() => setActiveTab('chat')} className={cn("px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1", activeTab === 'chat' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <Users className="h-3 w-3" />Chat
          </button>
          <button onClick={() => setActiveTab('ai')} className={cn("px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1", activeTab === 'ai' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <Sparkles className="h-3 w-3" />AI
          </button>
          <button onClick={() => setActiveTab('help')} className={cn("px-2 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1", activeTab === 'help' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <HelpCircle className="h-3 w-3" />Help
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full shrink-0">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {activeTab === 'chat' && (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-4">
                {displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-[12px] font-medium text-gray-500">No messages yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Tag <span className="text-indigo-500 font-medium">@AI</span> to ask the facilitator</p>
                  </div>
                ) : (
                  displayMessages.map((message, i) => {
                    const isMe = message.userId === currentUser.id
                    const isAi = message.type === 'AI_RESPONSE'
                    const prevMsg = displayMessages[i - 1]
                    const isSequence = prevMsg && prevMsg.userId === message.userId && (new Date(message.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 60000

                    return (
                      <div key={message.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                        {!isSequence && (
                          <div className="flex items-center gap-2 mb-1 pl-1 pr-1">
                            {!isMe && (
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0",
                                isAi ? "bg-gradient-to-br from-indigo-500 to-purple-500" : "bg-gray-400"
                              )}>
                                {isAi ? <Sparkles className="w-2.5 h-2.5" /> : message.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[11px] font-medium text-gray-600">
                              {isMe ? 'You' : message.userName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "px-3 py-2 text-[13px] leading-[1.45] relative",
                          isMe
                            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                            : isAi
                              ? "bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm"
                              : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
                        )}>
                          {isAi && (
                            <div className="flex items-center gap-1 mb-1.5 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">
                              <Sparkles className="h-2.5 w-2.5" /> AI Facilitator
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">
                            {renderMarkdown(message.content)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                {displayTypingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-[12px] text-[#5f6368] italic pl-2">
                    <div className="flex gap-0.5 mt-1">
                      <div className="w-1 h-1 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1 h-1 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1 h-1 bg-[#5f6368] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    Someone is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 shrink-0">
              <div className="relative flex items-center bg-gray-50 rounded-xl px-3 py-1 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-300 transition-all border border-gray-200 focus-within:border-indigo-300">
                <Input
                  ref={chatInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'chat')}
                  placeholder="Message… tag @AI for help"
                  className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-8 text-[13px] px-1 w-full text-gray-800 placeholder:text-gray-400"
                  disabled={isSending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 rounded-lg shrink-0 ml-1 transition-colors",
                    newMessage.trim()
                      ? "text-indigo-600 hover:bg-indigo-50"
                      : "text-gray-300 hover:bg-transparent"
                  )}
                  onClick={() => sendMessage(false)}
                  disabled={!newMessage.trim() || isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <AiDiscussionTab
            messages={displayMessages}
            documentId={documentId}
            currentUser={currentUser}
            onResult={(result) => {
              const aiMessage: ChatMessage = {
                id: `ai_${Date.now()}`,
                documentId,
                userId: 'ai-assistant',
                userName: 'AI Facilitator',
                content: result,
                type: 'AI_RESPONSE',
                timestamp: new Date().toISOString()
              }
              setMessages(prev => [...prev, aiMessage])
              setActiveTab('chat')
            }}
          />
        )}

        {activeTab === 'help' && (
          <div className="flex-1 p-6 bg-[#f8f9fa] overflow-y-auto">
            <h3 className="text-[14px] font-medium text-[#202124] mb-4">Help Requests</h3>
            {stuckRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-[#188038] mx-auto mb-3 opacity-60" />
                <p className="text-[14px] text-[#202124]">Everyone is doing great</p>
                <p className="text-[13px] text-[#5f6368]">No open help requests right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stuckRequests.map((req, i) => (
                  <div key={i} className="bg-white border border-[#dadce0] rounded-lg p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#f29900]"></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[#f29900] bg-[#fef7e0] px-2 py-0.5 rounded-full">
                        Page {req.page}
                      </span>
                      <span className="text-[11px] text-[#5f6368]">{formatTime(req.timestamp)}</span>
                    </div>
                    <p className="text-[13px] text-[#202124] leading-relaxed">{req.description}</p>
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