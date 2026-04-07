'use client'

import { useState, useEffect } from 'react'
import {
  X, Network, GitBranch, AlertTriangle, Lightbulb,
  TrendingUp, AlertCircle, RefreshCw, Target,
  Scale, Microscope, Zap, BookOpen, ArrowRight, Globe
} from 'lucide-react'

interface PaperRelatedWorkPanelProps {
  isOpen: boolean
  onClose: () => void
  paperText: string
  paperTitle?: string
  paperAuthors?: string
  paperVenue?: string
  paperYear?: string
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  positioning: {
    problemStatement: string
    priorStateOfArt: string
    keyInnovation: string
    claims: string[]
    scope: string
    paradigm: string
  }
  intellectualLineage: {
    directAncestors: Array<{
      title: string; authors: string; year: string; venue: string
      contribution: string; howUsed: string; limitationOvercome: string
    }>
    seminalFoundations: Array<{
      title: string; authors: string; year: string; why: string
    }>
    researchThread: string
  }
  competingApproaches: Array<{
    approach: string; representativePaper: string; authors: string; year: string
    coreIdea: string; technicalDifference: string
    whenBetter: string; whenWorse: string; hybridPotential: string
  }>
  researchGap: {
    gapAddressed: string
    whyGapExisted: string
    evidenceOfGap: string
    remainingGaps: Array<{ gap: string; difficulty: string; possibleApproach: string }>
    futureDirections: Array<{ direction: string; prerequisite: string; potentialImpact: string }>
  }
  criticalAssessment: {
    strengths: Array<{ strength: string; evidence: string }>
    weaknesses: Array<{ weakness: string; severity: 'Minor' | 'Moderate' | 'Major'; mitigation: string }>
    assumptions: string[]
    reproducibility: { rating: string; reasons: string[]; blockers: string[] }
    validityThreats: string[]
    impactAssessment: {
      shortTerm: string; longTerm: string
      fieldsThatWillAdopt: string[]; citationTrajectory: string
    }
  }
  citationLandscape: {
    likelyCitedBy: Array<{ type: string; reason: string }>
    shouldBeReadWith: Array<{ title: string; authors: string; year: string; reason: string }>
    controversialClaims: string[]
    workshopVsJournal: string
  }
  applicationDomains: Array<{
    domain: string; applicability: 'High' | 'Medium' | 'Low'
    whyRelevant: string; adaptationsNeeded: string; representativePaper: string
  }>
}

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'positioning',  label: 'Positioning',  icon: Target },
  { id: 'lineage',      label: 'Lineage',       icon: GitBranch },
  { id: 'competing',    label: 'Competitors',   icon: Scale },
  { id: 'gap',          label: 'Research Gap',  icon: Lightbulb },
  { id: 'critical',     label: 'Critical',      icon: Microscope },
  { id: 'citations',    label: 'Citations',     icon: BookOpen },
  { id: 'domains',      label: 'Domains',       icon: Globe },
] as const

type TabId = typeof TABS[number]['id']

// ── Helpers ────────────────────────────────────────────────────────────────────

function Badge({ label, style }: { label: string; style: string }) {
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>{label}</span>
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">{message}</p>
}

function PaperCard({ title, authors, year, venue, children }: {
  title: string; authors?: string; year?: string; venue?: string; children?: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-2 hover:border-gray-300 transition-colors">
      <p className="font-semibold text-sm text-gray-900 leading-snug">{title}</p>
      {(authors || year || venue) && (
        <p className="text-[11px] text-gray-500">{[authors, year, venue].filter(Boolean).join(' · ')}</p>
      )}
      {children}
    </div>
  )
}

const SEVERITY_STYLE: Record<string, string> = {
  Minor:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  Moderate: 'bg-orange-100 text-orange-700 border-orange-200',
  Major:    'bg-red-100 text-red-700 border-red-200',
}

