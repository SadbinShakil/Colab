'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronDown, ChevronUp, FileText, Mic, Upload, Sparkles } from 'lucide-react'

interface UserReflection {
    userId: string
    userName: string
    type: 'text' | 'audio' | 'file'
    content: string
    timestamp: number
    avatar?: string
}

interface TeamReflectionsProps {
    currentUserId: string
    currentUserName: string
    documentId: string
}

export default function TeamReflections({ currentUserId, currentUserName, documentId }: TeamReflectionsProps) {
    const [reflections, setReflections] = useState<UserReflection[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [expandedReflection, setExpandedReflection] = useState<string | null>(null)

    // Listen for reflection submissions via socket or localStorage
    useEffect(() => {
        // Listen for custom events from ReflectionIntake (local user)
        const handleReflectionSubmit = (e: CustomEvent) => {
            const { userId, userName, reflection } = e.detail

            const newReflection: UserReflection = {
                userId,
                userName,
                type: reflection.type,
                content: reflection.content,
                timestamp: Date.now()
            }

            setReflections(prev => {
                // Remove old reflection from same user
                const filtered = prev.filter(r => r.userId !== userId)
                return [...filtered, newReflection].sort((a, b) => b.timestamp - a.timestamp)
            })

            // Broadcast to other tabs/users via localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(`reflection_${documentId}_${userId}`, JSON.stringify(newReflection))
                window.dispatchEvent(new CustomEvent('reflection-broadcast', { detail: newReflection }))
            }
        }

        // Listen for broadcasts from other tabs (same browser)
        const handleReflectionBroadcast = (e: CustomEvent) => {
            const newReflection = e.detail as UserReflection
            if (newReflection.userId !== currentUserId) {
                setReflections(prev => {
                    const filtered = prev.filter(r => r.userId !== newReflection.userId)
                    return [...filtered, newReflection].sort((a, b) => b.timestamp - a.timestamp)
                })
            }
        }

        // ✅ CRITICAL: Listen for remote reflections from socket (other users/browsers)
        const handleRemoteReflection = (e: CustomEvent) => {
            console.log('🧠 [TeamReflections] Received remote reflection:', e.detail)
            const { userId, userName, type, content, timestamp } = e.detail

            const newReflection: UserReflection = {
                userId,
                userName,
                type,
                content,
                timestamp: timestamp || Date.now()
            }

            setReflections(prev => {
                // Remove old reflection from same user
                const filtered = prev.filter(r => r.userId !== userId)
                const updated = [...filtered, newReflection].sort((a, b) => b.timestamp - a.timestamp)
                console.log('🧠 [TeamReflections] Updated reflections:', updated)
                return updated
            })

            // Also save to localStorage for persistence
            if (typeof window !== 'undefined') {
                localStorage.setItem(`reflection_${documentId}_${userId}`, JSON.stringify(newReflection))
            }
        }

        // Load existing reflections from localStorage
        const loadExistingReflections = () => {
            if (typeof window === 'undefined') return

            const stored: UserReflection[] = []
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith(`reflection_${documentId}_`)) {
                    try {
                        const reflection = JSON.parse(localStorage.getItem(key) || '{}')
                        if (reflection.userId && reflection.content) {
                            stored.push(reflection)
                        }
                    } catch (e) {
                        console.error('Failed to parse reflection:', e)
                    }
                }
            }
            console.log('🧠 [TeamReflections] Loaded existing reflections:', stored)
            setReflections(stored.sort((a, b) => b.timestamp - a.timestamp))
        }

        loadExistingReflections()

        window.addEventListener('reflection-submit', handleReflectionSubmit as EventListener)
        window.addEventListener('reflection-broadcast', handleReflectionBroadcast as EventListener)
        window.addEventListener('remote-reflection-updated', handleRemoteReflection as EventListener)

        return () => {
            window.removeEventListener('reflection-submit', handleReflectionSubmit as EventListener)
            window.removeEventListener('reflection-broadcast', handleReflectionBroadcast as EventListener)
            window.removeEventListener('remote-reflection-updated', handleRemoteReflection as EventListener)
        }
    }, [currentUserId, documentId])

    const getReflectionIcon = (type: 'text' | 'audio' | 'file') => {
        switch (type) {
            case 'text': return <FileText className="w-4 h-4" />
            case 'audio': return <Mic className="w-4 h-4" />
            case 'file': return <Upload className="w-4 h-4" />
        }
    }

    const getReflectionColor = (type: 'text' | 'audio' | 'file') => {
        switch (type) {
            case 'text': return 'bg-indigo-500'
            case 'audio': return 'bg-rose-500'
            case 'file': return 'bg-amber-500'
        }
    }

    const truncateContent = (content: string, maxLength: number = 60) => {
        if (content.length <= maxLength) return content
        return content.substring(0, maxLength) + '...'
    }

    if (reflections.length === 0) return null

    return (
        <div className="fixed top-20 right-4 z-[40] w-80">
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            >
                {/* Header */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                                {reflections.length}
                            </div>
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-slate-800">Team Reflections</h3>
                            <p className="text-xs text-slate-500">{reflections.length} member{reflections.length !== 1 ? 's' : ''} shared</p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    </motion.div>
                </button>

                {/* Expanded List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-slate-100"
                        >
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                {reflections.map((reflection) => (
                                    <div
                                        key={reflection.userId}
                                        className="border-b border-slate-50 last:border-b-0"
                                    >
                                        <button
                                            onClick={() => setExpandedReflection(
                                                expandedReflection === reflection.userId ? null : reflection.userId
                                            )}
                                            className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                        {reflection.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-bold text-slate-800 truncate">
                                                            {reflection.userId === currentUserId ? 'You' : reflection.userName}
                                                        </span>
                                                        <div className={`w-5 h-5 rounded ${getReflectionColor(reflection.type)} flex items-center justify-center text-white`}>
                                                            {getReflectionIcon(reflection.type)}
                                                        </div>
                                                    </div>

                                                    <AnimatePresence mode="wait">
                                                        {expandedReflection === reflection.userId ? (
                                                            <motion.div
                                                                key="expanded"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg mt-2"
                                                            >
                                                                {reflection.content}
                                                            </motion.div>
                                                        ) : (
                                                            <motion.p
                                                                key="collapsed"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="text-xs text-slate-500 truncate"
                                                            >
                                                                {truncateContent(reflection.content)}
                                                            </motion.p>
                                                        )}
                                                    </AnimatePresence>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(reflection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {reflection.userId === currentUserId && (
                                                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                                                                YOUR PROFILE
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expand indicator */}
                                                <motion.div
                                                    animate={{ rotate: expandedReflection === reflection.userId ? 180 : 0 }}
                                                    className="flex-shrink-0"
                                                >
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                </motion.div>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100">
                                <div className="flex items-center gap-2 text-xs text-indigo-600">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="font-medium">Real-time collaboration active</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
