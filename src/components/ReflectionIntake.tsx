'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic, Upload, X, FileText, CheckCircle2, Sparkles, AudioLines, ChevronRight, Loader2, ArrowLeft, Wand2, Target, ScanSearch, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Google Material 3 Spring Physics
const SPRING_TRANSITION = { type: "spring", stiffness: 300, damping: 30 }

interface ReaderSetup {
    expertiseLevel: 'novice' | 'familiar' | 'expert'
    readingGoal: 'overview' | 'deep' | 'methodology' | 'evaluate' | 'find-gaps'
    priorKnowledge: string
    completedAt: string
}

interface ReflectionIntakeProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (reflection: { type: 'text' | 'audio' | 'file', content: string }) => void
    onReset?: () => void
    reflectionSubmitted?: boolean
    currentReflection?: { type: 'text' | 'audio' | 'file', content: string } | null
    readerSetup?: ReaderSetup | null
}

/** Convert a ReaderSetup into a natural-language reflection string for A10. */
function buildReflectionFromSetup(setup: ReaderSetup): string {
    const expertise: Record<ReaderSetup['expertiseLevel'], string> = {
        novice: 'New to this subfield',
        familiar: 'Familiar with the domain',
        expert: 'Expert in this area',
    }
    const goal: Record<ReaderSetup['readingGoal'], string> = {
        overview: 'reading for a high-level overview of the contribution',
        deep: 'doing a deep read to fully understand the method and claims',
        methodology: 'focused on scrutinising the methodology and experimental design',
        evaluate: 'evaluating the paper as a reviewer — checking evidence-to-claim fidelity',
        'find-gaps': 'reading to identify gaps and position future work',
    }
    const parts: string[] = [`${expertise[setup.expertiseLevel]}; ${goal[setup.readingGoal]}.`]
    if (setup.priorKnowledge?.trim()) {
        parts.push(`Prior knowledge: ${setup.priorKnowledge.trim()}.`)
    }
    return parts.join(' ')
}