const APPLICABILITY_STYLE: Record<string, string> = {
  High:   'bg-green-100 text-green-700 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-gray-100 text-gray-600 border-gray-200',
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PaperRelatedWorkPanel({
  isOpen, onClose, paperText, paperTitle, paperAuthors, paperVenue, paperYear
}: PaperRelatedWorkPanelProps) {
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('positioning')

  useEffect(() => { if (isOpen && !result && !loading) analyze() }, [isOpen])

  const analyze = async () => {
    if (!paperText) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/paper-related-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperText, paperTitle, paperAuthors, paperVenue, paperYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      setActiveTab('positioning')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Related Work Analysis</h2>
                <p className="text-xs text-purple-100 truncate max-w-md">{paperTitle || 'Paper'}</p>
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

        {/* ── Tab bar ── */}
        {result && !loading && (
          <div className="shrink-0 flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
            {TABS.map(t => {
              const active = activeTab === t.id
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
                    ${active ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-gray-800">Mapping the intellectual landscape…</p>
                <p className="text-sm text-gray-500 mt-1">Tracing lineage, competing approaches, and research gaps</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={analyze}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors">
                Try again
              </button>
            </div>
          )}

          {result && !loading && (
            <div className="p-6">

              {/* ── POSITIONING tab ── */}
              {activeTab === 'positioning' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-5 text-white space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">Problem</p>
                      <p className="text-sm leading-snug">{result.positioning?.problemStatement}</p>
                    </div>
                    <div className="h-px bg-white/15" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">Key Innovation</p>
                      <p className="text-sm font-semibold leading-snug">{result.positioning?.keyInnovation}</p>
                    </div>
                    <div className="h-px bg-white/15" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">Prior State of the Art</p>
                      <p className="text-sm text-purple-100 leading-snug">{result.positioning?.priorStateOfArt}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Paradigm</p>
                      <p className="text-sm text-gray-700">{result.positioning?.paradigm}</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Scope</p>
                      <p className="text-sm text-gray-700">{result.positioning?.scope}</p>
                    </div>
                  </div>

                  {result.positioning?.claims?.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Evaluable Claims</p>
                      <div className="space-y-2">
                        {result.positioning.claims.map((c, i) => (
                          <div key={i} className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                            <span className="w-5 h-5 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-sm text-gray-700">{c}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── LINEAGE tab ── */}
              {activeTab === 'lineage' && (
                <div className="space-y-6">
                  {result.intellectualLineage?.researchThread && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Research Thread</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.intellectualLineage.researchThread}</p>
                    </div>
                  )}

                  {result.intellectualLineage?.directAncestors?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Direct Ancestors — this paper directly extends these</p>
                      <div className="space-y-3">
                        {result.intellectualLineage.directAncestors.map((p, i) => (
                          <PaperCard key={i} title={p.title} authors={p.authors} year={p.year} venue={p.venue}>
                            <div className="grid grid-cols-1 gap-2 mt-1">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Contribution</p>
                                <p className="text-xs text-gray-700">{p.contribution}</p>
                              </div>
                              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">How current paper uses it</p>
                                <p className="text-xs text-gray-700">{p.howUsed}</p>
                              </div>
                              {p.limitationOvercome && (
                                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Limitation overcome</p>
                                  <p className="text-xs text-gray-700">{p.limitationOvercome}</p>
                                </div>
                              )}
                            </div>
                          </PaperCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.intellectualLineage?.seminalFoundations?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Seminal Foundations</p>
                      <div className="space-y-3">
                        {result.intellectualLineage.seminalFoundations.map((p, i) => (
                          <PaperCard key={i} title={p.title} authors={p.authors} year={p.year}>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Why foundational</p>
                              <p className="text-xs text-gray-700">{p.why}</p>
                            </div>
                          </PaperCard>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── COMPETITORS tab ── */}
              {activeTab === 'competing' && (
                <div className="space-y-4">
                  {!result.competingApproaches?.length && <EmptyState message="No competing approaches identified." />}
                  {result.competingApproaches?.map((c, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-orange-50 border-b border-orange-100 px-4 py-3">
                        <p className="font-semibold text-sm text-gray-900">{c.approach}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.representativePaper} · {c.authors} · {c.year}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Core idea</p>
                          <p className="text-xs text-gray-700">{c.coreIdea}</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Technical difference</p>
                          <p className="text-xs text-gray-700">{c.technicalDifference}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">When this beats the paper</p>
                            <p className="text-xs text-gray-700">{c.whenBetter}</p>
                          </div>
                          <div className="bg-green-50 border border-green-100 rounded-lg p-2.5">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">When the paper wins</p>
                            <p className="text-xs text-gray-700">{c.whenWorse}</p>
                          </div>
                        </div>
                        {c.hybridPotential && (
                          <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                            <Zap className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700"><span className="font-semibold text-purple-700">Hybrid potential:</span> {c.hybridPotential}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RESEARCH GAP tab ── */}
              {activeTab === 'gap' && result.researchGap && (
                <div className="space-y-5">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Gap Addressed</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{result.researchGap.gapAddressed}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Why the gap existed</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.researchGap.whyGapExisted}</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Evidence of gap</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.researchGap.evidenceOfGap}</p>
                    </div>
                  </div>

                  {result.researchGap.remainingGaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Remaining Gaps</p>
                      <div className="space-y-3">
                        {result.researchGap.remainingGaps.map((g, i) => (
                          <div key={i} className="border border-amber-100 rounded-xl p-4 space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-gray-900">{g.gap}</p>
                            </div>
                            <p className="text-xs text-gray-600 pl-6">{g.difficulty}</p>
                            {g.possibleApproach && (
                              <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 ml-6">
                                <ArrowRight className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-green-800">{g.possibleApproach}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.researchGap.futureDirections?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Future Directions Enabled</p>
                      <div className="space-y-3">
                        {result.researchGap.futureDirections.map((d, i) => (
                          <div key={i} className="border border-purple-100 rounded-xl p-4 space-y-2">
                            <div className="flex items-start gap-2">
                              <Zap className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-gray-900">{d.direction}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pl-6">
                              <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-bold text-gray-400 mb-0.5">Prerequisite</p>
                                <p className="text-xs text-gray-600">{d.prerequisite}</p>
                              </div>
                              <div className="bg-purple-50 rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-bold text-purple-600 mb-0.5">Potential impact</p>
                                <p className="text-xs text-gray-700">{d.potentialImpact}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CRITICAL ASSESSMENT tab ── */}
              {activeTab === 'critical' && result.criticalAssessment && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="border border-green-200 rounded-xl overflow-hidden">
                      <div className="bg-green-50 px-4 py-2.5 border-b border-green-200">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Strengths</p>
                      </div>
                      <div className="p-3 space-y-2">
                        {result.criticalAssessment.strengths?.map((s, i) => (
                          <div key={i} className="bg-white border border-green-100 rounded-lg p-2.5">
                            <p className="text-xs font-semibold text-gray-800 mb-1">{s.strength}</p>
                            <p className="text-[11px] text-gray-500">{s.evidence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Weaknesses */}
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <div className="bg-red-50 px-4 py-2.5 border-b border-red-200">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Weaknesses</p>
                      </div>
                      <div className="p-3 space-y-2">
                        {result.criticalAssessment.weaknesses?.map((w, i) => (
                          <div key={i} className="bg-white border border-red-100 rounded-lg p-2.5">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold text-gray-800">{w.weakness}</p>
                              <Badge label={w.severity} style={SEVERITY_STYLE[w.severity] ?? 'bg-gray-100 text-gray-600 border-gray-200'} />
                            </div>
                            {w.mitigation && <p className="text-[11px] text-gray-500">{w.mitigation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reproducibility */}
                  {result.criticalAssessment.reproducibility && (
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reproducibility</p>
                        <Badge label={result.criticalAssessment.reproducibility.rating}
                          style={result.criticalAssessment.reproducibility.rating === 'Easy' ? 'bg-green-100 text-green-700 border-green-200' :
                                 result.criticalAssessment.reproducibility.rating === 'Moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                 'bg-red-100 text-red-700 border-red-200'} />
                      </div>
                      {result.criticalAssessment.reproducibility.blockers?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Blockers</p>
                          {result.criticalAssessment.reproducibility.blockers.map((b, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-700 mb-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />{b}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Impact */}
                  {result.criticalAssessment.impactAssessment && (
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Impact Assessment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Short-term (2yr)</p>
                          <p className="text-sm text-gray-700">{result.criticalAssessment.impactAssessment.shortTerm}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Long-term (5-10yr)</p>
                          <p className="text-sm text-gray-700">{result.criticalAssessment.impactAssessment.longTerm}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Citation trajectory</p>
                        <p className="text-sm text-gray-700">{result.criticalAssessment.impactAssessment.citationTrajectory}</p>
                      </div>
                      {result.criticalAssessment.impactAssessment.fieldsThatWillAdopt?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 mb-2">Fields that will adopt this</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.criticalAssessment.impactAssessment.fieldsThatWillAdopt.map((f, i) => (
                              <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assumptions & validity */}
                  {(result.criticalAssessment.assumptions?.length > 0 || result.criticalAssessment.validityThreats?.length > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      {result.criticalAssessment.assumptions?.length > 0 && (
                        <div className="border border-amber-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Implicit Assumptions</p>
                          <div className="space-y-2">
                            {result.criticalAssessment.assumptions.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                <span className="text-amber-500 font-bold shrink-0">·</span>{a}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.criticalAssessment.validityThreats?.length > 0 && (
                        <div className="border border-orange-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-3">Validity Threats</p>
                          <div className="space-y-2">
                            {result.criticalAssessment.validityThreats.map((v, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />{v}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── CITATIONS tab ── */}
              {activeTab === 'citations' && (
                <div className="space-y-5">
                  {result.citationLandscape?.workshopVsJournal && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Contribution Assessment</p>
                      <p className="text-sm text-gray-800">{result.citationLandscape.workshopVsJournal}</p>
                    </div>
                  )}

                  {result.citationLandscape?.shouldBeReadWith?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Read Alongside</p>
                      <div className="space-y-3">
                        {result.citationLandscape.shouldBeReadWith.map((p, i) => (
                          <PaperCard key={i} title={p.title} authors={p.authors} year={p.year}>
                            <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-0.5">Why together</p>
                              <p className="text-xs text-gray-700">{p.reason}</p>
                            </div>
                          </PaperCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.citationLandscape?.likelyCitedBy?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Likely Cited By</p>
                      <div className="space-y-2">
                        {result.citationLandscape.likelyCitedBy.map((c, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl p-3">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{c.type}</p>
                            <p className="text-xs text-gray-600">{c.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.citationLandscape?.controversialClaims?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Potentially Contested Claims</p>
                      <div className="space-y-2">
                        {result.citationLandscape.controversialClaims.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">{c}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOMAINS tab ── */}
              {activeTab === 'domains' && (
                <div className="space-y-3">
                  {!result.applicationDomains?.length && <EmptyState message="No application domains identified." />}
                  {result.applicationDomains?.map((d, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
                        <p className="font-semibold text-sm text-gray-900">{d.domain}</p>
                        <Badge label={d.applicability} style={APPLICABILITY_STYLE[d.applicability] ?? 'bg-gray-100 text-gray-600 border-gray-200'} />
                      </div>
                      <div className="p-4 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Why applicable</p>
                          <p className="text-sm text-gray-700">{d.whyRelevant}</p>
                        </div>
                        {d.adaptationsNeeded && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Adaptations needed</p>
                            <p className="text-xs text-gray-700">{d.adaptationsNeeded}</p>
                          </div>
                        )}
                        {d.representativePaper && (
                          <p className="text-[11px] text-indigo-600 italic">See also: {d.representativePaper}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
