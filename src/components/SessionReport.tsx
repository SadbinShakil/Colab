import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiCoordinationCore } from '@/lib/agents/aiCoordinationCore'
import { interactionCollector } from '@/lib/interactionCollector'
import { toast } from 'sonner'


interface SessionReportProps {
    isOpen: boolean
    onClose: () => void
    summary: any // The document summary to reference
}

export default function SessionReport({ isOpen, onClose, summary }: SessionReportProps) {
    if (!isOpen) return null

    const events = aiCoordinationCore.getRecentEvents(50).reverse() // Get last 50 events
    const state = aiCoordinationCore.getSystemState()

    // Calculate "Focus Score" based on events (Mock logic for now)
    const focusScore = Math.min(100, 70 + (events.length * 2))

    // Determine "Key Learnings" based on summary or events
    const learnings = [
        "Identified key limitations in current transformer architecture",
        "Clarified confusion regarding 'Self-Attention' mechanism",
        "Connected 'Positional Encoding' to sequence ordering",
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="text-2xl">🎓</span> Session Report
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Review your learning journey for this session.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Focus Score</div>
                                    <div className="text-xl font-mono font-bold text-indigo-600">{focusScore}/100</div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left Column: Learnings & Insights */}
                            <div className="space-y-6">
                                {/* Key Takeaways */}
                                <div className="bg-white/80 p-5 rounded-xl border border-indigo-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m5 7 2.8 2.8" /><path d="m19 7-2.8 2.8" /><path d="M12 22a10 10 0 1 1 0-20" /></svg>
                                        Key Takeaways
                                    </h3>
                                    <ul className="space-y-3">
                                        {learnings.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="mt-1 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">✓</div>
                                                <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Reviewed Topics */}
                                <div className="bg-white/80 p-5 rounded-xl border border-purple-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                                        Reviewed Content
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">Introduction</span>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">Methodology</span>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 ring-1 ring-indigo-200">Transformer Architecture</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Activity Timeline */}
                            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-50/95 py-2 z-10">
                                    Activity Log
                                </h3>
                                <div className="space-y-4 relative pl-4 border-l border-gray-200 ml-2">
                                    {events.map((event, i) => (
                                        <div key={i} className="relative">
                                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-100" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono text-gray-400">
                                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {event.event.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                    Agent: {event.agent}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && (
                                        <div className="text-center text-gray-400 py-10 text-sm italic">
                                            No events recorded yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200/50 flex justify-end gap-3">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    interactionCollector.downloadSessionData()
                                    toast.success("Session Report Saved", { description: "Your learning journey has been archived." })
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Save Report
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
