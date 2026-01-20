import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiCoordinationCore } from '@/lib/agents/aiCoordinationCore'
import { interactionCollector } from '@/lib/interactionCollector'
import { toast } from 'sonner'
import { WikiEntry, InsightEntry, Activity } from './CollectiveWikiPanel'

interface SessionReportProps {
    isOpen: boolean
    onClose: () => void
    summary: any
    entries: WikiEntry[]
    insights: InsightEntry[]
    activities: Activity[]
}

// ------------------------------------------------------------------
// LIT-SENSE: REALISTIC SIMULATED DATA
// ------------------------------------------------------------------
const PAPER_DETAILS = {
    title: "LitSense: A Framework for Human-AI Collaboration in Academic Reading",
    authors: "Smith, J., Doe, A., & Lee, K. (2025)",
    topic: "Human-Computer Interaction / AI",
    reflectionSummary: "This paper presents a novel framework for human-AI collaboration in academic reading. It introduces 'LitSense', a system that uses gaze tracking and intent recognition to provide proactive, implicit assistance. Key findings suggest that implicit help significantly reduces cognitive load compared to traditional explicit tools.",
    keyfindings: [
        "Implicit assistance reduced cognitive load by 40% vs explicit tools",
        "Gaze fixation duration is a reliable proxy for reader confusion",
        "Participants preferred proactive AI help in 78% of trials"
    ],
    struggleZones: [
        { section: "Methodology (Gaze Calibration)", intensity: "High", reason: "Complex technical implementation" },
        { section: "Statistical Analysis", intensity: "Medium", reason: "Interpretation of p-values" }
    ],
    masteredConcepts: [
        "Cognitive Load Theory",
        "Implicit Interaction",
        "Gaze Contingent Displays"
    ]
}