export default function ReflectionIntake({ isOpen, onClose, onSubmit, onReset, reflectionSubmitted, currentReflection, readerSetup }: ReflectionIntakeProps) {
    const [reflectionType, setReflectionType] = useState<'text' | 'audio' | 'file' | null>(null)
    const [textContent, setTextContent] = useState(currentReflection?.type === 'text' ? currentReflection.content : '')
    const [isRecording, setIsRecording] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // ANALYSIS STATES for "System Logic"
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisStep, setAnalysisStep] = useState(0) // 0: Idle, 1: Text Processing, 2: Section Matching, 3: Complete

    const [hasFinished, setHasFinished] = useState(false)
    const [processedContent, setProcessedContent] = useState<string>(currentReflection?.content || '')
    const [uploadedFile, setUploadedFile] = useState<string | null>(currentReflection?.type === 'file' ? currentReflection.content.replace('File report uploaded: ', '') : null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // SUGGESTION CHIPS — calibration signals for A10 section assignment
    const suggestions = [
        "Expert in the methods; reading for contribution novelty",
        "Familiar with the domain; scrutinizing the evaluation design",
        "Reading as a reviewer — checking evidence-to-claim fidelity",
        "New to this subfield; need mechanism before claims",
        "Reviewing for related work — tracking citation gaps",
        "Checking reproducibility: data, code, and parameter reporting",
    ]

    const handleTextSubmit = () => {
        if (!textContent.trim()) return
        startAnalysisFlow('text', textContent)
    }

    // SIMULATED SYSTEM ANALYSIS -> "Producing Match Scores"
    const startAnalysisFlow = (type: 'text' | 'audio' | 'file', content: string) => {
        setIsAnalyzing(true)
        setAnalysisStep(1) // Processing Text

        // Step 1: Text Analysis
        setTimeout(() => {
            setAnalysisStep(2) // Calculating Section alignment
        }, 1500)

        // Step 2: Alignment Complete
        setTimeout(() => {
            setAnalysisStep(3)
            setHasFinished(true)
            onSubmit({ type, content })
            toast.success('Session Calibrated', { description: 'Document sections aligned to your profile.' })

            setTimeout(() => {
                onClose()
                setIsAnalyzing(false)
                setAnalysisStep(0)
            }, 1000)
        }, 3500)
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.onstop = () => {
                // Determine content based on simulation
                const simulatedText = "User expressed high familiarity with HCI methods but requested focus on the statistical evaluation sections."
                setProcessedContent(simulatedText)
                startAnalysisFlow('audio', simulatedText)

                setIsRecording(false)
                if (timerRef.current) clearInterval(timerRef.current)
            }

            mediaRecorder.start()
            setIsRecording(true)
            setRecordingDuration(0)
            timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000)

        } catch (err) {
            console.error(err)
            toast.error('Microphone access denied')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadedFile(file.name)
        setIsUploading(true)

        setTimeout(() => {
            setIsUploading(false)
            const extractedText = `Extracted profile from ${file.name}: Expert-level knowledge in AI Agents.`
            setProcessedContent(extractedText)
            startAnalysisFlow('file', extractedText)
        }, 1500)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const addSuggestion = (text: string) => {
        setTextContent(prev => prev ? `${prev} ${text}` : text)
    }

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 font-sans">

                    {/* SCIM BACKDROP */}
                    <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

                    {/* MAIN SURFACE CARD */}
                    <motion.div
                        layout
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        transition={SPRING_TRANSITION}
                        className="relative w-full max-w-lg bg-[#FCFCFC] rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#E2E8F0]/80"
                    >
                        {/* DECORATIVE HEADER */}
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none" />

                        {/* CLOSE BUTTON */}
                        {!isAnalyzing && (
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors z-20"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        )}

                        {/* CONTENT CONTAINER */}
                        <div className="relative z-10 flex flex-col h-full overflow-hidden">

                            {/* === ANALYSIS MODE (THE "SYSTEM LOGIC" VISUALIZATION) === */}
                            {isAnalyzing ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
                                    <div className="relative">
                                        {/* Animated Rings */}
                                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                                        <div className="relative w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center border border-blue-100">
                                            {analysisStep === 1 && <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />}
                                            {analysisStep === 2 && <ScanSearch className="w-10 h-10 text-purple-600 animate-bounce" />}
                                            {analysisStep === 3 && <CheckCircle2 className="w-12 h-12 text-green-500" />}
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-w-sm">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {analysisStep === 1 && "Reading your profile…"}
                                            {analysisStep === 2 && "Aligning to document sections…"}
                                            {analysisStep === 3 && "System calibrated"}
                                        </h3>
                                        <p className="text-slate-500 text-sm h-10">
                                            {analysisStep === 1 && "Extracting expertise signals and reading goals."}
                                            {analysisStep === 2 && "Scoring sections against your background — A10 assigning roles."}
                                            {analysisStep === 3 && "CoRead is ready. Agents will now adapt to you."}
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                            initial={{ width: "0%" }}
                                            animate={{ width: analysisStep === 1 ? "30%" : analysisStep === 2 ? "70%" : "100%" }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* STANDARD HEADER */}
                                    <div className="px-8 pt-8 pb-2 shrink-0">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-widest">
                                                <Target className="w-3 h-3" /> Phase I · Pre-Discussion
                                            </div>
                                        </div>

                                        <h2 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight text-center">
                                            {reflectionSubmitted ? 'Calibration active' : 'State your reading position'}
                                        </h2>
                                        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed text-center">
                                            Your expertise profile calibrates when A7 intervenes, which sections A10 assigns to you, and when the system stays silent.
                                        </p>
                                    </div>

                                    {/* VIEW CONTROLLER - SCROLLABLE CONTENT */}
                                    <div className="px-8 py-4 flex-1 overflow-y-auto">
                                        {reflectionSubmitted && !reflectionType ? (
                                            // === SUBMITTED STATE ===
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm w-full text-left">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Calibration Signal</div>
                                                    <p className="text-slate-700 text-lg leading-relaxed font-medium">"{currentReflection?.content}"</p>
                                                </div>
                                                <Button
                                                    onClick={() => setReflectionType('text')}
                                                    className="h-14 rounded-full px-8 bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-lg shadow-slate-200 w-full sm:w-auto"
                                                >
                                                    Recalibrate
                                                </Button>
                                            </div>
                                        ) : !reflectionType ? (
                                            // === SELECTION MODE ===
                                            <div className="flex flex-col gap-3 h-full content-center">
                                                {/* Briefing shortcut — 1-tap submit using PaperOrientationPanel data */}
                                                {readerSetup && (
                                                    <button
                                                        onClick={() => startAnalysisFlow('text', buildReflectionFromSetup(readerSetup))}
                                                        className="group w-full flex items-start gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-400 rounded-2xl transition-all text-left"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                            <BookOpen className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-sm font-semibold text-indigo-900">Use my briefing profile</span>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">1-tap</span>
                                                            </div>
                                                            <p className="text-xs text-indigo-700 leading-relaxed line-clamp-2">
                                                                {buildReflectionFromSetup(readerSetup)}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                                                    </button>
                                                )}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <SelectionCard
                                                        icon={<FileText className="w-7 h-7" />}
                                                        title="Text"
                                                        label={readerSetup ? 'Edit & refine' : 'Write goals'}
                                                        onClick={() => {
                                                            if (readerSetup && !textContent.trim()) {
                                                                setTextContent(buildReflectionFromSetup(readerSetup))
                                                            }
                                                            setReflectionType('text')
                                                        }}
                                                    />
                                                    <SelectionCard
                                                        icon={<Mic className="w-7 h-7" />}
                                                        title="Voice"
                                                        label="Speak naturally"
                                                        onClick={() => setReflectionType('audio')}
                                                    />
                                                    <SelectionCard
                                                        icon={<Upload className="w-7 h-7" />}
                                                        title="Upload"
                                                        label="Use existing file"
                                                        onClick={() => setReflectionType('file')}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // === INPUT MODE ===
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                className="flex flex-col h-full"
                                            >
                                                {/* Back Button */}
                                                <button
                                                    onClick={() => { setReflectionType(null); stopRecording(); }}
                                                    className="self-start mb-4 text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Cancel
                                                </button>

                                                {/* Text Mode Content */}
                                                {reflectionType === 'text' && (
                                                    <div className="flex flex-col gap-4">
                                                        {/* Input Area */}
                                                        <textarea
                                                            className="w-full h-36 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none leading-relaxed shadow-sm"
                                                            placeholder="e.g. Expert in HCI methods; reading to assess whether the D_s signal weights are empirically justified or theoretically assumed..."
                                                            value={textContent}
                                                            onChange={(e) => setTextContent(e.target.value)}
                                                            autoFocus
                                                        />

                                                        {/* Smart Chips */}
                                                        <div>
                                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick tags</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {suggestions.map((s, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => addSuggestion(s)}
                                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 text-xs font-medium rounded-full transition-colors border border-transparent"
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Audio Mode Content */}
                                                {reflectionType === 'audio' && (
                                                    <div className="flex flex-col items-center justify-center flex-1 gap-6 min-h-[200px]">
                                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? 'bg-red-50 text-red-500 scale-110 shadow-xl' : 'bg-slate-50 text-slate-400'}`}>
                                                            {isRecording ? <AudioLines className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                                                        </div>

                                                        <div className="text-center">
                                                            <h3 className="text-xl font-bold text-slate-900">
                                                                {isRecording ? formatTime(recordingDuration) : "State your reading position"}
                                                            </h3>
                                                            <p className="text-slate-500 text-sm mt-1">
                                                                Your expertise profile calibrates A10 section assignment and A7 silence routing.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* File Mode Content */}
                                                {reflectionType === 'file' && (
                                                    <div className="flex flex-col items-center justify-center flex-1 gap-6 min-h-[200px]">
                                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                                        <div onClick={() => !isUploading && fileInputRef.current?.click()}
                                                            className="w-full h-40 rounded-[24px] border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                                                            <Upload className="w-8 h-8 text-slate-400" />
                                                            <span className="font-bold text-slate-600">{isUploading ? "Analyzing..." : "Upload Profile / CV"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* === FOOTER ACTION AREA (ALWAYS VISIBLE) === */}
                                    {!!reflectionType && !reflectionSubmitted && (
                                        <div className="p-6 pt-4 bg-white border-t border-slate-100 z-20 shrink-0">
                                            {reflectionType === 'text' && (
                                                <Button onClick={handleTextSubmit} disabled={!textContent.trim()} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm w-full shadow-sm">
                                                    Calibrate System →
                                                </Button>
                                            )}
                                            {reflectionType === 'audio' && (
                                                <Button onClick={isRecording ? stopRecording : startRecording}
                                                    className={`w-full h-11 rounded-xl text-sm font-semibold transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                                    {isRecording ? "Stop & Analyze" : "Start Speaking"}
                                                </Button>
                                            )}
                                            {reflectionType === 'file' && hasFinished && (
                                                <Button onClick={() => handleTextSubmit()} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm">
                                                    Confirm & Calibrate →
                                                </Button>
                                            )}
                                            {reflectionType === 'file' && !hasFinished && (
                                                <Button disabled className="w-full h-11 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed">
                                                    Waiting for upload…
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function SelectionCard({ icon, title, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-100 hover:border-blue-200 rounded-[24px] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 min-h-[140px]"
        >
            <div className="w-12 h-12 rounded-[18px] bg-slate-50 text-slate-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors duration-300">
                {icon}
            </div>
            <div className="text-base font-bold text-slate-800">{title}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1">{label}</div>
        </button>
    )
}
