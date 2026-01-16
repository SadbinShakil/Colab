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
  Zap, Hash, GraduationCap
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
        if (aiData.answer) {
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
                content: aiData.answer,
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
            content: aiData.answer,
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
    <div className="w-full md:w-[380px] h-full flex flex-col bg-white/90 backdrop-blur-xl border-l border-white/20 shadow-2xl relative">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 leading-tight">Discussion</h2>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                {displayActiveUsers.length} online <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100 rounded-full h-8 w-8">
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Topic Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
          <Hash className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium text-blue-700 truncate">{topic}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 px-4 py-3">
        <div className="bg-gray-100/80 p-1 rounded-xl flex gap-1">
          {['chat', 'ai', 'help'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold capitalize transition-all duration-200 flex items-center justify-center gap-2",
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
              )}
            >
              {tab === 'chat' && <Users className="h-3.5 w-3.5" />}
              {tab === 'ai' && <Sparkles className="h-3.5 w-3.5" />}
              {tab === 'help' && <HelpCircle className="h-3.5 w-3.5" />}
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {activeTab === 'chat' && (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-6">
                {displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Start the Conversation</h3>
                    <p className="text-xs text-gray-500">
                      Discussing <span className="font-medium text-blue-600">{topic}</span>.
                      Ask questions, share insights, or tag @AI for help!
                    </p>
                  </div>
                ) : (
                  displayMessages.map((message, i) => {
                    const isMe = message.userId === currentUser.id
                    const isAi = message.type === 'AI_RESPONSE'
                    const prevMsg = displayMessages[i - 1]
                    const isSequence = prevMsg && prevMsg.userId === message.userId && (new Date(message.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 60000

                    return (
                      <div key={message.id} className={cn("flex gap-3 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                        {!isSequence && (
                          <div className="flex-shrink-0 mt-1">
                            <Avatar name={message.userName} color={isMe ? currentUser.color : undefined} isAi={isAi} />
                          </div>
                        )}
                        <div className={cn("flex flex-col", isSequence ? (!isMe ? "ml-11" : "mr-11") : "")}>
                          {!isSequence && (
                            <span className={cn("text-[10px] text-gray-400 mb-1 px-1", isMe ? "text-right" : "")}>
                              {message.userName} • {formatTime(message.timestamp)}
                            </span>
                          )}
                          <div className={cn(
                            "rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed",
                            isMe
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                              : isAi
                                ? "bg-gradient-to-br from-white to-purple-50 border border-purple-100 text-gray-800 rounded-tl-sm ring-1 ring-purple-100"
                                : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                          )}>
                            {isAi && (
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                                <Sparkles className="h-3 w-3" /> AI Insight
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                {displayTypingUsers.length > 0 && (
                  <div className="flex items-center gap-2 ml-1 text-xs text-gray-400 animate-pulse px-4">
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    {displayTypingUsers.length} typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 bg-white/50 backdrop-blur-md border-t border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Input
                  ref={chatInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'chat')}
                  placeholder={`Type @AI to ask the facilitator...`}
                  className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-9 text-sm"
                  disabled={isSending}
                />
                <div className="flex items-center gap-1 pr-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                    title="Ask AI Facilitator"
                    onClick={() => {
                      setNewMessage('@AI ' + newMessage)
                      chatInputRef.current?.focus()
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className={cn("h-8 w-8 rounded-lg transition-all", newMessage.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-200 text-gray-400")}
                    onClick={() => sendMessage(false)}
                    disabled={!newMessage.trim() || isSending}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-center text-gray-400">
                AI Facilitator is active. Tag <strong className="text-purple-500">@AI</strong> for help.
              </p>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Research Facilitator</h3>
              <p className="text-sm text-gray-500 max-w-[260px]">
                I can explain complex concepts, summarize findings, and help you connect with the right topic.
              </p>

              <div className="grid grid-cols-1 gap-2 w-full mt-6">
                {[
                  "Explain this section deeply",
                  "What is the main contribution?",
                  "Connect this to related work",
                  "Summarize for a novice"
                ].map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-xs h-9 bg-white hover:bg-purple-50 hover:text-purple-700 border-gray-200"
                    onClick={() => {
                      setAiQuestion(q)
                      // Switch to chat and send as AI request
                      setActiveTab('chat')
                      sendMessage(true)
                    }}
                  >
                    <MessageCircleQuestion className="mr-2 h-3.5 w-3.5 opacity-60" />
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="flex-1 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Help Requests</h3>
                <p className="text-xs text-gray-500">Stuck? See where others need help.</p>
              </div>
            </div>

            {stuckRequests.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                <p className="text-sm text-gray-500 font-medium">No open help requests</p>
                <p className="text-xs text-gray-400 mt-1">You're doing great availability!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stuckRequests.map((req, i) => (
                  <Card key={i} className="border-l-4 border-l-orange-500 shadow-sm overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5">
                          Page {req.page}
                        </Badge>
                        <span className="text-[10px] text-gray-400">{formatTime(req.timestamp)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{req.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}