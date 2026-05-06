// components/SmartHelpPanel.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, ChevronLeft, Loader2, Brain, Users, BookOpen, AlertTriangle, Wrench, FileSearch, MessageSquare, Map } from 'lucide-react'
import ReadingTrajectoryMap from './ReadingTrajectoryMap'

interface ConfusedHighlight {
  id: string
  text: string
  sectionId: string
  page: number
}

interface PeerInfo {
  userId: string
  userName: string
  status: 'online' | 'offline' | 'busy'
  isProficient: boolean
}

interface SmartHelpPanelProps {
  isOpen: boolean
  onClose: () => void
  confusedHighlights: ConfusedHighlight[]
  sectionName: string
  userId: string
  userName: string
  availablePeers: PeerInfo[]
  documentId: string
  sectionId?: string
  sectionText?: string
  initialQuestion?: string
  onSendInvitation?: (peerId: string, peerName: string) => void
}

type Tab = 'ai' | 'peers' | 'group' | 'map'

interface Message { role: 'user' | 'ai'; content: string }

export default function SmartHelpPanel({
  isOpen,
  onClose,
  confusedHighlights,
  sectionName,
  userId,
  userName,
  availablePeers,
  documentId,
  sectionId,
  sectionText,
  initialQuestion,
  onSendInvitation,
}: SmartHelpPanelProps) {
  const [tab, setTab] = useState<Tab>('ai')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPeer, setSelectedPeer] = useState<PeerInfo | null>(null)
  const [invitedPeers, setInvitedPeers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true
      setMessages([])
      setSelectedPeer(null)
      setTab('ai')
      if (initialQuestion) {
        setTimeout(() => sendMessage(initialQuestion), 100)
      }
    }
    if (!isOpen) {
      initializedRef.current = false
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = () => {
    if (confusedHighlights.length > 0) {
      return confusedHighlights.map(h => `"${h.text}"`).join('\n')
    }
    return sectionText || `§${sectionName}`
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: buildContext(),
          sectionName,
          documentContent: sectionText,
          conversationHistory: messages,
          userId,
          userName,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.response || 'A6 returned no response.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'A6 error — check console.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const onlinePeers = availablePeers.filter(p => p.status === 'online')
  const sharedStruggle = availablePeers.filter(p => !p.isProficient && p.status === 'online')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative pointer-events-auto flex flex-col bg-white h-full w-[440px] shadow-2xl"
        style={{ borderLeft: '1px solid rgba(0,0,0,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3.5 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">A6 · Section Analysis</span>
              </div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">§{sectionName}</h2>
              {confusedHighlights.length > 0 && (
                <p className="text-[11px] text-amber-600 mt-0.5">
                  {confusedHighlights.length} confusion mark{confusedHighlights.length > 1 ? 's' : ''} in this section
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 mt-3.5 rounded-xl bg-slate-100 p-0.5">
            {([
              { id: 'ai', icon: Brain, label: 'AI Analysis' },
              { id: 'peers', icon: Users, label: `Peers${onlinePeers.length > 0 ? ` · ${onlinePeers.length}` : ''}` },
              { id: 'group', icon: BookOpen, label: 'Group' },
              { id: 'map', icon: Map, label: 'Map' },
            ] as { id: Tab; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setSelectedPeer(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all ${
                  tab === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
                {id === 'group' && sharedStruggle.length >= 2 && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── AI Tab ── */}
        {tab === 'ai' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-0.5">
                    Analysis angles
                  </p>
                  {[
                    {
                      icon: Wrench,
                      label: 'Unpack the mechanism',
                      sub: 'Causal chain + implicit assumptions',
                      color: 'border-indigo-100 hover:bg-indigo-50/60 text-indigo-700',
                      query: `In §${sectionName}: trace the complete causal mechanism step by step. For each step name what is happening, why, and what the authors leave implicit. Where does this mechanism connect to elsewhere in the paper?`,
                    },
                    {
                      icon: AlertTriangle,
                      label: 'Evaluate rigour',
                      sub: 'Sample size, controls, statistics',
                      color: 'border-amber-100 hover:bg-amber-50/60 text-amber-700',
                      query: `In §${sectionName}: what is the weakest methodological choice? Assess sample size, controls, measures, and statistical approach. Be direct — do not soften the critique.`,
                    },
                    {
                      icon: FileSearch,
                      label: 'Position in the literature',
                      sub: 'Prior work, novelty, gap',
                      color: 'border-violet-100 hover:bg-violet-50/60 text-violet-700',
                      query: `In §${sectionName}: what prior work does this claim most directly build on or contradict? What exactly changes about our understanding of this problem?`,
                    },
                    {
                      icon: MessageSquare,
                      label: 'Find the overreach',
                      sub: 'Evidence-to-claim gap',
                      color: 'border-rose-100 hover:bg-rose-50/60 text-rose-700',
                      query: `In §${sectionName}: identify the claim with the largest gap between the evidence presented and the conclusion drawn. Quote the specific sentence and explain what additional evidence would be needed.`,
                    },
                  ].map(({ icon: Icon, label, sub, color, query }) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(query)}
                      className={`w-full text-left px-3.5 py-3 bg-white border rounded-xl transition-all ${color}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                        <div>
                          <p className="text-[12.5px] font-semibold leading-tight text-slate-800">{label}</p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{sub}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {confusedHighlights.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">
                        Your marked passages
                      </p>
                      {confusedHighlights.slice(0, 3).map((h, i) => (
                        <button
                          key={h.id}
                          onClick={() => sendMessage(`Interrogate this passage from §${sectionName}: "${h.text.slice(0, 120)}". What is the load-bearing assumption and what evidence would be needed to validate it?`)}
                          className="w-full text-left mb-1.5 px-3 py-2 rounded-lg border border-amber-100 bg-amber-50/40 hover:bg-amber-50 text-[11.5px] text-slate-700 leading-snug transition-colors"
                        >
                          <span className="text-amber-500 font-mono mr-1">#{i + 1}</span>
                          "{h.text.slice(0, 80)}{h.text.length > 80 ? '…' : ''}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'ai' && (
                      <p className="text-[9.5px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">A6 · CoRead</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                      <span className="text-[11px] text-slate-400">A6 · analysing</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white">
              <div className="flex gap-2 items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                  placeholder="Ask about this section…"
                  className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Peers Tab ── */}
        {tab === 'peers' && (
          <div className="flex-1 overflow-y-auto">
            {!selectedPeer ? (
              <div className="px-4 py-3 space-y-2">
                {onlinePeers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700">No collaborators online</p>
                      <p className="text-[11.5px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                        Peer routing activates when another researcher joins this session
                      </p>
                    </div>
                    <button
                      onClick={() => setTab('ai')}
                      className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Use A6 analysis instead →
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1 px-0.5">
                      {onlinePeers.length} collaborator{onlinePeers.length > 1 ? 's' : ''} in session
                    </p>
                    {onlinePeers.map(peer => (
                      <div
                        key={peer.userId}
                        className="bg-white border border-slate-100 rounded-xl p-3.5 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[13px] font-semibold text-indigo-700">
                                {peer.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 leading-tight">{peer.userName}</p>
                              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                {peer.isProficient
                                  ? 'Passed this section — can explain'
                                  : 'Also reading this section'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setSelectedPeer(peer)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11.5px] font-medium text-slate-700 transition-colors"
                            >
                              Message
                            </button>
                            {onSendInvitation && !invitedPeers.has(peer.userId) && (
                              <button
                                onClick={() => {
                                  onSendInvitation(peer.userId, peer.userName)
                                  setInvitedPeers(prev => new Set(prev).add(peer.userId))
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[11.5px] font-medium text-white transition-colors"
                              >
                                Route
                              </button>
                            )}
                            {invitedPeers.has(peer.userId) && (
                              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[11.5px] font-medium text-emerald-600">
                                Routed ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10.5px] text-slate-400 px-0.5 pt-1 leading-relaxed">
                      A2 · Peer routing — CoRead will suggest the best collaborator based on section expertise and D_s alignment.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPeer(null)}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">{selectedPeer.userName}</p>
                    <p className="text-[11px] text-emerald-500">online</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-[13px] font-semibold text-slate-600">Peer chat</p>
                  <p className="text-[11.5px] text-slate-400 leading-relaxed">
                    Direct peer messaging via Socket.IO will be connected here.
                    Use the chat panel (bottom toolbar) to reach {selectedPeer.userName} in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Map Tab ── */}
        {tab === 'map' && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <ReadingTrajectoryMap
              documentId={documentId}
              currentUserId={userId}
              currentSectionId={sectionId}
            />
          </div>
        )}

        {/* ── Group Tab ── */}
        {tab === 'group' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {sharedStruggle.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">Group study mode inactive</p>
                  <p className="text-[11.5px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Activates when ≥2 readers in the same session have elevated D_s on this section simultaneously
                  </p>
                </div>
                <div className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-left mt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current signals</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-600">Readers on §{sectionName}</span>
                    <span className="text-[12px] font-semibold text-slate-800">{availablePeers.length + 1}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[12px] text-slate-600">D_s elevated</span>
                    <span className="text-[12px] font-semibold text-slate-800">{sharedStruggle.length + 1}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[12px] text-slate-600">Threshold</span>
                    <span className="text-[12px] font-semibold text-slate-400">≥2 required</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(79,70,229,0.12)' }}
                >
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">A3 · Group study mode</p>
                  <p className="text-[13px] font-semibold text-slate-800">Shared confusion detected</p>
                  <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                    {sharedStruggle.length + 1} readers have elevated D_s on §{sectionName} simultaneously.
                    This is a strong signal — route to a peer, not AI.
                  </p>
                </div>

                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-0.5">
                  Readers with elevated D_s
                </p>
                {sharedStruggle.map(peer => (
                  <div key={peer.userId} className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[12px] font-semibold text-amber-700">
                        {peer.userName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-[13px] font-medium text-slate-800">{peer.userName}</p>
                    </div>
                    <span className="text-[10.5px] text-amber-600 font-medium">D_s elevated</span>
                  </div>
                ))}

                <button
                  onClick={() => setTab('peers')}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-colors"
                >
                  Route to peers →
                </button>

                <p className="text-[10.5px] text-slate-400 leading-relaxed px-0.5">
                  A3 will surface a paper-specific discussion prompt anchored to §{sectionName} to seed the group conversation.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
