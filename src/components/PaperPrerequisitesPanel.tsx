'use client'

import { useState, useEffect } from 'react'
import {
  X, GraduationCap, AlertCircle, RefreshCw,
  BookOpen, Brain, FileText, Map, Users,
  AlertTriangle, ChevronRight, ExternalLink, Lightbulb, CheckCircle
} from 'lucide-react'

interface PaperPrerequisitesPanelProps {
  isOpen: boolean
  onClose: () => void
  paperText: string
  paperTitle?: string
  paperAuthors?: string
  paperVenue?: string
  paperYear?: string
}

interface AnalysisResult {
  whoIsThisFor: {
    intendedAudience: string
    minimumBackground: string
    willStruggleIf: string[]
    willFindEasyIf: string[]
  }
  blockingConcepts: Array<{
    concept: string
    whereItAppears: string
    whatYouNeedToKnow: string
    ifYouAreMissing: string
    howToFillGap: string
  }>
  mustReadPapers: Array<{
    title: string
    authors: string
    year: string
    whyBlocking: string
    whatToGetFromIt: string
    canSkipIfYouKnow: string
  }>
  terminology: Array<{
    term: string
    thePapersDefinition: string
    notToBeConfusedWith: string
    whereItMatters: string
  }>
  assumedKnowledge: Array<{
    topic: string
    evidence: string
    depth: 'surface familiarity' | 'working knowledge' | 'deep understanding'
    quickReference: string
  }>
  readingApproach: {
    doFirst: string
    startHere: string
    skipIfStruggling: string
    watchOutFor: string[]
  }
}

const TABS = [
  { id: 'audience',   label: 'Is this for me?',     icon: Users,       desc: 'Who should read this' },
  { id: 'concepts',   label: 'Blocking Concepts',    icon: Brain,       desc: 'What will stop you' },
  { id: 'papers',     label: 'Read First',           icon: BookOpen,    desc: 'Papers to read before this' },
  { id: 'terms',      label: 'Key Terms',            icon: FileText,    desc: 'How this paper uses terminology' },
  { id: 'approach',   label: 'How to Read It',       icon: Map,         desc: 'Practical reading strategy' },
] as const

type TabId = typeof TABS[number]['id']

const DEPTH_STYLE: Record<string, string> = {
  'surface familiarity': 'bg-green-100 text-green-700',
  'working knowledge':   'bg-yellow-100 text-yellow-700',
  'deep understanding':  'bg-red-100 text-red-700',
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 text-center py-10">{message}</p>
}

