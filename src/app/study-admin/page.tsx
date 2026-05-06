'use client'
import { useEffect, useState } from 'react'
import {
  Users, Clock, Sparkles, Bell, BellOff, MessageSquare,
  TrendingUp, FileText, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Activity, Download, Flame, Brain, Trophy, GitMerge
} from 'lucide-react'

interface CohortAnalytics {
  summary: { totalConfusions: number; totalPeerSessions: number; totalConsensusCheckpoints: number; totalMarginalNotes: number; avgDsReduction: number }
  passageHeatmap: { sectionId: string; sectionName: string; confusionCount: number; uniqueReaders: number; resolutionRate: number; topConcept: string }[]
  peerEffectiveness: { helperName: string; helpeeName: string; sessions: number; avgDsReduction: number; resolutionRate: number; avgRating: number | null }[]
  conceptBottlenecks: { concept: string; sectionName: string; affectedReaders: number; occurrences: number; resolutionRate: number }[]
  teachingLeaderboard: { userId: string; name: string; sessions: number; avgDsReduction: number; resolutionRate: number }[]
  consensusCheckpoints: { sectionName: string; agreedMeaning: string; contributors: { userId: string; userName: string }[]; createdAt: string }[]
}

interface StudyEvent {
  eventType: string
  participantId: string
  sessionId: string
  condition: string
  paperId: string
  timestamp: number
  data?: Record<string, any>
}

interface SessionSummary {
  participantId: string
  condition: string
  paperId: string
  sessionId: string
  filename: string
  totalEvents: number
  duration_min: number
  highlights: number
  confusionHighlights: number
  aiHelpInvoked: number
  notificationsShown: number
  notificationsClicked: number
  notificationsDismissed: number
  struggleDetected: number
  peerChatInvited: number
  peerChatAccepted: number
  summaryOpened: boolean
  aiTimingAccuracy: number
}

function summarize(filename: string, events: StudyEvent[]): SessionSummary {
  const start = events.find(e => e.eventType === 'session_start')?.timestamp || events[0]?.timestamp
  const end = events[events.length - 1]?.timestamp
  const duration_min = start && end ? Math.round((end - start) / 60000) : 0
  const highlights = events.filter(e => e.eventType === 'highlight_created').length
  const confusionHighlights = events.filter(e => e.eventType === 'highlight_created' && e.data?.reason === 'confusion').length
  const aiHelpInvoked = events.filter(e => e.eventType === 'ai_help_invoked').length
  const notificationsShown = events.filter(e => e.eventType === 'notification_shown').length
  const notificationsClicked = events.filter(e => e.eventType === 'notification_clicked').length
  const notificationsDismissed = events.filter(e => e.eventType === 'notification_dismissed').length
  const struggleDetected = events.filter(e => e.eventType === 'struggle_detected').length
  const peerChatInvited = events.filter(e => e.eventType === 'peer_chat_invited').length
  const peerChatAccepted = events.filter(e => e.eventType === 'peer_chat_accepted').length
  const summaryOpened = events.some(e => e.eventType === 'post_summary_opened')
  const aiTimingAccuracy = notificationsShown > 0 ? Math.round((notificationsClicked / notificationsShown) * 100) : 0
  const first = events[0]
  return {
    participantId: first?.participantId || '—',
    condition: first?.condition || '—',
    paperId: first?.paperId || '—',
    sessionId: first?.sessionId || '—',
    filename,
    totalEvents: events.length,
    duration_min,
    highlights,
    confusionHighlights,
    aiHelpInvoked,
    notificationsShown,
    notificationsClicked,
    notificationsDismissed,
    struggleDetected,
    peerChatInvited,
    peerChatAccepted,
    summaryOpened,
    aiTimingAccuracy,
  }
}

function avg(arr: number[]): string {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—'
}

