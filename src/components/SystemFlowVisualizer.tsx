'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiCoordinationCore, AgentActivity } from '@/lib/agents/aiCoordinationCore'
import { toast } from 'sonner'
import SessionReport from './SessionReport'

// Icons for the nodes
const Icons = {
    reflection: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
    ),
    role: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    interaction: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.5 21.5-5-5" /><path d="M16.5 21.5 21.5 16.5" /><path d="M4 11a7.5 7.5 0 0 1 12.5-5.5 8 8 0 0 1-5 13" /><path d="M11 7v8" /><path d="M7 11h8" /></svg>
    ),
    discussion: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    fact: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
    ),
    matching: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M7 12h10" /><path d="M7 16h6" /></svg>
    ),
    related: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
    ),
    structured: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h10" /></svg>
    )
}

import { WikiEntry, InsightEntry, Activity } from './CollectiveWikiPanel'

interface SystemFlowVisualizerProps {
    summary?: any
    entries?: WikiEntry[]
    insights?: InsightEntry[]
    activities?: Activity[]
}

export function SystemFlowVisualizer({
    summary,
    entries = [],
    insights = [],
    activities = []
}: SystemFlowVisualizerProps) {
    const [agents, setAgents] = useState<AgentActivity[]>([])
    const [recentEvents, setRecentEvents] = useState<any[]>([])
    const [activeStage, setActiveStage] = useState(0) // 0: Init, 1: Reflection, 2: Assignment, 3: Execution
    const [isOpen, setIsOpen] = useState(false)
    const [hasOnboarded, setHasOnboarded] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [showReport, setShowReport] = useState(false)

    // Helper to format timestamps to MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    // Helper to format summary content
    const formatSummary = (data: any) => {
        // DEMO MOCK: If no summary yet, show this placeholder so the feature is usable immediately
        if (!data) return "This paper presents a novel framework for human-AI collaboration in academic reading. It introduces 'LitSense', a system that uses gaze tracking and intent recognition to provide proactive, implicit assistance. Key findings suggest that implicit help significantly reduces cognitive load compared to traditional explicit tools."

        if (typeof data === 'string') return data

        // It's an object, let's pretty print it
        return Object.entries(data).map(([key, value]) => {
            if (key === 'Note') return null // Skip internal notes
            return (
                <div key={key} className="mb-3">
                    <span className="font-bold text-indigo-700 uppercase text-xs tracking-wider block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-gray-700">{String(value)}</span>
                </div>
            )
        })
    }

    const displaySummaryContent = formatSummary(summary)

    // Polling for update
    useEffect(() => {
        const update = () => {
            const allAgents = aiCoordinationCore.getAgentActivities()
            setAgents(allAgents)

            const events = aiCoordinationCore.getRecentEvents(3)
            setRecentEvents(events.reverse()) // Reverse so newest is top
        }

        const interval = setInterval(update, 2000)
        update()
        return () => clearInterval(interval)
    }, [])

    const getAgentData = (id: string) => {
        return agents.find(a => a.agentId === id)
    }

    const isAgentActive = (id: string) => {
        if (!hasOnboarded) {
            if (activeStage === 1 && (id === 'agent-4' || id === 'agent-1')) return true
            if (activeStage === 2 && id === 'agent-2') return true
            if (activeStage === 3) return true
            return false
        }
        return getAgentData(id)?.status === 'active'
    }

    // Inform Coordination Core when system is "Fully Online"
    useEffect(() => {
        const isOnline = hasOnboarded || activeStage >= 3
        aiCoordinationCore.setSystemFullyOnline(isOnline)
    }, [activeStage, hasOnboarded])

    const toggle = () => setIsOpen(!isOpen)

    // Trigger Guided Flow on Mount
    const [timeLeft, setTimeLeft] = useState(0)
    const [totalDuration, setTotalDuration] = useState(1)

    // Refs to track state inside interval without re-triggering effect
    const stageRef = React.useRef(0)

    // Trigger Guided Flow on Mount
    useEffect(() => {
        if (hasOnboarded) return

        let timer: NodeJS.Timeout



        const runPhase = (stage: number, duration: number) => {
            setActiveStage(stage)
            stageRef.current = stage
            setTotalDuration(duration)
            setTimeLeft(duration)
        }

        const advanceStage = () => {
            const currentStage = stageRef.current

            // Phase Transition Logic
            if (currentStage === 1) {
                // Move to Phase 2: Assignment
                runPhase(2, 60) // 1 minute for role assignment review
                toast.success('Reflection Phase Complete', {
                    description: 'Based on the reflection phase, we are now assigning sections based on your interest. You can also self-select your focus.',
                    duration: 5000,
                })
                return 60
            } else if (currentStage === 2) {
                // Move to Phase 3: Focused Reading
                runPhase(3, 120) // 2 mins reading time
                toast.success('Role Assigned: Critical Reviewer', {
                    description: 'Read the "Results" section. Agents are assisting.',
                    duration: 5000,
                })
                return 120
            } else if (currentStage === 3) {
                // Session Complete
                setHasOnboarded(true)
                stageRef.current = 4
                setActiveStage(4) // New "Done" stage
                setShowReport(true) // Auto-show summary
                clearInterval(timer)

                // Broadcast Session End to other tabs
                if (typeof window !== 'undefined') {
                    localStorage.setItem('session_status', 'ended_' + Date.now())
                }
                return 0
            }
            return 0
        }

        // Expose skip function to window for the button to access
        (window as any).skipPhase = () => advanceStage()

        const startFlow = async (startTime: number = Date.now()) => {
            setIsOpen(true)

            // Calculate elapsed time to sync with other users
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
            const remaining = Math.max(0, 120 - elapsedSeconds)

            // PHASE 1: REFLECTION (Synced)
            runPhase(1, 120) // Reset to max default
            setTimeLeft(remaining) // Override with synced time

            toast.message('Step 1: Reflection Analysis', {
                description: 'We are in Reflection Analysis phase. Skim the paper, see Intro/Abstract to get the initial idea.',
                duration: 7000,
            })
        }

        // Expose start function for the button
        (window as any).startSession = () => {
            const now = Date.now()
            // 1. Local Sync (Fastest for same browser)
            localStorage.setItem('session_status', 'started_' + now)
            // 2. Remote Sync (Sockets for different browsers/users)
            window.dispatchEvent(new CustomEvent('request-session-start', { detail: now }))

            startFlow(now)
        }

        // Timer Logic
        timer = setInterval(() => {
            // Only tick if active stage > 0
            if (stageRef.current === 0) return

            setTimeLeft(prev => {
                if (prev <= 1) {
                    return advanceStage()
                }
                return prev - 1
            })
        }, 1000)

        // Listen for Session Events (Start/End) from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            console.log('📦 Storage Event:', e.key, e.newValue)
            if (e.key === 'session_status') {
                if (e.newValue?.startsWith('ended_')) {
                    console.log('🛑 Session Ended Signal Received')
                    setHasOnboarded(true)
                    setActiveStage(4)
                    setShowReport(true)
                    clearInterval(timer)
                } else if (e.newValue?.startsWith('started_')) {
                    console.log('🚀 Session Start Signal Received (Storage)')
                    const startTime = parseInt(e.newValue.split('_')[1])
                    startFlow(startTime)
                }
            }
        }

        // ✅ Listen for Remote Socket Events
        const handleRemoteStart = (e: CustomEvent) => {
            console.log('🚀 Remote Session Start Signal Received (Socket)', e.detail)
            startFlow(e.detail)
        }

        // Initial Check (in case user refreshes mid-session)
        const currentSession = localStorage.getItem('session_status')
        if (currentSession?.startsWith('started_')) {
            const startTime = parseInt(currentSession.split('_')[1])
            // Only resume if within reasonable window (e.g. 10 mins)
            if (Date.now() - startTime < 600000) {
                startFlow(startTime)
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorageChange)
            window.addEventListener('remote-session-start', handleRemoteStart as EventListener)
        }

        return () => {
            clearInterval(timer)
            if (typeof window !== 'undefined') {
                window.removeEventListener('storage', handleStorageChange)
                window.removeEventListener('remote-session-start', handleRemoteStart as EventListener)
            }
        }
    }, [hasOnboarded])


    // LIVE SIMULATION (Demonstrates Eye Tracking Logic)
    useEffect(() => {
        // We only want this script to run during Phase 3 (Deep Reading) AND Phase 4 (Extended)
        if (activeStage < 3) return

        const startTimeRef = { current: Date.now() }
        const eventsTriggered = { current: { struggle: false, help: false, collab: false } }

        // Inject Fake Peer for Demo (if method exists)
        if (aiCoordinationCore['injectFakePeer']) {
            aiCoordinationCore.injectFakePeer('user-emma', 'Emma', 'simulated-section', 'proficient')
        }

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current

            // T+15s: Trigger Struggle (System Event)
            if (elapsed > 15000 && !eventsTriggered.current.struggle) {
                eventsTriggered.current.struggle = true

                // Directly trigger the "Struggle Detected" event in the core
                // This forces Agent 7 to generate the "Confusion Detected" notification
                aiCoordinationCore.routeAgentEvent('agent1', 'struggle-detected', {
                    sectionId: 'simulated-section',
                    sectionName: 'Methodology',
                    severity: 'high',
                    userName: 'User'
                })
            }

            // T+20s: Implicit Help Suggestion (System Event)
            if (elapsed > 20000 && !eventsTriggered.current.help) {
                eventsTriggered.current.help = true

                // Trigger Agent 7's suggestion logic
                aiCoordinationCore.routeAgentEvent('agent1', 'confusion-loop-detected', {
                    sectionId: 'simulated-section',
                    sectionName: 'Methodology',
                    revisitCount: 3
                })
            }

            // T+40s: Collaboration Opportunity (System Event)
            if (elapsed > 40000 && !eventsTriggered.current.collab) {
                eventsTriggered.current.collab = true

                // Trigger Agent 2's peer matching logic
                aiCoordinationCore.routeAgentEvent('agent2', 'peer-match-found', {
                    peerName: 'Emma',
                    matchScore: 95,
                    sectionId: 'simulated-section'
                })
            }

        }, 1000)

        return () => clearInterval(interval)
    }, [activeStage])

    // Get the very latest event for the collapsed view
    const latestEvent = recentEvents[0]

    const getPhaseInstruction = () => {
        if (!hasOnboarded) {
            if (activeStage === 1) return "Please skim the document. Agents are analyzing your attention..."
            if (activeStage === 2) return "Analyzing your reflection to assign the optimal reading role..."
            if (activeStage === 3) return "System active. Agents will now assist your reading."
        }
        if (activeStage === 4) return "Extended Session: Agents monitoring reading pattern..."
        return "Live: Agents are quietly monitoring for confusion or needed context."
    }

    return (
        <>
            {/* Session Report Modal */}
            <SessionReport
                isOpen={showReport}
                onClose={() => setShowReport(false)}
                summary={summary}
                entries={entries}
                insights={insights}
                activities={activities}
            />

            {/* ✅ ADVANCED REFLECTION & GUIDANCE DASHBOARD */}
            <AnimatePresence>
                {activeStage >= 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[45] flex flex-col items-center gap-2 pointer-events-none"
                    >
                        {/* Compact Guided Card (Balanced Size) */}
                        <div className={`bg-white/90 backdrop-blur-md border shadow-2xl rounded-2xl p-3 flex items-center gap-4 pointer-events-auto ring-1 ring-black/5 max-w-lg transition-colors duration-500
                            ${activeStage === 3 ? 'border-green-200 bg-green-50/80' : activeStage === 4 ? 'border-indigo-200 bg-indigo-50/80' : 'border-white/50'}
                        `}>

                            {/* SMALL TIMER/ICON */}
                            <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                                {activeStage <= 3 && (
                                    <>
                                        <svg className="w-full h-full -rotate-90">
                                            <circle className="text-gray-200" strokeWidth="2.5" stroke="currentColor" fill="transparent" r="18" cx="20" cy="20" />
                                            <motion.circle
                                                className={activeStage === 1 ? "text-indigo-600" : activeStage === 2 ? "text-purple-600" : "text-green-600"}
                                                strokeWidth="2.5"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r="18" cx="20" cy="20"
                                                initial={{ pathLength: 1 }}
                                                animate={{ pathLength: timeLeft / totalDuration }}
                                                transition={{ duration: 1, ease: "linear" }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700">
                                            {formatTime(timeLeft)}
                                        </div>
                                    </>
                                )}
                                {activeStage === 4 && (
                                    <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                    </div>
                                )}
                            </div>

                            {/* CONTENT Area */}
                            <div className="flex flex-col">
                                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse
                                        ${activeStage === 0 ? 'bg-gray-400' : activeStage === 1 ? 'bg-indigo-500' : activeStage === 2 ? 'bg-purple-500' : 'bg-green-500'}
                                    `} />
                                    {activeStage === 0 && "Waiting for Team"}
                                    {activeStage === 1 && "Reflection Analysis"}
                                    {activeStage === 2 && "Assigning Role"}
                                    {activeStage === 3 && "Agents Active"}
                                    {activeStage === 4 && "Extended Session"}
                                </h3>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeStage}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="text-[10px] text-gray-600 max-w-[260px] leading-relaxed line-clamp-2"
                                    >
                                        {activeStage === 0 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span>Session ready.</span>
                                                <button
                                                    onClick={() => (window as any).startSession()}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-md shadow-sm font-semibold transition-colors text-[9px]"
                                                >
                                                    Start Session
                                                </button>
                                            </div>
                                        )}
                                        {activeStage === 1 && "Skim the paper, see Intro/Abstract to get the initial idea."}
                                        {activeStage === 2 && "Assigning sections based on your interest..."}
                                        {activeStage === 3 && "Deep reading agents are assisting your research."}
                                        {activeStage === 4 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span>Timer ended.</span>
                                                <button
                                                    onClick={() => setShowReport(true)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-md shadow-sm font-semibold transition-colors text-[9px]"
                                                >
                                                    View Report
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Skip / Summary Controls */}
                            {activeStage >= 1 && activeStage <= 3 && (
                                <div className="flex items-center gap-1.5 border-l pl-3 ml-1 border-gray-200">
                                    <button
                                        onClick={() => setShowSummary(!showSummary)}
                                        className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all
                                            ${showSummary ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}
                                        `}
                                    >
                                        Summary
                                    </button>
                                    <button
                                        onClick={() => (window as any).skipPhase()}
                                        className="p-1 hover:bg-gray-100 rounded-md text-gray-400 transition-colors"
                                        title="Skip Stage"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* MINIMIZED STATUS BAR (Click to Open) */}
            <AnimatePresence>
                {
                    !isOpen && (
                        <motion.div
                            initial={{ y: 50 }}
                            animate={{ y: 0 }}
                            exit={{ y: 50 }}
                            onClick={() => setIsOpen(true)}
                            className="fixed bottom-0 left-0 right-0 z-[50] h-9 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-950 transition-colors"
                        >
                            {/* Left: Status Indicator */}
                            <div className="flex items-center gap-3">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${!hasOnboarded ? 'bg-blue-500 animate-pulse' : 'bg-green-500'} `} />
                                    System Flow
                                </h3>
                                <div className="bg-gray-700 w-[1px] h-3" />
                                <span className="text-[10px] text-gray-500 font-mono">
                                    {!hasOnboarded ? `INIT_PHASE_${activeStage}` : 'LIVE_ORCHESTRATION'}
                                </span>
                            </div>

                            {/* Center: Latest Event Ticker */}
                            {latestEvent && (
                                <div className="flex items-center gap-2 max-w-[500px] overflow-hidden">
                                    <span className="text-[10px] font-mono text-green-500">[{latestEvent.agent.replace('agent-', 'AG_')}]</span>
                                    <span className="text-[10px] text-gray-300 truncate">{latestEvent.event}</span>
                                </div>
                            )}

                            {/* Right: Expand Hint & Summary Toggle */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSummary(!showSummary);
                                    }}
                                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${showSummary ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-300'}`}
                                    title="Toggle AI Summary"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                                    <span>Quick Summary</span>
                                </button>
                                <div className="h-4 w-[1px] bg-gray-700" />
                                <div className="text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* ✅ PERSISTENT SUMMARY OVERLAY */}
            <AnimatePresence>
                {
                    showSummary && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[55] w-full max-w-xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-xl p-6 pointer-events-auto overflow-hidden text-left"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    AI Quick Summary
                                </div>
                                <button onClick={() => setShowSummary(false)} className="text-gray-400 hover:text-gray-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {displaySummaryContent}
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] h-[340px] bg-white border-t border-gray-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col"
                    >
                        {/* HEADER / TOOLBAR */}
                        <div className="h-10 border-b border-gray-100 flex items-center justify-between px-4 bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${!hasOnboarded ? 'bg-blue-500 animate-pulse' : 'bg-green-500'} `} />
                                    System Flow
                                </h3>
                                <div className="h-4 w-[1px] bg-gray-300" />
                                <span className="text-xs text-gray-500 font-mono">
                                    {!hasOnboarded ? `INIT_PHASE_${activeStage}/3` : 'ACTIVE_MONITORING'}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSummary(!showSummary);
                                        }}
                                        className={`mr-4 text-xs font-semibold px-2 py-1 rounded border transition-colors ${showSummary ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        📄 Quick Summary
                                    </button>
                                    <span>{getPhaseInstruction()}</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* HORIZONTAL CONTENT AREA */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar bg-gray-50/10">
                            <div className="flex items-center h-full min-w-max gap-8 px-8">

                                {/* STAGE 1 */}
                                <div className={`relative flex flex-col gap-3 transition-opacity duration-500 ${activeStage >= 1 || hasOnboarded ? 'opacity-100' : 'opacity-30 blur-sm'}`}>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Phase 1: Reflection</span>
                                    <div className={`bg-white border rounded-xl p-3 w-[220px] shadow-sm relative ${activeStage > 1 ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'}`}>
                                        <AnimatePresence>
                                            {activeStage > 1 && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-md z-10"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Progress Timer Overlay for Phase 1 - REMOVED (Using Main floating timer) */}
                                        <AgentNode
                                            icon={Icons.reflection}
                                            label="Reflection Analysis"
                                            desc={activeStage > 1 ? "✓ Analysis Complete" : (getAgentData('agent-4')?.lastActivity || "Analyzing gaze & scroll...")}
                                            active={true}
                                            pulse={activeStage === 1 && (isAgentActive('agent-4') || isAgentActive('agent-1'))}
                                            state={activeStage > 1 ? 'idle' : 'active'}
                                            small
                                        />
                                    </div>
                                    {activeStage === 1 && !hasOnboarded && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-[10px] text-blue-500 font-medium pl-1 animate-pulse"
                                        >
                                            {formatTime(timeLeft)} remaining...
                                        </motion.span>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className={`transition-colors duration-500 ${activeStage > 1 ? 'text-green-400' : 'text-gray-300'}`}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>

                                {/* STAGE 2 */}
                                <div className={`relative flex flex-col gap-3 transition-opacity duration-500 ${activeStage >= 2 || hasOnboarded ? 'opacity-100' : 'opacity-30 blur-sm'}`}>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Phase 2: Role</span>
                                    <div className={`bg-white border rounded-xl p-3 w-[220px] shadow-sm relative ${activeStage > 2 ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'}`}>
                                        <AnimatePresence>
                                            {activeStage > 2 && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-md z-10"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Progress Timer Overlay for Phase 2 - REMOVED (Using Main floating timer) */}
                                        <AgentNode
                                            icon={Icons.role}
                                            label="Role Assignment"
                                            desc={activeStage > 2 ? "✓ Role Assigned" : (getAgentData('agent-2')?.lastActivity || "Matching reading role...")}
                                            active={true}
                                            pulse={activeStage === 2 && isAgentActive('agent-2')}
                                            state={activeStage > 2 ? 'idle' : 'active'}
                                            small
                                        />
                                    </div>
                                    {activeStage === 2 && !hasOnboarded && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-[10px] text-blue-500 font-medium pl-1 animate-pulse"
                                        >
                                            {formatTime(timeLeft)} remaining...
                                        </motion.span>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="text-gray-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>

                                {/* STAGE 3 (Parallel) */}
                                <div className={`flex flex-col gap-3 transition-opacity duration-500 ${activeStage >= 3 || hasOnboarded ? 'opacity-100' : 'opacity-30 blur-sm'}`}>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Phase 3: Deep Reading Swarm</span>
                                    <div className="grid grid-flow-col grid-rows-2 gap-3">
                                        <div className="w-[190px]"><AgentNode icon={Icons.interaction} label="Interaction" desc="Active" small pulse={isAgentActive('agent-1')} state="active" /></div>
                                        <div className="w-[190px]"><AgentNode icon={Icons.discussion} label="Discussion" desc="Active" small pulse={isAgentActive('agent-3')} state="active" /></div>
                                        <div className="w-[190px]"><AgentNode icon={Icons.matching} label="Matching" desc="Active" small pulse={isAgentActive('agent-2')} state="active" /></div>
                                        <div className="w-[190px]"><AgentNode icon={Icons.fact} label="Fact Checking" desc="Active" small pulse={isAgentActive('agent-8')} state="active" /></div>
                                        <div className="w-[190px]"><AgentNode icon={Icons.related} label="Related Work" desc="Active" small pulse={isAgentActive('agent-9')} state="active" /></div>
                                        <div className="w-[190px]"><AgentNode icon={Icons.structured} label="Summary" desc="Active" small pulse={isAgentActive('agent-5')} state="active" /></div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* FOOTER LOG */}
                        <div className="h-8 bg-gray-900 flex items-center px-4 gap-4 overflow-hidden">
                            <div className="text-[10px] uppercase font-bold text-gray-500 flex-shrink-0">Term_Log &gt;</div>
                            <AnimatePresence mode="wait">
                                {recentEvents.length > 0 && (
                                    <motion.div
                                        key={recentEvents[0].timestamp}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex items-center gap-2 text-xs font-mono text-gray-300 truncate"
                                    >
                                        <span className="text-green-400">[{recentEvents[0].agent.replace('agent-', 'AG_')}]</span>
                                        <span>{recentEvents[0].event}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* QUICK SUMMARY SIDE PANEL */}
            <AnimatePresence>
                {showSummary && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        className="fixed top-24 right-6 w-80 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/20 z-[60] overflow-hidden flex flex-col max-h-[70vh]"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Executive Summary
                            </h3>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto text-sm text-gray-600 leading-relaxed custom-scrollbar">
                            {displaySummaryContent}
                            {!summary && (
                                <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-3"></div>
                                    <p className="text-xs font-medium text-indigo-800">Analyzing document structure...</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function ActivityLogItem({ agent, action, time, opacity = 1 }: any) {
    return (
        <div className="flex items-start gap-3 text-sm" style={{ opacity }}>
            <div className="min-w-[4px] h-[4px] mt-2 rounded-full bg-gray-300" />
            <div>
                <p className="font-medium text-gray-700">{agent}</p>
                <p className="text-gray-500 text-xs">{action}</p>
            </div>
            <div className="ml-auto text-xs text-gray-400 tabular-nums">
                {time}
            </div>
        </div>
    )
}

function AgentNode({ icon, label, desc, active, pulse, small, state }: any) {
    // state can be 'active', 'idle', 'completed', or undefined (default logic)
    // if state is provided as 'idle', fade it out
    const isIdle = state === 'idle'

    return (
        <motion.div
            className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${pulse ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-100'
                } ${small ? 'w-full' : ''} ${isIdle ? 'opacity-40 grayscale' : 'opacity-100'}`}
            animate={pulse ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
        >
            <div className={`
        flex items-center justify-center rounded-lg text-white
        ${small ? 'w-8 h-8' : 'w-12 h-12'}
        ${pulse ? 'bg-blue-600' : 'bg-gray-400'}
      `}>
                {icon}
            </div>
            <div>
                <h4 className={`font-semibold ${small ? 'text-sm' : 'text-base'} text-gray-800`}>{label}</h4>
                {desc && <p className="text-xs text-gray-500">{desc}</p>}
            </div>

            {pulse && (
                <span className="absolute right-3 top-3 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            )}
        </motion.div>
    )
}
