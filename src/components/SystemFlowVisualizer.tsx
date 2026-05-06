'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiCoordinationCore, AgentActivity } from '@/lib/agents/aiCoordinationCore'
import { toast } from 'sonner'
import RealSessionReport from './RealSessionReport'

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
    const [summaryTab, setSummaryTab] = useState(0)
    const [showReport, setShowReport] = useState(false)

    // Helper to format timestamps to MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    // Google design tokens
    const G = {
        text:    '#202124',
        sub:     '#5F6368',
        muted:   '#9AA0A6',
        border:  '#DADCE0',
        divider: '#F1F3F4',
        surface: '#F8F9FA',
        blue:    '#1a73e8',
        blueBg:  '#E8F0FE',
        green:   '#188038',
        greenBg: '#E6F4EA',
        amber:   '#B06000',
        amberBg: '#FEF7E0',
        red:     '#C5221F',
        redBg:   '#FCE8E6',
        purple:  '#6200EE',
        purpleBg:'#F3E8FF',
        teal:    '#007B5F',
        tealBg:  '#E6F4F1',
    }

    const clean = (s: any): string => {
        if (!s || typeof s !== 'string') return ''
        const t = s.trimStart()
        if (t.startsWith('{') || t.startsWith('[') || t.startsWith('"')) return ''
        return s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^\p{Emoji}\s*/u, '').trim()
    }

    const bullets = (text: string, max = 4): string[] => {
        if (!text || typeof text !== 'string') return []
        return text.split('\n')
            .map(l => l.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^[•\-\*]\s*/, '').replace(/^\p{Emoji}\s*/u, '').trim())
            .filter(l => l.length > 15 && !l.endsWith(':'))
            .slice(0, max)
    }

    const renderSummaryContent = (raw: any) => {
        if (!raw) return null
        let data = raw
        if (typeof data === 'string') {
            try { data = JSON.parse(data) } catch { return null }
        }
        if (!data || typeof data !== 'object') return null

        const title    = clean(data.title)
        const authors  = clean(data.authors)
        const year     = clean(data.year)
        const journal  = clean(data.journal)
        const abstract = clean(data.abstract)

        const authorShort = authors
            ? authors.split(',').map((a: string) => a.trim()).slice(0, 2).join(', ') + (authors.split(',').length > 2 ? ' et al.' : '')
            : ''

        // Tab definitions — each tab groups related insight categories
        const TABS = [
            {
                id: 'overview',
                label: 'Overview',
                sections: [
                    { key: 'motivation', label: 'Why It Matters', color: G.purple, bg: G.purpleBg, max: 3 },
                    { key: 'summary',    label: 'Summary',        color: G.blue,   bg: G.blueBg,   max: 4 },
                    { key: 'keyPoints',  label: 'Key Points',     color: G.blue,   bg: G.blueBg,   max: 4 },
                ],
            },
            {
                id: 'findings',
                label: 'Findings',
                sections: [
                    { key: 'keyFindings', label: 'Key Findings', color: G.blue,  bg: G.blueBg,  max: 5 },
                    { key: 'results',     label: 'Results',      color: G.amber, bg: G.amberBg, max: 4 },
                ],
            },
            {
                id: 'methods',
                label: 'Methods',
                sections: [
                    { key: 'methods', label: 'Methodology', color: G.green, bg: G.greenBg, max: 5 },
                ],
            },
            {
                id: 'critique',
                label: 'Critique',
                sections: [
                    { key: 'limitations', label: 'Limitations', color: G.red,  bg: G.redBg,  max: 4 },
                    { key: 'futureWork',  label: 'Future Work', color: G.teal, bg: G.tealBg, max: 4 },
                ],
            },
        ]

        // Compute which tabs have content
        const tabsWithContent = TABS.map(tab => ({
            ...tab,
            groups: tab.sections
                .map(s => ({ ...s, items: bullets(data[s.key], s.max) }))
                .filter(s => s.items.length > 0),
        })).filter(tab => tab.groups.length > 0)

        // Also check if abstract-only mode
        const hasAbstractOnly = tabsWithContent.length === 0 && !!abstract

        const activeTabIdx = Math.min(summaryTab, tabsWithContent.length - 1)
        const activeTab = tabsWithContent[activeTabIdx]

        const SectionBlock = ({ label, color, bg, items }: { label: string; color: string; bg: string; items: string[] }) => (
            <div style={{ marginBottom: 20 }}>
                <span style={{
                    display: 'inline-flex',
                    fontSize: 11,
                    fontWeight: 600,
                    color,
                    background: bg,
                    padding: '3px 10px',
                    borderRadius: 100,
                    letterSpacing: '0.02em',
                    marginBottom: 10,
                }}>
                    {label}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <svg style={{ flexShrink: 0, marginTop: 5 }} width="6" height="6" viewBox="0 0 6 6">
                                <circle cx="3" cy="3" r="3" fill={color} opacity="0.85" />
                            </svg>
                            <span style={{ fontSize: 13, color: G.text, lineHeight: '20px', letterSpacing: '-0.003em' }}>
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )

        return (
            <div style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif", display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Paper identity block */}
                {(title || authorShort || year) && (
                    <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${G.divider}`, flexShrink: 0 }}>
                        {title && (
                            <p style={{ fontSize: 13, fontWeight: 500, color: G.text, lineHeight: '20px', marginBottom: 4, letterSpacing: '-0.01em' }}>
                                {title}
                            </p>
                        )}
                        <p style={{ fontSize: 12, color: G.sub, lineHeight: '18px', marginBottom: journal ? 8 : 0 }}>
                            {[authorShort, year].filter(Boolean).join(' · ')}
                        </p>
                        {journal && (
                            <span style={{
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 500,
                                color: G.blue,
                                background: G.blueBg,
                                padding: '2px 10px',
                                borderRadius: 100,
                            }}>
                                {journal.length > 48 ? journal.slice(0, 48) + '…' : journal}
                            </span>
                        )}
                    </div>
                )}

                {/* Google-style tab bar */}
                {tabsWithContent.length > 0 && (
                    <div style={{
                        display: 'flex',
                        borderBottom: `1px solid ${G.divider}`,
                        flexShrink: 0,
                        padding: '0 8px',
                        gap: 0,
                    }}>
                        {tabsWithContent.map((tab, i) => {
                            const isActive = i === activeTabIdx
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSummaryTab(i)}
                                    style={{
                                        position: 'relative',
                                        padding: '0 12px',
                                        height: 40,
                                        fontSize: 13,
                                        fontWeight: isActive ? 500 : 400,
                                        color: isActive ? G.blue : G.sub,
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderBottom: isActive ? `2px solid ${G.blue}` : '2px solid transparent',
                                        marginBottom: -1,
                                        transition: 'color 0.15s',
                                        letterSpacing: '-0.003em',
                                        whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = G.text }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = G.sub }}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', scrollbarWidth: 'thin' as const }}>
                    {hasAbstractOnly ? (
                        <>
                            <p style={{ fontSize: 11, fontWeight: 600, color: G.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Abstract</p>
                            <p style={{ fontSize: 13, color: G.sub, lineHeight: '21px' }}>
                                {abstract.slice(0, 400)}{abstract.length > 400 ? '…' : ''}
                            </p>
                        </>
                    ) : activeTab ? (
                        activeTab.groups.map(grp => (
                            <SectionBlock key={grp.key} label={grp.label} color={grp.color} bg={grp.bg} items={grp.items} />
                        ))
                    ) : (
                        <p style={{ fontSize: 13, color: G.muted, textAlign: 'center', marginTop: 32 }}>No data available</p>
                    )}
                </div>
            </div>
        )
    }

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

    // Refs to track state inside interval without re-triggering effect
    const stageRef = React.useRef(0)

    // Trigger Guided Flow on Mount
    useEffect(() => {
        if (hasOnboarded) return

        let roleTimer: NodeJS.Timeout

        const goToStage = (stage: number) => {
            setActiveStage(stage)
            stageRef.current = stage
        }

        const advanceStage = () => {
            const currentStage = stageRef.current
            if (currentStage === 1) {
                // Move to Phase 2: Role Assignment (auto-advances after 3s)
                goToStage(2)
                toast.success('Reflection complete', {
                    description: 'Assigning reading roles based on your goals…',
                    duration: 3000,
                })
                // Stage 2 auto-advances after 3 seconds
                roleTimer = setTimeout(() => {
                    goToStage(3)
                    toast.success('Roles assigned', {
                        description: 'Deep reading mode active. AI agents are assisting.',
                        duration: 4000,
                    })
                }, 3000)
            } else if (currentStage === 3) {
                // Session Complete
                setHasOnboarded(true)
                stageRef.current = 4
                setActiveStage(4)
                setShowReport(true)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('session_status', 'ended_' + Date.now())
                }
            }
        }

        // Expose functions to window
        ;(window as any).skipPhase = () => advanceStage()

        const startFlow = (startTime: number = Date.now()) => {
            setIsOpen(true)
            goToStage(1)
            toast.message('Session started · Step 1: Reflection', {
                description: 'Skim the abstract and introduction. Click "Continue" when ready.',
                duration: 6000,
            })
        }

        ;(window as any).startSession = () => {
            const now = Date.now()
            localStorage.setItem('session_status', 'started_' + now)
            window.dispatchEvent(new CustomEvent('request-session-start', { detail: now }))
            startFlow(now)
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'session_status') {
                if (e.newValue?.startsWith('ended_')) {
                    setHasOnboarded(true)
                    setActiveStage(4)
                    setShowReport(true)
                } else if (e.newValue?.startsWith('started_')) {
                    const startTime = parseInt(e.newValue.split('_')[1])
                    startFlow(startTime)
                }
            }
        }

        const handleRemoteStart = (e: CustomEvent) => {
            startFlow(e.detail)
        }

        const currentSession = localStorage.getItem('session_status')
        if (currentSession?.startsWith('started_')) {
            const startTime = parseInt(currentSession.split('_')[1])
            if (Date.now() - startTime < 600000) startFlow(startTime)
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorageChange)
            window.addEventListener('remote-session-start', handleRemoteStart as EventListener)
        }

        return () => {
            clearTimeout(roleTimer)
            if (typeof window !== 'undefined') {
                window.removeEventListener('storage', handleStorageChange)
                window.removeEventListener('remote-session-start', handleRemoteStart as EventListener)
            }
        }
    }, [hasOnboarded])


    // LIVE SIMULATION (Demonstrates Eye Tracking Logic)
    useEffect(() => {
        // We only want this script to run during Phase 3 (Deep Reading) AND Phase 4 (Extended)
        // ❌ DISABLED: Simulation turned off to allow real testing
        return
        if (activeStage < 3) return

        const startTimeRef = { current: Date.now() }
        const eventsTriggered = { current: { struggle: false, help: false, collab: false } }


        // ❌ DISABLED: Fake peer injection for demo
        // if (aiCoordinationCore['injectFakePeer']) {
        //     aiCoordinationCore.injectFakePeer('user-emma', 'Emma', 'simulated-section', 'proficient')
        // }


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
            <RealSessionReport
                isOpen={showReport}
                onClose={() => setShowReport(false)}
                reflection={null} // Will be passed from parent
                assignments={[]} // Will be passed from parent
                collaborationData={{}} // Will be passed from parent
            />


            {/* STATUS BAR */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        exit={{ y: 50 }}
                        className="absolute bottom-0 left-0 right-0 z-[50] h-10 bg-white border-t border-gray-100 flex items-center justify-between px-5"
                        style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.04)' }}
                    >
                        {/* Left: status dot + human-readable label */}
                        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setIsOpen(true)}>
                            <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                                activeStage === 0 ? 'bg-gray-300' :
                                activeStage === 4 ? 'bg-emerald-500' :
                                'bg-indigo-500 animate-pulse'
                            }`} />
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={activeStage}
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -3 }}
                                    className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors"
                                >
                                    {activeStage === 0 && 'AI agents ready'}
                                    {activeStage === 1 && 'Phase I — Pre-reading reflection'}
                                    {activeStage === 2 && 'Phase I — Assigning section roles…'}
                                    {activeStage === 3 && 'Phase II — Reading in progress'}
                                    {activeStage === 4 && 'Session complete'}
                                </motion.span>
                            </AnimatePresence>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-3">
                            {activeStage === 0 && (
                                <button
                                    onClick={() => (window as any).startSession()}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shadow-sm"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                                    Start Session
                                </button>
                            )}
                            {activeStage === 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); (window as any).skipPhase(); }}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Continue →
                                </button>
                            )}
                            {activeStage === 2 && (
                                <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                            )}
                            {activeStage === 3 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); (window as any).skipPhase(); }}
                                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    End session
                                </button>
                            )}
                            {activeStage === 4 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowReport(true); }}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    View Report
                                </button>
                            )}

                            <div className="w-px h-4 bg-gray-100" />

                            <button
                                onClick={(e) => { e.stopPropagation(); if (!showSummary) setSummaryTab(0); setShowSummary(!showSummary); }}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showSummary ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                                Summary
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 right-0 z-[60] h-[340px] bg-white border-t border-gray-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col"
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
                                            if (!showSummary) setSummaryTab(0);
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
                                            className="text-[10px] text-indigo-500 font-medium pl-1 animate-pulse"
                                        >
                                            In progress…
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
                                            className="text-[10px] text-purple-500 font-medium pl-1 animate-pulse"
                                        >
                                            Assigning…
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
                        <div className="h-7 bg-gray-50 border-t border-gray-100 flex items-center px-4 gap-3 overflow-hidden">
                            <div className="text-[10px] uppercase font-bold text-gray-400 flex-shrink-0">Activity</div>
                            <AnimatePresence mode="wait">
                                {recentEvents.length > 0 && (
                                    <motion.div
                                        key={recentEvents[0].timestamp}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="flex items-center gap-2 text-[11px] text-gray-500 truncate"
                                    >
                                        <span className="text-indigo-500 font-medium">{recentEvents[0].agent.replace('agent-', 'Agent ')}</span>
                                        <span>{recentEvents[0].event}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* EXECUTIVE SUMMARY PANEL — Google Knowledge Panel style */}
            <AnimatePresence>
                {showSummary && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -4 }}
                        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            position: 'fixed',
                            top: 60,
                            right: 16,
                            width: 400,
                            maxHeight: 'calc(100vh - 80px)',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#fff',
                            borderRadius: 8,
                            border: '1px solid #DADCE0',
                            boxShadow: '0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15)',
                            overflow: 'hidden',
                            fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
                        }}
                    >
                        {/* Header — matches Google Workspace sidebar header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 8px 0 16px',
                            height: 52,
                            borderBottom: '1px solid #DADCE0',
                            flexShrink: 0,
                            background: '#fff',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#E8F0FE" stroke="#1a73e8" strokeWidth="1.5" strokeLinejoin="round"/>
                                    <polyline points="14 2 14 8 20 8" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="8" y1="13" x2="16" y2="13" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round"/>
                                    <line x1="8" y1="17" x2="13" y2="17" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#202124', letterSpacing: '-0.01em' }}>
                                    Paper Summary
                                </span>
                            </div>
                            <button
                                onClick={() => setShowSummary(false)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#5F6368',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F1F3F4')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        {/* Body — scroll managed inside renderSummaryContent tab pane */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {!summary ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
                                    <div
                                        className="animate-spin"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            border: '3px solid #E8F0FE',
                                            borderTopColor: '#1a73e8',
                                        }}
                                    />
                                    <p style={{ fontSize: 13, color: '#5F6368', margin: 0 }}>Generating summary…</p>
                                </div>
                            ) : (
                                renderSummaryContent(summary)
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
