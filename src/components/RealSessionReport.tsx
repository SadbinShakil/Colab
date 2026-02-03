import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { reportGenerator, type ComprehensiveReport } from '@/lib/reportGenerator'
import { interactionCollector } from '@/lib/interactionCollector'
import { toast } from 'sonner'
import {
    Brain, Clock, Eye, Target, TrendingUp, Award, AlertCircle,
    CheckCircle, Users, Sparkles, Download, X, BarChart3, Zap
} from 'lucide-react'

interface RealSessionReportProps {
    isOpen: boolean
    onClose: () => void
    reflection: { type: string; content: string } | null
    assignments: any[]
    collaborationData: any
}

export default function RealSessionReport({
    isOpen,
    onClose,
    reflection,
    assignments,
    collaborationData
}: RealSessionReportProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'struggle' | 'collaboration'>('overview')
    const [report, setReport] = useState<ComprehensiveReport | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (isOpen && !report) {
            generateReport()
        }
    }, [isOpen])

    const generateReport = async () => {
        setIsGenerating(true)
        try {
            const sessionData = interactionCollector.getCurrentSession()
            if (!sessionData) {
                toast.error('No session data available')
                return
            }

            const comprehensiveReport = reportGenerator.generateReport(
                sessionData,
                reflection,
                assignments,
                collaborationData
            )

            setReport(comprehensiveReport)
            toast.success('Report generated successfully!')
        } catch (error) {
            console.error('Error generating report:', error)
            toast.error('Failed to generate report')
        } finally {
            setIsGenerating(false)
        }
    }

    const downloadReport = () => {
        if (!report) return

        const reportData = JSON.stringify(report, null, 2)
        const blob = new Blob([reportData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-report-${report.sessionId}.json`
        a.click()
        URL.revokeObjectURL(url)

        toast.success('Report downloaded!', { description: 'JSON file saved successfully' })
    }

    if (!isOpen) return null
    if (isGenerating || !report) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md">
                <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg font-bold text-slate-800">Generating comprehensive report...</p>
                    <p className="text-sm text-slate-500">Analyzing your reading session data</p>
                </div>
            </div>
        )
    }

    const { userProfile, readingAnalytics, struggleAnalysis, understanding, achievements, recommendations } = report

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Main Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        className="relative bg-white shadow-2xl rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800">Session Report</h2>
                                            <p className="text-xs text-slate-500 font-medium">Comprehensive Analysis • {report.duration} minutes</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Key Metrics */}
                                    <div className="flex gap-6">
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Focus Score</div>
                                            <div className="text-2xl font-black text-indigo-600">{readingAnalytics.focusScore}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Understanding</div>
                                            <div className="text-2xl font-black text-green-600">{understanding.understandingScore}%</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-8 pt-2 flex border-b border-slate-100 bg-white gap-6">
                            {[
                                { id: 'overview', label: 'Overview', icon: Brain },
                                { id: 'analytics', label: 'Reading Analytics', icon: Eye },
                                { id: 'struggle', label: 'Struggle Zones', icon: AlertCircle },
                                { id: 'collaboration', label: 'Collaboration', icon: Users }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* User Profile */}
                                    {userProfile.reflection && (
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-indigo-600" />
                                                Your Profile
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Knowledge Level</div>
                                                    <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold inline-block">
                                                        {userProfile.reflection.knowledgeLevel}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Expertise Areas</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {userProfile.reflection.expertise.slice(0, 3).map((exp, i) => (
                                                            <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                                                {exp}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Learning Goals</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {userProfile.reflection.goals.slice(0, 3).map((goal, i) => (
                                                            <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                                                {goal}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Session Summary */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <MetricCard
                                            icon={Clock}
                                            label="Time Spent"
                                            value={`${readingAnalytics.totalTimeSpent} min`}
                                            color="blue"
                                        />
                                        <MetricCard
                                            icon={Target}
                                            label="Sections Completed"
                                            value={`${userProfile.completedSections}/${userProfile.assignedSections}`}
                                            color="green"
                                        />
                                        <MetricCard
                                            icon={TrendingUp}
                                            label="Engagement"
                                            value={readingAnalytics.engagementLevel}
                                            color="indigo"
                                        />
                                        <MetricCard
                                            icon={Zap}
                                            label="Reading Speed"
                                            value={`${readingAnalytics.readingSpeed} wpm`}
                                            color="purple"
                                        />
                                    </div>

                                    {/* Achievements */}
                                    {achievements.milestones.length > 0 && (
                                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-200">
                                            <h3 className="text-sm font-bold text-yellow-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                                <Award className="w-4 h-4" />
                                                Achievements Unlocked
                                            </h3>
                                            <div className="space-y-2">
                                                {achievements.milestones.map((milestone, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-white/60 p-3 rounded-lg">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="text-sm font-medium text-slate-700">{milestone.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                            Recommendations
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Strength Areas</div>
                                                <ul className="space-y-1">
                                                    {recommendations.strengthAreas.slice(0, 3).map((area, i) => (
                                                        <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                                                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                            {area}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Next Steps</div>
                                                <ul className="space-y-1">
                                                    {recommendations.nextSteps.map((step, i) => (
                                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                            <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mt-0.5">
                                                                {i + 1}
                                                            </div>
                                                            {step}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ANALYTICS TAB */}
                            {activeTab === 'analytics' && (
                                <div className="space-y-6">
                                    {/* Reading Metrics */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Avg Fixation</div>
                                            <div className="text-3xl font-black text-indigo-600">{readingAnalytics.averageFixationDuration}ms</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {readingAnalytics.averageFixationDuration > 250 ? 'Deep reading' : 'Quick scanning'}
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Fixations</div>
                                            <div className="text-3xl font-black text-blue-600">{readingAnalytics.totalFixations}</div>
                                            <div className="text-xs text-slate-500 mt-1">Eye tracking events</div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Focus Score</div>
                                            <div className="text-3xl font-black text-green-600">{readingAnalytics.focusScore}/100</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {readingAnalytics.focusScore > 75 ? 'Excellent' : readingAnalytics.focusScore > 50 ? 'Good' : 'Needs improvement'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Breakdown */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Section-wise Analysis</h3>
                                        <div className="space-y-3">
                                            {readingAnalytics.sectionMetrics.map((section, i) => (
                                                <div key={i} className="p-4 bg-slate-50 rounded-xl">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold text-slate-700">{section.sectionName}</span>
                                                        {section.completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-4 text-xs">
                                                        <div>
                                                            <span className="text-slate-400">Time:</span>
                                                            <span className="ml-1 font-bold text-slate-700">{section.timeSpent}s</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Visits:</span>
                                                            <span className="ml-1 font-bold text-slate-700">{section.visitCount}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Fixations:</span>
                                                            <span className="ml-1 font-bold text-slate-700">{section.fixationCount}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Avg Fix:</span>
                                                            <span className="ml-1 font-bold text-slate-700">{section.avgFixationDuration}ms</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STRUGGLE TAB */}
                            {activeTab === 'struggle' && (
                                <div className="space-y-6">
                                    {/* Struggle Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-rose-200">
                                            <div className="text-xs font-bold text-rose-400 uppercase mb-2">Struggle Events</div>
                                            <div className="text-3xl font-black text-rose-600">{struggleAnalysis.totalStruggleEvents}</div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-orange-200">
                                            <div className="text-xs font-bold text-orange-400 uppercase mb-2">Confusion Points</div>
                                            <div className="text-3xl font-black text-orange-600">{struggleAnalysis.confusionPoints.length}</div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-green-200">
                                            <div className="text-xs font-bold text-green-400 uppercase mb-2">Understood</div>
                                            <div className="text-3xl font-black text-green-600">{understanding.understoodHighlights}</div>
                                        </div>
                                    </div>

                                    {/* Struggle Sections */}
                                    {struggleAnalysis.struggleSections.length > 0 && (
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Challenging Sections</h3>
                                            <div className="space-y-4">
                                                {struggleAnalysis.struggleSections.map((section, i) => (
                                                    <div key={i} className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-800">{section.sectionName}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${section.severity === 'high' ? 'bg-rose-200 text-rose-800' :
                                                                            section.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                                                                                'bg-yellow-200 text-yellow-800'
                                                                        }`}>
                                                                        {section.severity} severity
                                                                    </span>
                                                                    {section.aiHelpProvided && (
                                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                                                                            AI helped
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-3 text-xs">
                                                            <div>
                                                                <span className="text-slate-500">Confusion:</span>
                                                                <span className="ml-1 font-bold text-slate-700">{section.indicators.confusionHighlights}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">Stuck markers:</span>
                                                                <span className="ml-1 font-bold text-slate-700">{section.indicators.stuckMarkers}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">Revisits:</span>
                                                                <span className="ml-1 font-bold text-slate-700">{section.indicators.revisitCount}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">Time:</span>
                                                                <span className="ml-1 font-bold text-slate-700">{section.indicators.timeSpent}s</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mastered Concepts */}
                                    {understanding.masteredConcepts.length > 0 && (
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                                            <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide mb-4">Mastered Concepts</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {understanding.masteredConcepts.map((concept, i) => (
                                                    <div key={i} className="px-3 py-2 bg-white/60 rounded-lg text-sm font-medium text-green-800">
                                                        {concept}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COLLABORATION TAB */}
                            {activeTab === 'collaboration' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Collaboration Metrics</h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Peers Interacted</div>
                                                <div className="text-4xl font-black text-indigo-600">{report.collaboration.peersInteracted}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Annotations Shared</div>
                                                <div className="text-4xl font-black text-purple-600">{report.collaboration.annotationsShared}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
                            <div className="text-xs text-slate-400 font-mono">
                                Session ID: {report.sessionId.substring(0, 12)}...
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={downloadReport}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Report
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

// Helper Component
function MetricCard({ icon: Icon, label, value, color }: any) {
    const colorMap: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600'
    }

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
            <div className="text-2xl font-black text-slate-800">{value}</div>
        </div>
    )
}