function StatCard({
  label, value, sub, icon: Icon, color, bg
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'coread' | 'baseline' | 'neutral' }) {
  const styles = {
    coread: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    baseline: 'bg-slate-100 text-slate-600 border-slate-200',
    neutral: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  )
}

const COLUMNS = [
  { key: 'participantId', label: 'Participant' },
  { key: 'condition', label: 'Condition' },
  { key: 'paperId', label: 'Paper' },
  { key: 'duration_min', label: 'Duration' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'confusionHighlights', label: 'Confused' },
  { key: 'aiHelpInvoked', label: 'AI Help' },
  { key: 'notificationsShown', label: 'Notif.' },
  { key: 'aiTimingAccuracy', label: 'Timing %' },
  { key: 'struggleDetected', label: 'Struggle' },
  { key: 'peerChatInvited', label: 'Peer Inv.' },
  { key: 'peerChatAccepted', label: 'Peer Acc.' },
  { key: 'summaryOpened', label: 'Summary' },
]

export default function StudyAdminPage() {
  const [summaries, setSummaries] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [rawFiles, setRawFiles] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<string>('participantId')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterCondition, setFilterCondition] = useState<'all' | 'coread' | 'baseline'>('all')
  const [cohortAnalytics, setCohortAnalytics] = useState<CohortAnalytics | null>(null)
  const [loadingCohort, setLoadingCohort] = useState(false)
  const [cohortPaperId, setCohortPaperId] = useState('')
  const [cohortError, setCohortError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/study-log')
      .then(r => r.json())
      .then(async ({ files }) => {
        setRawFiles(files || [])
        const results: SessionSummary[] = []
        for (const file of (files || [])) {
          try {
            const res = await fetch(`/api/study-log?file=${encodeURIComponent(file)}`)
            if (!res.ok) continue
            const data = await res.json()
            results.push(summarize(file, data.events || []))
          } catch {}
        }
        setSummaries(results)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const loadCohortAnalytics = async () => {
    const pid = cohortPaperId.trim()
    if (!pid) { setCohortError('Enter a paper ID'); return }
    setCohortError('')
    setLoadingCohort(true)
    setCohortAnalytics(null)
    try {
      const res = await fetch(`/api/cohort-analytics?paperId=${encodeURIComponent(pid)}`)
      const data = await res.json()
      if (!res.ok) { setCohortError(data.error || 'Failed to load'); setLoadingCohort(false); return }
      setCohortAnalytics(data)
    } catch {
      setCohortError('Network error')
    }
    setLoadingCohort(false)
  }

  const coread = summaries.filter(s => s.condition === 'coread')
  const baseline = summaries.filter(s => s.condition === 'baseline')

  const filtered = summaries
    .filter(s => filterCondition === 'all' ? true : s.condition === filterCondition)
    .sort((a: any, b: any) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'boolean') return sortAsc ? (av === bv ? 0 : av ? -1 : 1) : (av === bv ? 0 : av ? 1 : -1)
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const exportCSV = () => {
    const header = COLUMNS.map(c => c.label).join(',')
    const rows = summaries.map(s =>
      [s.participantId, s.condition, s.paperId, s.duration_min, s.highlights,
       s.confusionHighlights, s.aiHelpInvoked, s.notificationsShown, s.aiTimingAccuracy,
       s.struggleDetected, s.peerChatInvited, s.peerChatAccepted, s.summaryOpened ? 1 : 0
      ].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `coread-study-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">CoRead</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-sm text-slate-500">Study Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={summaries.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading session data…</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Summary strip */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold text-slate-900">
                  {summaries.length} session{summaries.length !== 1 ? 's' : ''} collected
                </h1>
                <span className="text-xs text-slate-400">{rawFiles.length} raw files · /study-data/</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Sessions" value={summaries.length} sub={`${coread.length} CoRead · ${baseline.length} Baseline`} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Avg. Duration" value={`${avg(summaries.map(s => s.duration_min))}m`} sub="per session" icon={Clock} color="text-teal-600" bg="bg-teal-50" />
                <StatCard label="AI Timing Accuracy" value={`${avg(coread.map(s => s.aiTimingAccuracy))}%`} sub="CoRead only — click rate" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Avg. AI Help" value={avg(coread.map(s => s.aiHelpInvoked))} sub="invocations per session" icon={Sparkles} color="text-violet-600" bg="bg-violet-50" />
              </div>
            </div>

            {/* CoRead vs Baseline comparison */}
            {summaries.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-800">CoRead vs Baseline — Aggregate</h2>
                  <span className="ml-auto text-xs text-slate-400">averages per session</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 w-64">Metric</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-indigo-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                            CoRead (n={coread.length})
                          </span>
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                            Baseline (n={baseline.length})
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Session duration (min)', avg(coread.map(s => s.duration_min)), avg(baseline.map(s => s.duration_min)), false],
                        ['Total highlights', avg(coread.map(s => s.highlights)), avg(baseline.map(s => s.highlights)), false],
                        ['Confusion highlights', avg(coread.map(s => s.confusionHighlights)), avg(baseline.map(s => s.confusionHighlights)), false],
                        ['AI help invocations', avg(coread.map(s => s.aiHelpInvoked)), '—', true],
                        ['Notifications shown', avg(coread.map(s => s.notificationsShown)), '—', true],
                        ['AI timing accuracy (%)', avg(coread.map(s => s.aiTimingAccuracy)), '—', true],
                        ['Struggle events detected', avg(coread.map(s => s.struggleDetected)), '—', true],
                        ['Peer chat invitations', avg(coread.map(s => s.peerChatInvited)), '—', true],
                        ['Peer chat accepted', avg(coread.map(s => s.peerChatAccepted)), '—', true],
                        [`Post-summary opened`, `${coread.filter(s => s.summaryOpened).length}/${coread.length}`, '—', true],
                      ].map(([metric, cr, bl, coreadOnly], i) => (
                        <tr key={String(metric)} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-5 py-2.5 text-xs text-slate-700 font-medium">{metric}</td>
                          <td className="px-5 py-2.5">
                            <span className="text-sm font-semibold text-indigo-700">{cr}</span>
                          </td>
                          <td className="px-5 py-2.5">
                            {coreadOnly
                              ? <span className="text-xs text-slate-300 italic">CoRead only</span>
                              : <span className="text-sm text-slate-600">{bl}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Feature 8: Cohort Bottleneck Visualization ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <Brain className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-slate-800">Cohort Bottleneck Analysis</h2>
                <span className="ml-auto text-xs text-slate-400">Enter a paper ID to analyze all sessions for that paper</span>
              </div>
              <div className="px-5 py-4 flex items-center gap-3">
                <input
                  type="text"
                  value={cohortPaperId}
                  onChange={e => setCohortPaperId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadCohortAnalytics()}
                  placeholder="Paper ID (e.g. cm5abc123…)"
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono"
                />
                <button
                  onClick={loadCohortAnalytics}
                  disabled={loadingCohort}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingCohort ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  {loadingCohort ? 'Analyzing…' : 'Analyze Cohort'}
                </button>
              </div>
              {cohortError && (
                <p className="px-5 pb-4 text-xs text-red-500">{cohortError}</p>
              )}
              {cohortAnalytics && (
                <div className="px-5 pb-6 space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {[
                      { label: 'Total Confusions', value: cohortAnalytics.summary.totalConfusions, color: 'text-red-600', bg: 'bg-red-50', icon: Flame },
                      { label: 'Peer Sessions', value: cohortAnalytics.summary.totalPeerSessions, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Users },
                      { label: 'Consensus Checkpoints', value: cohortAnalytics.summary.totalConsensusCheckpoints, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: GitMerge },
                      { label: 'Marginal Notes', value: cohortAnalytics.summary.totalMarginalNotes, color: 'text-amber-600', bg: 'bg-amber-50', icon: MessageSquare },
                      { label: 'Avg D_s Reduction', value: cohortAnalytics.summary.avgDsReduction.toFixed(3), color: 'text-violet-600', bg: 'bg-violet-50', icon: TrendingUp },
                    ].map(({ label, value, color, bg, icon: Icon }) => (
                      <div key={label} className={`${bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
                        <Icon className={`w-4 h-4 ${color} shrink-0`} />
                        <div>
                          <p className={`text-lg font-bold ${color}`}>{value}</p>
                          <p className="text-[11px] text-slate-500">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Passage Heat Map */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-4 h-4 text-red-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Section Confusion Heat Map</h3>
                      <span className="text-xs text-slate-400 ml-1">ranked by confusion count · bar = relative intensity</span>
                    </div>
                    {cohortAnalytics.passageHeatmap.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No confusion records for this paper.</p>
                    ) : (
                      <div className="space-y-2">
                        {cohortAnalytics.passageHeatmap.slice(0, 10).map((row, i) => {
                          const maxCount = cohortAnalytics.passageHeatmap[0].confusionCount
                          const pct = maxCount > 0 ? (row.confusionCount / maxCount) * 100 : 0
                          const heat = pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-amber-400' : 'bg-yellow-300'
                          return (
                            <div key={row.sectionId} className="flex items-center gap-3">
                              <span className="w-5 text-[11px] text-slate-400 text-right shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-slate-700 truncate max-w-[260px]">{row.sectionName}</span>
                                  {row.topConcept && <span className="text-[10px] text-slate-400 truncate">· {row.topConcept}</span>}
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${heat} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-right">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{row.confusionCount}</p>
                                  <p className="text-[10px] text-slate-400">confusions</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-600">{row.uniqueReaders}</p>
                                  <p className="text-[10px] text-slate-400">readers</p>
                                </div>
                                <div>
                                  <p className={`text-xs font-semibold ${row.resolutionRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {Math.round(row.resolutionRate * 100)}%
                                  </p>
                                  <p className="text-[10px] text-slate-400">resolved</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Concept Bottlenecks */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-violet-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Concept Bottlenecks</h3>
                      <span className="text-xs text-slate-400 ml-1">concepts that confused the most readers</span>
                    </div>
                    {cohortAnalytics.conceptBottlenecks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No concept-level confusion data yet.</p>
                    ) : (
                      <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Concept</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Section</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Readers</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Occurrences</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Resolved</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cohortAnalytics.conceptBottlenecks.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-4 py-2.5 font-medium text-violet-700 max-w-[240px]">
                                  <span className="truncate block" title={row.concept}>{row.concept}</span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 max-w-[160px]">
                                  <span className="truncate block" title={row.sectionName}>{row.sectionName}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-bold ${row.affectedReaders >= 3 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {row.affectedReaders}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">{row.occurrences}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-semibold ${row.resolutionRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {Math.round(row.resolutionRate * 100)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Peer Pair Effectiveness */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Peer Pair Effectiveness</h3>
                      <span className="text-xs text-slate-400 ml-1">avg D_s reduction per peer pair</span>
                    </div>
                    {cohortAnalytics.peerEffectiveness.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No peer session data yet.</p>
                    ) : (
                      <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Helper</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Helpee</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Sessions</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Avg ΔD_s</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Resolution</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cohortAnalytics.peerEffectiveness.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-4 py-2.5 font-semibold text-indigo-700">{row.helperName}</td>
                                <td className="px-4 py-2.5 text-slate-600">{row.helpeeName}</td>
                                <td className="px-4 py-2.5 text-slate-600">{row.sessions}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-bold ${row.avgDsReduction > 0.1 ? 'text-emerald-600' : row.avgDsReduction > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                    {row.avgDsReduction > 0 ? '+' : ''}{row.avgDsReduction.toFixed(3)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-semibold ${row.resolutionRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {Math.round(row.resolutionRate * 100)}%
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  {row.avgRating != null
                                    ? <span className="text-amber-600 font-semibold">{row.avgRating.toFixed(1)} ★</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Teaching Leaderboard */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Teaching Leaderboard</h3>
                      <span className="text-xs text-slate-400 ml-1">ranked by avg D_s reduction across all helpee sessions</span>
                    </div>
                    {cohortAnalytics.teachingLeaderboard.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No peer session data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {cohortAnalytics.teachingLeaderboard.slice(0, 8).map((row, i) => (
                          <div key={row.userId} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                            <span className={`text-sm font-bold w-6 text-center shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </span>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-800">{row.name}</p>
                              <p className="text-[11px] text-slate-400">{row.sessions} session{row.sessions !== 1 ? 's' : ''} · {Math.round(row.resolutionRate * 100)}% resolution</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-bold ${row.avgDsReduction > 0.1 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {row.avgDsReduction > 0 ? '+' : ''}{row.avgDsReduction.toFixed(3)}
                              </p>
                              <p className="text-[10px] text-slate-400">avg ΔD_s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Consensus Checkpoints */}
                  {cohortAnalytics.consensusCheckpoints.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GitMerge className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-slate-800">Consensus Checkpoints</h3>
                        <span className="text-xs text-slate-400 ml-1">{cohortAnalytics.consensusCheckpoints.length} group agreements captured</span>
                      </div>
                      <div className="space-y-2">
                        {cohortAnalytics.consensusCheckpoints.map((cp, i) => (
                          <div key={i} className="border border-emerald-100 bg-emerald-50/40 rounded-xl px-4 py-3">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-[11px] font-semibold text-emerald-700">{cp.sectionName}</span>
                              <span className="text-[10px] text-slate-400">{new Date(cp.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-700 mb-2">{cp.agreedMeaning}</p>
                            <div className="flex flex-wrap gap-1">
                              {cp.contributors.map(c => (
                                <span key={c.userId} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{c.userName}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Per-session table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">All Sessions</h2>
                <div className="ml-auto flex items-center gap-2">
                  {(['all', 'coread', 'baseline'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCondition(c)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors capitalize ${
                        filterCondition === c
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {c === 'all' ? `All (${summaries.length})` : c === 'coread' ? `CoRead (${coread.length})` : `Baseline (${baseline.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No sessions collected yet</p>
                  <p className="text-xs text-slate-300 mt-1">Session logs will appear here as participants run the study</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {COLUMNS.map(col => (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 whitespace-nowrap select-none"
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              {sortKey === col.key
                                ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                                : null}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700 font-medium">{s.participantId}</td>
                          <td className="px-4 py-3">
                            <Badge variant={s.condition === 'coread' ? 'coread' : s.condition === 'baseline' ? 'baseline' : 'neutral'}>
                              {s.condition}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate" title={s.paperId}>{s.paperId}</td>
                          <td className="px-4 py-3 text-slate-700">{s.duration_min}m</td>
                          <td className="px-4 py-3 text-slate-700">{s.highlights}</td>
                          <td className="px-4 py-3">
                            <span className={s.confusionHighlights > 3 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                              {s.confusionHighlights}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{s.aiHelpInvoked}</td>
                          <td className="px-4 py-3 text-slate-700">{s.notificationsShown}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${s.aiTimingAccuracy >= 60 ? 'text-emerald-600' : s.aiTimingAccuracy > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {s.aiTimingAccuracy > 0 ? `${s.aiTimingAccuracy}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{s.struggleDetected}</td>
                          <td className="px-4 py-3 text-slate-700">{s.peerChatInvited}</td>
                          <td className="px-4 py-3 text-slate-700">{s.peerChatAccepted}</td>
                          <td className="px-4 py-3">
                            {s.summaryOpened
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <XCircle className="w-4 h-4 text-slate-200" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
