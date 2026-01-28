'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic, Upload, Send, X, FileText, CheckCircle2, Sparkles, AudioLines, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface ReflectionIntakeProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (reflection: { type: 'text' | 'audio' | 'file', content: string }) => void
    onReset?: () => void
    reflectionSubmitted?: boolean
    currentReflection?: { type: 'text' | 'audio' | 'file', content: string } | null
}

export default function ReflectionIntake({ isOpen, onClose, onSubmit, onReset, reflectionSubmitted, currentReflection }: ReflectionIntakeProps) {
    const [reflectionType, setReflectionType] = useState<'text' | 'audio' | 'file' | null>(null)
    const [textContent, setTextContent] = useState(currentReflection?.type === 'text' ? currentReflection.content : '')
    const [isRecording, setIsRecording] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [uploadedFile, setUploadedFile] = useState<string | null>(currentReflection?.type === 'file' ? currentReflection.content.replace('File report uploaded: ', '') : null)
    const [hasFinished, setHasFinished] = useState(false)
    const [processedContent, setProcessedContent] = useState<string>(currentReflection?.content || '')

    // Real MediaRecorder state
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const [audioChunks, setAudioChunks] = useState<Blob[]>([])
    const [recordingDuration, setRecordingDuration] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Real File input ref
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleTextSubmit = () => {
        if (!textContent.trim()) return
        onSubmit({ type: 'text', content: textContent })
        toast.success('Reflection updated!', { description: 'Your cognitive profile has been refreshed.' })
        onClose()
    }

    // REAL AUDIO LOGIC
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder

            const chunks: Blob[] = []
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data)
            }

            mediaRecorder.onstop = () => {
                setIsTranscribing(true)
                // Simulate AI Transcription
                setTimeout(() => {
                    setIsTranscribing(false)
                    setHasFinished(true)
                    setProcessedContent("User indicated a strong background in gaze tracking but expressed specific interest in how Agent 1 handles 'semantic loops'. Goal: Focus on the Interaction Collector architecture.")
                    toast.success('Audio transcribed successfully!')
                }, 2500)

                setIsRecording(false)
                if (timerRef.current) clearInterval(timerRef.current)
            }

            mediaRecorder.start()
            setIsRecording(true)
            setRecordingDuration(0)

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1)
            }, 1000)

        } catch (err) {
            console.error('Failed to start recording:', err)
            toast.error('Microphone Error', { description: 'Please ensure microphone permissions are granted.' })
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
    }

    // REAL FILE LOGIC
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedFile(file.name)
        setIsUploading(true)

        // Simulate real extraction
        setTimeout(() => {
            setIsUploading(false)
            setHasFinished(true)
            setProcessedContent(`Extracted from ${file.name}: Summary of prior research into HCI. Key focus: Human-in-the-loop AI systems and multimodal feedback loops.`)
            toast.success('File content extracted!')
        }, 2000)
    }

    const handleFinalSubmit = (type: 'audio' | 'file') => {
        onSubmit({ type, content: processedContent })
        onClose()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl cursor-pointer"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 40 }}
                        className="relative w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 rounded-[32px] shadow-2xl overflow-hidden border border-white/20"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors z-20"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header Area */}
                        <div className="p-8 pb-4 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-6 font-bold text-2xl">
                                <Brain className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                                {reflectionSubmitted ? 'Your Cognitive Profile' : 'Phase 1: Initial Reflection'}
                            </h2>
                            <p className="text-slate-500 font-medium max-w-md mx-auto italic leading-relaxed text-sm">
                                {reflectionSubmitted
                                    ? "Based on your initial input, Agent 1 is now interpreting your reading gaps. You can update this at any time."
                                    : '"What do you already know about this topic, and what are your goals for this reading?"'}
                            </p>
                        </div>

                        {/* Selection Area / Review Area */}
                        {reflectionSubmitted && !reflectionType ? (
                            <div className="p-8 pt-4 flex flex-col items-center">
                                <div className="w-full bg-indigo-50 border border-indigo-100 rounded-3xl p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                            {currentReflection?.type === 'text' ? <FileText className="w-5 h-5" /> : currentReflection?.type === 'audio' ? <Mic className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Active Baseline</p>
                                            <p className="text-sm font-bold text-indigo-900">
                                                {currentReflection?.type === 'text' ? 'Detailed Goals Text' : currentReflection?.type === 'audio' ? 'Recorded Voice Reflection' : 'Uploaded Study Report'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-xl text-slate-700 text-sm font-medium leading-relaxed shadow-inner">
                                        {currentReflection?.content || "No baseline content extracted yet."}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            onReset?.();
                                            setReflectionType(null);
                                            setHasFinished(false);
                                            setTextContent('');
                                            setUploadedFile(null);
                                        }}
                                        className="h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 uppercase text-[10px] tracking-widest"
                                    >
                                        Reset Profile
                                    </Button>
                                    <Button
                                        onClick={() => setReflectionType('text')}
                                        className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
                                    >
                                        Update Content
                                    </Button>
                                </div>
                            </div>
                        ) : !reflectionType ? (
                            <div className="p-8 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ReflectionOption
                                    icon={<FileText className="w-6 h-6" />}
                                    title="Think & Type"
                                    description="Write your goals or questions"
                                    onClick={() => setReflectionType('text')}
                                    color="indigo"
                                />
                                <ReflectionOption
                                    icon={<Mic className="w-6 h-6" />}
                                    title="Speak Thoughts"
                                    description="Record a brief audio reflection"
                                    onClick={() => setReflectionType('audio')}
                                    color="rose"
                                />
                                <ReflectionOption
                                    icon={<Upload className="w-6 h-6" />}
                                    title="Upload Report"
                                    description="Share an existing study report"
                                    onClick={() => setReflectionType('file')}
                                    color="amber"
                                />
                            </div>
                        ) : (
                            <div className="p-8 pt-4 min-h-[350px] flex flex-col">
                                <button
                                    onClick={() => {
                                        setReflectionType(null)
                                        setHasFinished(false)
                                        if (isRecording) stopRecording()
                                    }}
                                    className="mb-4 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase tracking-widest transition-colors"
                                >
                                    <X className="w-3 h-3" /> Back to options
                                </button>

                                {reflectionType === 'text' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col">
                                        <div className="mb-2 text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                            Detailed Reflection
                                        </div>
                                        <textarea
                                            className="flex-1 w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-sm border-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium min-h-[180px] shadow-inner"
                                            placeholder="e.g., I have some experience with Gaze tracking but haven't seen how it applies to collaborative reading before..."
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                        />
                                        <Button onClick={handleTextSubmit} className="mt-4 bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl text-md font-bold shadow-lg shadow-indigo-100">
                                            Sync Initial Reflection <Sparkles className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                )}

                                {reflectionType === 'audio' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
                                        <div className="relative">
                                            {(isRecording || isTranscribing) && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1.5, opacity: 0 }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                    className={`absolute inset-0 rounded-full ${isTranscribing ? 'bg-indigo-400' : 'bg-rose-400'}`}
                                                />
                                            )}
                                            <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all shadow-xl relative z-10 
                         ${isRecording ? 'bg-rose-500 text-white' : isTranscribing ? 'bg-indigo-600 text-white' : hasFinished ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300 border-2 border-slate-100'}`}>
                                                {isRecording ? (
                                                    <>
                                                        <AudioLines className="w-14 h-14" />
                                                        <span className="text-xs font-mono font-bold mt-2">{formatTime(recordingDuration)}</span>
                                                    </>
                                                ) : isTranscribing ? (
                                                    <Loader2 className="w-14 h-14 animate-spin text-white" />
                                                ) : hasFinished ? (
                                                    <CheckCircle2 className="w-16 h-16" />
                                                ) : (
                                                    <Mic className="w-16 h-16" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center px-12">
                                            <p className="text-lg font-black text-slate-800 mb-2">
                                                {isRecording ? "Listening to your thoughts..." : isTranscribing ? "AI Transcribing..." : hasFinished ? "Reflection Transcribed" : "Speak to the System"}
                                            </p>
                                            {hasFinished ? (
                                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-600 font-medium italic leading-relaxed text-left max-h-24 overflow-y-auto">
                                                    "{processedContent}"
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    {isRecording ? "Your voice is being processed in real-time." : isTranscribing ? "Calibrating Agent 1 with your linguistics..." : "Describe your current knowledge level and specific learning objectives."}
                                                </p>
                                            )}
                                        </div>

                                        <div className="w-full">
                                            {!hasFinished && !isTranscribing ? (
                                                <Button
                                                    onClick={isRecording ? stopRecording : startRecording}
                                                    className={`w-full h-14 rounded-2xl text-lg font-black shadow-lg transition-all 
                            ${isRecording ? 'bg-slate-800 hover:bg-slate-900 border-b-4 border-slate-950' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 border-b-4 border-rose-800'}`}
                                                >
                                                    {isRecording ? "Stop Recording" : "Start Recording"}
                                                </Button>
                                            ) : !isTranscribing && (
                                                <Button
                                                    onClick={() => handleFinalSubmit('audio')}
                                                    className="w-full h-14 rounded-2xl text-lg font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 border-b-4 border-green-800"
                                                >
                                                    Lock Reflection & Continue <ChevronRight className="w-5 h-5 ml-2" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {reflectionType === 'file' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept=".pdf,.docx,.txt,.md"
                                        />

                                        <div
                                            onClick={() => !hasFinished && !isUploading && fileInputRef.current?.click()}
                                            className={`w-32 h-32 rounded-[40px] flex items-center justify-center transition-all cursor-pointer shadow-lg
                        ${isUploading ? 'bg-amber-100 text-amber-600' : hasFinished ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300 border-4 border-dashed border-slate-200 hover:border-amber-300 hover:bg-white'}`}
                                        >
                                            {isUploading ? <Loader2 className="w-12 h-12 animate-spin" /> : hasFinished ? <CheckCircle2 className="w-16 h-16" /> : <Upload className="w-16 h-16" />}
                                        </div>

                                        <div className="text-center px-12">
                                            <p className="text-lg font-black text-slate-800 mb-2">
                                                {isUploading ? "Reading Report..." : hasFinished ? "Report Successfully Synced" : "Upload Knowledge Report"}
                                            </p>
                                            {hasFinished ? (
                                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-600 font-medium italic leading-relaxed text-left max-h-24 overflow-y-auto">
                                                    "{processedContent}"
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                                    {isUploading ? "Extracting knowledge tokens..." : "Select an existing study log or summary report to bootstrap your collaborative session."}
                                                </p>
                                            )}
                                        </div>

                                        <div className="w-full">
                                            {!hasFinished ? (
                                                <Button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className={`w-full h-14 rounded-2xl text-lg font-black transition-all border-b-4
                            ${isUploading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-amber-500 hover:bg-amber-600 border-amber-800 text-white shadow-lg shadow-amber-100'}`}
                                                >
                                                    {isUploading ? "Ingesting..." : "Choose File"}
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => handleFinalSubmit('file')}
                                                    className="w-full h-14 rounded-2xl text-lg font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 border-b-4 border-green-800 text-white"
                                                >
                                                    Proceed to Session <ChevronRight className="w-5 h-5 ml-2" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Established Profile: {reflectionSubmitted ? "LOCKED" : "PENDING"}</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function ReflectionOption({ icon, title, description, onClick, color }: any) {
    const colorMap: any = {
        indigo: "hover:border-indigo-500 text-indigo-600 bg-indigo-50",
        rose: "hover:border-rose-500 text-rose-600 bg-rose-50",
        amber: "hover:border-amber-500 text-amber-600 bg-amber-50"
    }

    return (
        <button
            onClick={onClick}
            className={`group p-6 rounded-[32px] border-2 border-slate-100 transition-all text-left flex flex-col gap-3 h-full hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${colorMap[color] || ""}`}
        >
            <div className="w-14 h-14 rounded-[20px] bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:rotate-3">
                {icon}
            </div>
            <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">{title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 opacity-70 leading-tight">{description}</p>
            </div>
        </button>
    )
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 2v4" />
            <path d="m16.2 7.8 2.9-2.9" />
            <path d="M18 12h4" />
            <path d="m16.2 16.2 2.9 2.9" />
            <path d="M12 18v4" />
            <path d="m4.9 19.1 2.9-2.9" />
            <path d="M2 12h4" />
            <path d="m4.9 4.9 2.9 2.9" />
        </svg>
    )
}