export default function SessionReport({
    isOpen,
    onClose,
    summary,
    entries = [],
    insights = [],
    activities = []
}: SessionReportProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'collaboration'>('overview');

    if (!isOpen) return null

    // ------------------------------------------------------------------
    // DYNAMIC SCORING LOGIC
    // ------------------------------------------------------------------
    const interactionCount = entries.length + insights.length + (activities.length || 10)
    const focusScore = Math.min(98, 75 + (interactionCount * 1.5))
    const scoreColor = focusScore > 90 ? 'text-green-600' : focusScore > 80 ? 'text-indigo-600' : 'text-blue-600';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 h-screen">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* MAIN MODAL CARD */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        className="relative bg-white shadow-2xl rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/20"
                    >
                        {/* ------------------------------------------------------------------
                            1. HEADER SECTION
                           ------------------------------------------------------------------ */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase shadow-sm">Final System Report</span>
                                    <span className="text-slate-400 text-xs font-mono uppercase tracking-wide">ID: {summary?.id || 'SESSION-2025-X99'}</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Overall Interaction Analysis</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Holistic assessment of "LitSense" reading session & collaboration</p>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Attention Efficiency</div>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-3xl font-black text-slate-800">88%</span>
                                        <span className="text-xs font-bold text-green-600">↑ 12%</span>
                                    </div>
                                </div>
                                <div className="h-12 w-[1px] bg-slate-200"></div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Understanding Score</div>
                                    <div className={`text-3xl font-black ${scoreColor} leading-none tracking-tight`}>{Math.round(focusScore)}<span className="text-lg text-slate-300">/100</span></div>
                                </div>
                                <div className="h-12 w-[1px] bg-slate-200"></div>
                                <button
                                    onClick={onClose}
                                    className="h-10 w-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-slate-800"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* ------------------------------------------------------------------
                            2. NAVIGATION TABS
                           ------------------------------------------------------------------ */}
                        <div className="px-8 pt-2 flex border-b border-slate-100 bg-white sticky top-0 z-10 gap-8">
                            {[
                                { id: 'overview', label: 'Executive Summary', icon: '📊' },
                                { id: 'analytics', label: 'Cognitive Biometrics', icon: '👁️' },
                                { id: 'collaboration', label: 'Social Dynamics', icon: '👥' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all tracking-wide
                                        ${activeTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}
                                    `}
                                >
                                    <span>{tab.icon}</span> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ------------------------------------------------------------------
                            3. CONTENT AREA
                           ------------------------------------------------------------------ */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">

                            {/* =========================================================================
                                TAB 1: EXECUTIVE SUMMARY
                               ========================================================================= */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                    {/* Narrative Card - The "Story" of the session */}
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 pattern-grid-lg opacity-50"></div>

                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">System Generated Narrative</h3>

                                        <div className="flex gap-8">
                                            <div className="flex-1">
                                                <p className="text-lg text-slate-800 font-medium leading-relaxed mb-6">
                                                    The session analysis indicates a <span className="text-indigo-600 font-bold">Deep Diver</span> reading pattern.
                                                    Initial skimming during the Reflection Phase successfully identified the "Implicit Interaction" core concept.
                                                    Subsequent focused reading (Phase 3) demonstrated high engagement with the <span className="font-semibold">System Architecture (Figure 3)</span>,
                                                    where gaze fixation density was highest (avg 450ms).
                                                </p>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    Collaboration metrics show active participation in distinguishing "Explicit" vs "Implicit" inputs.
                                                    The user successfully bridged the team's understanding gap regarding the "Gaze Calibration" methodology,
                                                    acting as a knowledge node for 2 other peers.
                                                </p>
                                            </div>
                                            <div className="w-[1px] bg-slate-100"></div>
                                            <div className="w-1/3 space-y-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Dominant Insight</div>
                                                    <div className="font-semibold text-slate-700 text-sm">"Implicit help reduces cognitive load by 40%."</div>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Knowledge Gap Closed</div>
                                                    <div className="font-semibold text-slate-700 text-sm">Statistical Significance (p &lt; 0.001)</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Paper Summary & Reflection */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reflection Summary</h3>
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed italic border-l-2 border-indigo-200 pl-4 py-1">
                                                "{PAPER_DETAILS.reflectionSummary}"
                                            </p>
                                        </div>

                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Verified Findings</h3>
                                            </div>
                                            <ul className="space-y-2">
                                                {PAPER_DETAILS.keyfindings.map((f, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* =========================================================================
                                TAB 2: COGNITIVE BIOMETRICS
                               ========================================================================= */}
                            {activeTab === 'analytics' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-4 gap-4">
                                        {[
                                            { label: 'Avg Fixation', val: '240ms', sub: 'Optimal', col: 'text-green-600', bg: 'bg-green-50' },
                                            { label: 'Reading Speed', val: '180 wpm', sub: 'Deep Reading', col: 'text-indigo-600', bg: 'bg-indigo-50' },
                                            { label: 'Saccade Amp.', val: '4.2°', sub: 'Focused', col: 'text-blue-600', bg: 'bg-blue-50' },
                                            { label: 'Regression Rate', val: '12%', sub: 'Low Confusion', col: 'text-purple-600', bg: 'bg-purple-50' }
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.label}</div>
                                                <div>
                                                    <div className={`text-2xl font-black ${m.col}`}>{m.val}</div>
                                                    <div className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 ${m.bg} ${m.col}`}>{m.sub}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 h-80">
                                        {/* Gaze Heatmap Summary */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Global Gaze Heatmap Analysis</h3>
                                            <div className="flex-1 rounded-xl bg-slate-900 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800"></div>
                                                {/* Simulated Heatmap Blobs */}
                                                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500 rounded-full blur-[60px] opacity-60 animate-pulse"></div>
                                                <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-500 rounded-full blur-[50px] opacity-50"></div>

                                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                                    <div className="text-white text-xs font-medium">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2 h-2 rounded-full bg-red-500"></div> High Attention: Figure 3
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Medium Attention: Methodology
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cognitive Struggle Chart */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Cognitive Load Distribution</h3>
                                            <div className="space-y-6">
                                                {PAPER_DETAILS.struggleZones.map((zone, i) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-semibold text-slate-700">{zone.section}</span>
                                                            <span className="text-xs font-mono text-slate-400">{zone.intensity} load</span>
                                                        </div>
                                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${i === 0 ? 'bg-rose-500 w-[85%]' : 'bg-orange-400 w-[60%]'}`}
                                                            ></div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1.5 ml-1">Detected trigger: {zone.reason}</p>
                                                    </div>
                                                ))}
                                                <div className="p-3 bg-green-50 rounded-xl border border-green-100 mt-4">
                                                    <p className="text-xs text-green-800 font-medium">✨ Section "Introduction" was processed with 0% detected struggle.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* =========================================================================
                                TAB 3: SOCIAL DYNAMICS
                               ========================================================================= */}
                            {activeTab === 'collaboration' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-800 mb-2">Collaborative Synergy Report</h3>
                                                <p className="text-slate-500 text-sm max-w-xl">
                                                    Analysis of peer-to-peer interactions, shared annotations, and consensus formation during the reading session.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">High Synergy Detected</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-8 mt-10">
                                            <div className="col-span-1 border-r border-slate-100 pr-8">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Agreement Matrix</div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                                                            <span>Results Interpretation</span>
                                                            <span className="text-green-600">98% Match</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className="h-full bg-green-500 w-[98%] rounded-full"></div></div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                                                            <span>Methodology Critique</span>
                                                            <span className="text-yellow-600">72% Match</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full"><div className="h-full bg-yellow-500 w-[72%] rounded-full"></div></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-2">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Topic Cluster Analysis</div>
                                                <div className="flex flex-wrap gap-3">
                                                    {PAPER_DETAILS.masteredConcepts.map((c, i) => (
                                                        <div key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                                                            <span className="text-sm font-medium text-slate-700">{c}</span>
                                                        </div>
                                                    ))}
                                                    <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                                                        <span className="text-sm font-bold text-indigo-700">+ 3 Emerging Topics</span>
                                                    </div>
                                                </div>

                                                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                                                    <div className="mt-1">
                                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm">💡</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Key Group Insight</div>
                                                        <p className="text-sm text-slate-700 italic">"The team collectively identified that 'Gaze Contingent Displays' are the primary mechanism for reducing cognitive load, agreeing with the author's hypothesis."</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ------------------------------------------------------------------
                            4. FOOTER
                           ------------------------------------------------------------------ */}
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
                            <div className="flex gap-4 text-xs font-mono text-slate-400">
                                <span>v2.4.0-stable</span>
                                <span>•</span>
                                <span>LitSense Analytics Engine</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                                    Close Report
                                </button>
                                <button
                                    onClick={() => {
                                        interactionCollector.downloadSessionData()
                                        toast.success("Full Analysis Exported", { description: "PDF report generated successfully." })
                                    }}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Export Full PDF
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
