'use client'

/**
 * LiveActivityFeed — Session Intelligence Panel
 *
 * Three-tab interface for PhD researchers:
 *
 *  Intelligence  — AI-synthesised epistemic diagnosis of the session:
 *                  shared confusion hotspots, contested passages,
 *                  per-section convergence/divergence status,
 *                  reading velocity gaps, and a synthesis insight.
 *
 *  Section Map   — Visual heatmap of collective attention per section.
 *                  Each row encodes struggle density, highlight count,
 *                  and discussion volume in one spatial overview.
 *
 *  Event Log     — Raw feed, filterable by event kind and collapsible
 *                  by section. No noise: page-change events are
 *                  suppressed unless explicitly requested.
 *
 * All data is real — zero hardcoded or fabricated content.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Eye, MessageSquare, Bot, BookOpen,
  AlertTriangle, Users, Clock,
  ExternalLink, FileSearch, Quote,
  Sparkles, Loader2, ChevronDown, ChevronRight,
  TrendingUp, Filter, RefreshCw, Zap, Activity,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityKind =
  | 'page-change'
  | 'highlight'
  | 'chat'
  | 'struggle'
  | 'intervention'
  | 'fact-check'
  | 'peer-routing'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  userName: string
  userId?: string
  sectionName?: string
  pageNumber?: number
  content: string
  subtext?: string
  timestamp: number
  dsValue?: number
  verdict?: 'supported' | 'refuted' | 'uncertain' | 'context-dependent'
}

type Tab = 'intelligence' | 'map' | 'log'

interface LiveActivityFeedProps {
  documentId: string
  isVisible: boolean
  onNavigateToPage?: (pageNumber: number) => void
  initialItems?: ActivityItem[]
  documentTitle?: string
  documentContent?: string
}

// ─── Intelligence API response types ─────────────────────────────────────────

interface Hotspot {
  section: string
  signal: string
  readerCount: number
  dominantSignal: 'struggle' | 'highlight' | 'discussion'
}

interface Contested {
  section: string
  tension: string
  readers: string[]
}

interface EpistemicStatus {
  section: string
  status: 'converging' | 'diverging' | 'unresolved' | 'understudied'
  rationale: string
}

interface Intelligence {
  hotspots: Hotspot[]
  contested: Contested[]
  epistemicStatus: EpistemicStatus[]
  velocityGap: string
  synthesisInsight: string
}

// ─── Section aggregate ────────────────────────────────────────────────────────

interface SectionAggregate {
  name: string
  struggles: number
  highlights: number
  chat: number
  interventions: number
  readers: Set<string>
  signal: number   // composite weight
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KIND_CONFIG: Record<ActivityKind, {
  icon: React.ComponentType<{ className?: string }>
  border: string
  badge: string
  label: string
}> = {
  'page-change':  { icon: Eye,          border: 'border-blue-100',   badge: 'bg-blue-50 text-blue-700',    label: 'Navigation'   },
  'highlight':    { icon: Quote,         border: 'border-indigo-100', badge: 'bg-indigo-50 text-indigo-700',label: 'Highlight'    },
  'chat':         { icon: MessageSquare, border: 'border-slate-100',  badge: 'bg-slate-50 text-slate-700',  label: 'Discussion'   },
  'struggle':     { icon: AlertTriangle, border: 'border-amber-100',  badge: 'bg-amber-50 text-amber-700',  label: 'Struggle'     },
  'intervention': { icon: Bot,           border: 'border-violet-100', badge: 'bg-violet-50 text-violet-700',label: 'Intervention' },
  'fact-check':   { icon: FileSearch,    border: 'border-teal-100',   badge: 'bg-teal-50 text-teal-700',    label: 'Fact-check'   },
  'peer-routing': { icon: Users,         border: 'border-rose-100',   badge: 'bg-rose-50 text-rose-700',    label: 'Peer routing' },
}

const VERDICT_COLOR: Record<string, string> = {
  supported:           'text-emerald-700',
  refuted:             'text-red-600',
  uncertain:           'text-amber-600',
  'context-dependent': 'text-blue-600',
}

const EPISTEMIC_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  converging:   { color: 'text-emerald-700', bg: 'bg-emerald-50',  label: 'Converging'   },
  diverging:    { color: 'text-rose-700',    bg: 'bg-rose-50',     label: 'Diverging'    },
  unresolved:   { color: 'text-amber-700',   bg: 'bg-amber-50',    label: 'Unresolved'   },
  understudied: { color: 'text-slate-500',   bg: 'bg-slate-50',    label: 'Understudied' },
}

const DOMINANT_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  struggle:    { color: 'text-amber-600',  icon: AlertTriangle },
  highlight:   { color: 'text-indigo-600', icon: Quote         },
  discussion:  { color: 'text-slate-600',  icon: MessageSquare },
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ─── Section aggregation ──────────────────────────────────────────────────────

function aggregateSections(activities: ActivityItem[]): SectionAggregate[] {
  const map = new Map<string, SectionAggregate>()

  const get = (name: string) => {
    const key = name || 'Unanchored'
    if (!map.has(key)) {
      map.set(key, { name: key, struggles: 0, highlights: 0, chat: 0, interventions: 0, readers: new Set(), signal: 0 })
    }
    return map.get(key)!
  }

  for (const a of activities) {
    const sec = get(a.sectionName || 'Unanchored')
    if (a.userName && a.userName !== 'CoRead' && !a.userName.startsWith('A')) {
      sec.readers.add(a.userName)
    }
    if (a.kind === 'struggle')     { sec.struggles++;     sec.signal += 3 }
    if (a.kind === 'highlight')    { sec.highlights++;    sec.signal += 2 }
    if (a.kind === 'chat')         { sec.chat++;          sec.signal += 1 }
    if (a.kind === 'intervention') { sec.interventions++; sec.signal += 2 }
  }

  return Array.from(map.values()).sort((a, b) => b.signal - a.signal)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IntelligenceTab({
  activities, documentTitle, documentContent,
}: {
  activities: ActivityItem[]
  documentTitle?: string
  documentContent?: string
}) {
  const [intel, setIntel] = useState<Intelligence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  const run = useCallback(async () => {
    if (activities.length === 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/activity-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: activities, documentTitle, documentContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setIntel(data.intelligence)
      setRan(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [activities, documentTitle, documentContent])

  // ── idle state ──
  if (!ran && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Session Intelligence</p>
          <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
            AI diagnoses collective epistemic state — hotspots, contested passages,
            convergence/divergence status, and reading velocity gaps.
          </p>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-slate-300">No events to analyse yet.</p>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyse {activities.length} events
          </button>
        )}
      </div>
    )
  }

  // ── loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="relative w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-violet-400" />
          <Loader2 className="w-4 h-4 text-violet-500 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">Analysing session…</p>
          <p className="text-xs text-slate-400 mt-0.5">Mapping confusion topology, reading velocity, epistemic state</p>
        </div>
      </div>
    )
  }

  // ── error ──
  if (error) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
        <button onClick={run} className="text-xs text-violet-600 hover:underline">Retry</button>
      </div>
    )
  }

  if (!intel) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">

      {/* Synthesis insight — most prominent */}
      {intel.synthesisInsight && (
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl px-4 py-3.5 text-white">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Key Pattern</p>
              <p className="text-sm leading-snug font-medium">{intel.synthesisInsight}</p>
            </div>
          </div>
          <button
            onClick={run}
            className="mt-3 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Re-analyse
          </button>
        </div>
      )}

      {/* Confusion hotspots */}
      {intel.hotspots?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50">
            <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Confusion Hotspots</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
              {intel.hotspots.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {intel.hotspots.map((h, i) => {
              const DomIcon = DOMINANT_CONFIG[h.dominantSignal]?.icon || AlertTriangle
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <DomIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${DOMINANT_CONFIG[h.dominantSignal]?.color || 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">§{h.section}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{h.readerCount} reader{h.readerCount !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{h.signal}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contested passages */}
      {intel.contested?.length > 0 && (
        <div className="bg-white border border-rose-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rose-50">
            <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center">
              <Users className="w-3 h-3 text-rose-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Interpretive Divergence</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600">
              {intel.contested.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {intel.contested.map((c, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-slate-500">§{c.section}</span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400">{c.readers.join(' vs. ')}</span>
                </div>
                <p className="text-xs text-slate-700 leading-snug italic">"{c.tension}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Epistemic status per section */}
      {intel.epistemicStatus?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50">
            <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center">
              <Activity className="w-3 h-3 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Epistemic Status</span>
          </div>
          <div className="divide-y divide-slate-50">
            {intel.epistemicStatus.map((e, i) => {
              const cfg = EPISTEMIC_CONFIG[e.status] || EPISTEMIC_CONFIG.unresolved
              return (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 mb-0.5 truncate">§{e.section}</p>
                    <p className="text-[11px] text-slate-500 leading-snug">{e.rationale}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Velocity gap */}
      {intel.velocityGap && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Reading Velocity</p>
            <p className="text-xs text-slate-600 leading-snug">{intel.velocityGap}</p>
          </div>
        </div>
      )}

    </motion.div>
  )
}

// ─── Section Map tab ──────────────────────────────────────────────────────────

function SectionMapTab({ activities, onNavigateToPage }: {
  activities: ActivityItem[]
  onNavigateToPage?: (page: number) => void
}) {
  const sections = useMemo(() => aggregateSections(activities), [activities])
  const maxSignal = Math.max(...sections.map(s => s.signal), 1)

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BookOpen className="w-8 h-8 text-slate-200" />
        <p className="text-xs text-slate-400">No section data yet — start reading to build the map.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Legend */}
      <div className="flex items-center gap-4 px-1 pb-2 border-b border-slate-100 mb-3">
        {[
          { color: 'bg-amber-400', label: 'Struggle' },
          { color: 'bg-indigo-400', label: 'Highlight' },
          { color: 'bg-slate-400', label: 'Discussion' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-sm ${l.color}`} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-slate-400">{sections.length} sections</span>
      </div>

      {sections.map(sec => {
        const barWidth = Math.round((sec.signal / maxSignal) * 100)
        const totalEvents = sec.struggles + sec.highlights + sec.chat + sec.interventions
        const strugglePct  = totalEvents ? (sec.struggles  / totalEvents) : 0
        const highlightPct = totalEvents ? (sec.highlights / totalEvents) : 0
        const chatPct      = totalEvents ? (sec.chat       / totalEvents) : 0

        return (
          <div key={sec.name} className="group">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              {/* Section name */}
              <div className="w-32 shrink-0">
                <p className="text-[11px] font-medium text-slate-700 truncate" title={sec.name}>
                  §{sec.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {sec.readers.size} reader{sec.readers.size !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Stacked bar */}
              <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden flex">
                {strugglePct > 0 && (
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.round(barWidth * strugglePct)}%` }}
                    title={`${sec.struggles} struggle${sec.struggles !== 1 ? 's' : ''}`}
                  />
                )}
                {highlightPct > 0 && (
                  <div
                    className="h-full bg-indigo-400 transition-all"
                    style={{ width: `${Math.round(barWidth * highlightPct)}%` }}
                    title={`${sec.highlights} highlight${sec.highlights !== 1 ? 's' : ''}`}
                  />
                )}
                {chatPct > 0 && (
                  <div
                    className="h-full bg-slate-400 transition-all"
                    style={{ width: `${Math.round(barWidth * chatPct)}%` }}
                    title={`${sec.chat} message${sec.chat !== 1 ? 's' : ''}`}
                  />
                )}
              </div>

              {/* Signal count */}
              <span className="text-[10px] font-mono text-slate-400 w-6 text-right shrink-0">
                {sec.signal}
              </span>
            </div>
          </div>
        )
      })}

      <p className="text-[10px] text-slate-300 text-right pt-2">
        Signal = struggles×3 + highlights×2 + interventions×2 + chat×1
      </p>
    </div>
  )
}

// ─── Event Log tab ────────────────────────────────────────────────────────────

const ALL_FILTER_KINDS: Array<{ kind: ActivityKind | 'all'; label: string }> = [
  { kind: 'all',          label: 'All'          },
  { kind: 'struggle',     label: 'Struggles'    },
  { kind: 'highlight',    label: 'Highlights'   },
  { kind: 'chat',         label: 'Discussion'   },
  { kind: 'intervention', label: 'Interventions'},
  { kind: 'fact-check',   label: 'Fact-checks'  },
  { kind: 'peer-routing', label: 'Routing'      },
]

function EventLogTab({ activities, onNavigateToPage }: {
  activities: ActivityItem[]
  onNavigateToPage?: (page: number) => void
}) {
  const [filter, setFilter] = useState<ActivityKind | 'all'>('all')
  const [showPageChanges, setShowPageChanges] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (!showPageChanges && a.kind === 'page-change') return false
      if (filter === 'all') return true
      return a.kind === filter
    })
  }, [activities, filter, showPageChanges])

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>()
    for (const a of filtered) {
      const key = a.sectionName || 'Unanchored'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries())
  }, [filtered])

  const toggleSection = (name: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BookOpen className="w-8 h-8 text-slate-200" />
        <p className="text-xs font-semibold text-slate-400">No activity yet this session</p>
        <p className="text-[11px] text-slate-300 max-w-[220px] leading-relaxed">
          Events appear as readers move, highlight, chat, or trigger agent interventions.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Filter strip */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-100">
        {ALL_FILTER_KINDS.map(f => (
          <button
            key={f.kind}
            onClick={() => setFilter(f.kind)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
              filter === f.kind
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowPageChanges(v => !v)}
          className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
            showPageChanges
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
          }`}
        >
          {showPageChanges ? 'Hide' : 'Show'} navigation
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">No events match this filter.</p>
      ) : (
        <div className="space-y-2">
          {grouped.map(([sectionName, items]) => {
            const isCollapsed = collapsed.has(sectionName)
            return (
              <div key={sectionName} className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(sectionName)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  }
                  <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">
                    §{sectionName}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">{items.length} event{items.length !== 1 ? 's' : ''}</span>
                </button>

                {/* Events */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-50">
                    {items.map(item => {
                      const cfg = KIND_CONFIG[item.kind]
                      const Icon = cfg.icon
                      return (
                        <div key={item.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50/50 transition-colors">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cfg.badge}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="text-[11px] font-semibold text-slate-800 truncate">{item.userName}</span>
                              {item.pageNumber && onNavigateToPage && (
                                <button
                                  onClick={() => onNavigateToPage(item.pageNumber!)}
                                  className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  p.{item.pageNumber}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700 leading-snug">{item.content}</p>
                            {item.subtext && (
                              <p className={`text-[10px] mt-0.5 leading-snug ${
                                item.verdict ? VERDICT_COLOR[item.verdict] ?? 'text-slate-400' : 'text-slate-400'
                              }`}>
                                {item.subtext}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-2.5 h-2.5 text-slate-300" />
                              <span className="text-[10px] text-slate-300">{timeAgo(item.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function LiveActivityFeed({
  documentId,
  isVisible,
  onNavigateToPage,
  initialItems,
  documentTitle,
  documentContent,
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialItems ?? [])
  const [paused, setPaused] = useState(false)
  const [tab, setTab] = useState<Tab>('intelligence')
  const pausedRef = useRef(false)

  // Merge initialItems without duplicates (for re-seeding on reopen)
  const prevInitialRef = useRef<ActivityItem[] | undefined>(undefined)
  useEffect(() => {
    if (!initialItems || initialItems === prevInitialRef.current) return
    prevInitialRef.current = initialItems
    setActivities(prev => {
      const existingIds = new Set(prev.map(p => p.id))
      const newOnes = initialItems.filter(i => !existingIds.has(i.id))
      if (newOnes.length === 0) return prev
      return [...prev, ...newOnes].sort((a, b) => b.timestamp - a.timestamp).slice(0, 60)
    })
  }, [initialItems])

  const push = useCallback((item: ActivityItem) => {
    if (pausedRef.current) return
    setActivities(prev => {
      const isDupe = prev.some(p =>
        p.userId === item.userId &&
        p.kind === item.kind &&
        p.content === item.content &&
        item.timestamp - p.timestamp < 60_000
      )
      if (isDupe) return prev
      return [item, ...prev].slice(0, 60)
    })
  }, [])

  useEffect(() => { pausedRef.current = paused }, [paused])

  // ── Event listeners — always active (feed stays mounted) ─────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStruggle = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      push({
        id: `struggle-${Date.now()}`,
        kind: 'struggle',
        userName: d.userName || 'A reader',
        userId: d.userId,
        sectionName: d.sectionName,
        pageNumber: d.pageNumber,
        content: `D_s elevated in §${d.sectionName || 'current section'}`,
        subtext: `D_s = ${typeof d.dsValue === 'number' ? d.dsValue.toFixed(2) : '≥ τ_fire'} · ${d.severity || 'medium'} severity`,
        timestamp: Date.now(),
        dsValue: d.dsValue,
      })
    }

    const onNotification = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      push({
        id: `notif-${d.id || Date.now()}`,
        kind: 'intervention',
        userName: 'CoRead',
        sectionName: d.sectionName,
        content: d.title,
        subtext: d.message,
        timestamp: d.timestamp || Date.now(),
      })
    }

    const onFactCheck = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      push({
        id: `fc-${Date.now()}`,
        kind: 'fact-check',
        userName: 'A8 · Fact Check',
        content: `"${(d.claim as string)?.slice(0, 80)}${(d.claim as string)?.length > 80 ? '…' : ''}"`,
        subtext: `${d.verdict} · ${Math.round((d.confidence ?? 0) * 100)}% confidence`,
        timestamp: Date.now(),
        verdict: d.verdict,
      })
    }

    const onPeerRouting = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      push({
        id: `route-${Date.now()}`,
        kind: 'peer-routing',
        userName: d.fromUserName || 'A reader',
        userId: d.fromUserId,
        sectionName: d.sectionName,
        content: `Routed to ${d.toUserName || 'a peer'} for §${d.sectionName || 'this section'}`,
        subtext: d.reason || 'D_s ≥ τ_high — peer expertise match',
        timestamp: Date.now(),
      })
    }

    const onPageChange = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d?.userName || d.userName === 'self') return
      push({
        id: `page-${d.userId}-${Date.now()}`,
        kind: 'page-change',
        userName: d.userName,
        userId: d.userId,
        sectionName: d.sectionName,
        pageNumber: d.pageNumber,
        content: `moved to p.${d.pageNumber}${d.sectionName ? ` · §${d.sectionName}` : ''}`,
        timestamp: Date.now(),
      })
    }

    const onPeerHighlight = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d?.userName) return
      push({
        id: `hl-${d.id || Date.now()}`,
        kind: 'highlight',
        userName: d.userName,
        userId: d.userId,
        pageNumber: d.pageNumber,
        sectionName: d.sectionName,
        content: `highlighted on p.${d.pageNumber}`,
        subtext: d.text ? `"${(d.text as string).slice(0, 100)}${(d.text as string).length > 100 ? '…' : ''}"` : undefined,
        timestamp: Date.now(),
      })
    }

    const onPeerChat = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d?.fromUserName) return
      push({
        id: `chat-${Date.now()}`,
        kind: 'chat',
        userName: d.fromUserName,
        userId: d.fromUserId,
        sectionName: d.sectionName,
        content: (d.message as string)?.slice(0, 140) || '',
        timestamp: d.timestamp || Date.now(),
      })
    }

    window.addEventListener('agent1:struggle-detected',     onStruggle)
    window.addEventListener('agent1:implicit-struggle',     onStruggle)
    window.addEventListener('agent7:notification',          onNotification)
    window.addEventListener('agent8:fact-check-complete',   onFactCheck)
    window.addEventListener('agent2:peer-routing',          onPeerRouting)
    window.addEventListener('live-activity:page-change',    onPageChange)
    window.addEventListener('live-activity:peer-highlight', onPeerHighlight)
    window.addEventListener('live-activity:peer-chat',      onPeerChat)

    return () => {
      window.removeEventListener('agent1:struggle-detected',     onStruggle)
      window.removeEventListener('agent1:implicit-struggle',     onStruggle)
      window.removeEventListener('agent7:notification',          onNotification)
      window.removeEventListener('agent8:fact-check-complete',   onFactCheck)
      window.removeEventListener('agent2:peer-routing',          onPeerRouting)
      window.removeEventListener('live-activity:page-change',    onPageChange)
      window.removeEventListener('live-activity:peer-highlight', onPeerHighlight)
      window.removeEventListener('live-activity:peer-chat',      onPeerChat)
    }
  }, [push])

  if (!isVisible) return null

  const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'intelligence', label: 'Intelligence', icon: Sparkles   },
    { id: 'map',          label: 'Section Map',  icon: Activity   },
    { id: 'log',          label: 'Event Log',    icon: Filter     },
  ]

  return (
    <div className="w-full h-full flex flex-col">

      {/* Tab bar + status */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}`} />
          <button
            onClick={() => setPaused(v => !v)}
            className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {tab === 'intelligence' && (
            <motion.div key="intelligence" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IntelligenceTab
                activities={activities}
                documentTitle={documentTitle}
                documentContent={documentContent}
              />
            </motion.div>
          )}
          {tab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SectionMapTab activities={activities} onNavigateToPage={onNavigateToPage} />
            </motion.div>
          )}
          {tab === 'log' && (
            <motion.div key="log" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <EventLogTab activities={activities} onNavigateToPage={onNavigateToPage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Emit a live-activity event from anywhere in the system.
 * Used by ApryseWebViewer to bridge Socket.IO events into the feed.
 */
export function emitLiveActivity(
  kind: 'page-change' | 'peer-highlight' | 'peer-chat',
  detail: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(`live-activity:${kind}`, { detail }))
}