export default function PaperPrerequisitesPanel({
  isOpen, onClose, paperText, paperTitle, paperAuthors, paperVenue, paperYear
}: PaperPrerequisitesPanelProps) {
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('audience')

  useEffect(() => { if (isOpen && !result && !loading) analyze() }, [isOpen])

  const analyze = async () => {
    if (!paperText) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/paper-prerequisites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperText, paperTitle, paperAuthors, paperVenue, paperYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      setActiveTab('audience')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Before You Read</h2>
                <p className="text-xs text-emerald-100 truncate max-w-sm">{paperTitle || 'Prerequisites Analysis'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && !loading && (
                <button onClick={analyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-analyse
                </button>
              )}
              <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        {result && !loading && (
          <div className="shrink-0 flex border-b border-gray-100 overflow-x-auto bg-white">
            {TABS.map(t => {
              const active = activeTab === t.id
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
                    ${active
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
              <div className="w-11 h-11 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-gray-800">Reading the paper…</p>
                <p className="text-sm text-gray-400 mt-1">Identifying what you need to know before you start</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-600 max-w-xs text-center">{error}</p>
              <button onClick={analyze}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors">
                Try again
              </button>
            </div>
          )}

          {result && !loading && (
            <div className="p-6 space-y-4">

              {/* ── IS THIS FOR ME? ── */}
              {activeTab === 'audience' && (
                <div className="space-y-4">
                  {/* Who it's for */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Written for</p>
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">{result.whoIsThisFor?.intendedAudience}</p>
                  </div>

                  {/* Minimum background */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Minimum background to read productively</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{result.whoIsThisFor?.minimumBackground}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Will struggle if */}
                    {result.whoIsThisFor?.willStruggleIf?.length > 0 && (
                      <div className="bg-white border border-red-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <p className="text-xs font-bold text-red-700 uppercase tracking-wider">You'll struggle if…</p>
                        </div>
                        <div className="space-y-2">
                          {result.whoIsThisFor.willStruggleIf.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 mt-1.5" />
                              <p className="text-sm text-gray-700">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Will find easy if */}
                    {result.whoIsThisFor?.willFindEasyIf?.length > 0 && (
                      <div className="bg-white border border-green-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wider">You'll be fine if…</p>
                        </div>
                        <div className="space-y-2">
                          {result.whoIsThisFor.willFindEasyIf.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0 mt-1.5" />
                              <p className="text-sm text-gray-700">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assumed knowledge */}
                  {result.assumedKnowledge?.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">What the paper assumes without explaining</p>
                      <div className="space-y-3">
                        {result.assumedKnowledge.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${DEPTH_STYLE[a.depth] ?? 'bg-gray-100 text-gray-600'}`}>
                              {a.depth}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{a.topic}</p>
                              <p className="text-xs text-gray-500 mt-0.5 italic">{a.evidence}</p>
                              {a.quickReference && (
                                <p className="text-xs text-emerald-700 mt-1">→ {a.quickReference}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── BLOCKING CONCEPTS ── */}
              {activeTab === 'concepts' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">These are the specific concepts in this paper that will block your understanding if you don't know them. Each one is tied to a real section of the paper.</p>
                  {!result.blockingConcepts?.length && <EmptyState message="No blocking concepts identified." />}
                  {result.blockingConcepts?.map((c, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                        <p className="font-bold text-sm text-gray-900">{c.concept}</p>
                        <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{c.whereItAppears}</span>
                      </div>
                      <div className="p-5 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">What you specifically need to know</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{c.whatYouNeedToKnow}</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">If you're missing this</p>
                          <p className="text-sm text-gray-700">{c.ifYouAreMissing}</p>
                        </div>
                        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">How to fill this gap</p>
                            <p className="text-sm text-gray-700">{c.howToFillGap}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── READ FIRST ── */}
              {activeTab === 'papers' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">These papers are blocking — without understanding them, specific parts of this paper will not make sense. Ordered by how much they'll block you.</p>
                  {!result.mustReadPapers?.length && <EmptyState message="No prerequisite papers identified." />}
                  {result.mustReadPapers?.map((p, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-sm text-gray-900 leading-snug">{p.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{p.authors} · {p.year}</p>
                          </div>
                          <button
                            onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`, '_blank')}
                            className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            title="Search on Google Scholar">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5">Why you're blocked without this</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{p.whyBlocking}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">What to get from it</p>
                          <p className="text-sm text-gray-700">{p.whatToGetFromIt}</p>
                        </div>
                        {p.canSkipIfYouKnow && (
                          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <p><span className="font-semibold text-gray-700">Can skip if:</span> {p.canSkipIfYouKnow}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── KEY TERMS ── */}
              {activeTab === 'terms' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Terms this paper uses in a specific or non-standard way. Getting these wrong will cause you to misread the argument.</p>
                  {!result.terminology?.length && <EmptyState message="No key terminology identified." />}
                  {result.terminology?.map((t, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                        <p className="font-bold text-sm text-indigo-700">{t.term}</p>
                        <span className="text-[11px] text-gray-400">{t.whereItMatters}</span>
                      </div>
                      <div className="p-5 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">What this paper means by it</p>
                          <p className="text-sm text-gray-800 leading-relaxed italic">"{t.thePapersDefinition}"</p>
                        </div>
                        {t.notToBeConfusedWith && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Don't confuse with</p>
                              <p className="text-sm text-gray-700">{t.notToBeConfusedWith}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── HOW TO READ IT ── */}
              {activeTab === 'approach' && result.readingApproach && (
                <div className="space-y-4">
                  {/* Do first */}
                  <div className="bg-emerald-600 rounded-2xl p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 mb-2">Do this before opening the paper</p>
                    <p className="text-sm font-medium leading-relaxed">{result.readingApproach.doFirst}</p>
                  </div>

                  {/* Start here */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Where to start reading</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{result.readingApproach.startHere}</p>
                  </div>

                  {/* Skip if struggling */}
                  {result.readingApproach.skipIfStruggling && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">What you can skip on a first read</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{result.readingApproach.skipIfStruggling}</p>
                    </div>
                  )}

                  {/* Watch out for */}
                  {result.readingApproach.watchOutFor?.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Where readers commonly get lost or misread</p>
                      <div className="space-y-3">
                        {result.readingApproach.watchOutFor.map((w, i) => (
                          <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            <span className="w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-sm text-gray-700">{w}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
