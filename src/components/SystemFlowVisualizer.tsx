'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiCoordinationCore, AgentActivity } from '@/lib/agents/aiCoordinationCore'
import { toast } from 'sonner'

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

export function SystemFlowVisualizer() {
    const [agents, setAgents] = useState<AgentActivity[]>([])
    const [recentEvents, setRecentEvents] = useState<any[]>([])
    const [activeStage, setActiveStage] = useState(0) // 0: Init, 1: Reflection, 2: Assignment, 3: Execution
    const [isOpen, setIsOpen] = useState(false)
    const [hasOnboarded, setHasOnboarded] = useState(false)

    // Polling for updates
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

    const toggle = () => setIsOpen(!isOpen)

    // Trigger Guided Flow on Mount
    useEffect(() => {
        if (hasOnboarded) return

        const runFlow = async () => {
            // Wait a moment after join
            await new Promise(r => setTimeout(r, 1500))

            // PHASE 1: REFLECTION
            setActiveStage(1)
            setIsOpen(true)
            toast.message('Step 1: Reflection Analysis', {
                description: 'Please skim the paper for a moment. Identifying your reading patterns...',
                duration: 5000,
            })

            // Simulate reflection time
            await new Promise(r => setTimeout(r, 6000))

            // PHASE 2: ROLE ASSIGNMENT
            setActiveStage(2)
            toast.success('Reflection Complete', {
                description: 'We noticed you focused on the "Results" section.',
                duration: 3000,
            })
            await new Promise(r => setTimeout(r, 1500))
            toast.message('Step 2: Role Assignment', {
                description: 'Assigning you the "Critical Reviewer" role to verify these findings.',
                duration: 5000,
            })

            // Simulate assignment time
            await new Promise(r => setTimeout(r, 4000))

            // PHASE 3: PARALLEL EXECUTION
            setActiveStage(3)
            toast.success('System Fully Active', {
                description: 'All agents are now running in parallel to support your review.',
                duration: 3000,
            })

            // Finish
            await new Promise(r => setTimeout(r, 2000))
            setHasOnboarded(true)
        }

        runFlow()
    }, [hasOnboarded])


    // LIVE SIMULATION (Demonstrates Eye Tracking Logic)
    useEffect(() => {
        if (!hasOnboarded) return

        const liveEvents = [
            { agent: 'agent-1', event: 'fixation-detected', data: { text: 'Equation (3.2)', sectionName: 'Methodology' } },
            { agent: 'agent-5', event: 'skimming-detected', data: { speed: 600 } },
            { agent: 'agent-1', event: 'fixation-detected', data: { text: 'Hypothesis H1', sectionName: 'Introduction' } },
            { agent: 'agent-7', event: 'confusion-detected', data: { sectionName: 'Results' } },
            { agent: 'agent-2', event: 'peer-joined', data: { peerName: 'Emma' } },
        ]

        const interval = setInterval(() => {
            // 30% chance to trigger an event every 3 seconds
            if (Math.random() > 0.7) {
                const randomEvent = liveEvents[Math.floor(Math.random() * liveEvents.length)]

                // Route to Core (Tests the real pipeline)
                if (randomEvent.event === 'fixation-detected') {
                    aiCoordinationCore.routeUserAction('fixation-detected', {
                        sectionId: 'simulated-section',
                        text: randomEvent.data.text,
                        page: 1
                    })
                    // UI Feedback handled by ApryseWebViewer for real events, 
                    // but for sim we might want to manually show toast if Core doesn't (Core activates agents)
                } else {
                    // Generic routing for other sim events
                    aiCoordinationCore.routeAgentEvent(randomEvent.agent, randomEvent.event, randomEvent.data)
                }

                // TRIGGER REAL UI FEEDBACK (Simulation) - these toasts are now independent of the core's internal logging
                if (randomEvent.event === 'confusion-detected') {
                    toast.warning('Confusion Detected', { description: 'Would you like an AI explanation for this section?', action: { label: 'Explain', onClick: () => console.log('Explain clicked') } })
                } else if (randomEvent.event === 'skimming-detected') {
                    toast("Structured Summary Ready", { description: "We noticed you're skimming. Here's a quick summary." })
                } else if (randomEvent.event === 'peer-joined') {
                    toast("Collaborator Nearby", { description: `${randomEvent.data.peerName} is also reading the Results section.` })
                }
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [hasOnboarded])

    // Get the very latest event for the collapsed view
    const latestEvent = recentEvents[0]

    const getPhaseInstruction = () => {
        if (!hasOnboarded) {
            if (activeStage === 1) return "Please skim the document. Agents are analyzing your attention..."
            if (activeStage === 2) return "Analyzing your reflection to assign the optimal reading role..."
            if (activeStage === 3) return "System active. Agents will now assist your reading."
        }
        return "Live: Agents are quietly monitoring for confusion or needed context."
    }

    return (
        <>
            {/* MINIMIZED STATUS BAR (Click to Open) */}
            <AnimatePresence>
                {!isOpen && (
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

                        {/* Right: Expand Hint */}
                        <div className="text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
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

                                        {/* Progress Timer Overlay for Phase 1 */}
                                        {activeStage === 1 && !hasOnboarded && (
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <svg className="w-10 h-10 -rotate-90">
                                                    <circle className="text-gray-100" strokeWidth="2" stroke="currentColor" fill="transparent" r="18" cx="20" cy="20" />
                                                    <motion.circle
                                                        className="text-blue-500"
                                                        strokeWidth="2"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="18" cx="20" cy="20"
                                                        initial={{ pathLength: 0 }}
                                                        animate={{ pathLength: 1 }}
                                                        transition={{ duration: 6, ease: "linear" }}
                                                    />
                                                </svg>
                                            </div>
                                        )}
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
                                            ~6s remaining...
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

                                        {/* Progress Timer Overlay for Phase 2 */}
                                        {activeStage === 2 && !hasOnboarded && (
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <svg className="w-10 h-10 -rotate-90">
                                                    <circle className="text-gray-100" strokeWidth="2" stroke="currentColor" fill="transparent" r="18" cx="20" cy="20" />
                                                    <motion.circle
                                                        className="text-blue-500"
                                                        strokeWidth="2"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="18" cx="20" cy="20"
                                                        initial={{ pathLength: 0 }}
                                                        animate={{ pathLength: 1 }}
                                                        transition={{ duration: 4, ease: "linear" }}
                                                    />
                                                </svg>
                                            </div>
                                        )}
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
                                            ~4s remaining...
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
