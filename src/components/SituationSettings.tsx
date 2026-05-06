'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
    X, Highlighter, Clock,
    RotateCw, MessageSquare, Save, RotateCcw,
    Zap, Brain, SlidersHorizontal
} from 'lucide-react'
import { contextualAI } from '@/lib/contextualAI'
import { toast } from 'sonner'

interface SituationSettingsProps {
    isOpen: boolean
    onClose: () => void
}

const SETTINGS = [
    {
        key: 'highlightCount' as const,
        label: 'Highlight Threshold',
        description: 'Highlights per section before "Intensive Reading" mode triggers',
        icon: Highlighter,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        badge: (v: number) => `${v} highlight${v === 1 ? '' : 's'}`,
        min: 1, max: 10, step: 1,
    },
    {
        key: 'timeSpent' as const,
        label: 'Focus Duration',
        description: 'Seconds on one section before "Deep Focus" or "Slow Zone" triggers',
        icon: Clock,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        badge: (v: number) => `${v}s`,
        min: 30, max: 600, step: 10,
    },
    {
        key: 'revisitCount' as const,
        label: 'Revisit Pattern',
        description: 'Section re-visits before "Confusion Loop" is detected',
        icon: RotateCw,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        badge: (v: number) => `${v} return${v === 1 ? '' : 's'}`,
        min: 2, max: 5, step: 1,
    },
    {
        key: 'annotationDensity' as const,
        label: 'Annotation Intensity',
        description: '% of section text annotated before "Heavy Study" mode triggers',
        icon: MessageSquare,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        badge: (v: number) => `${v}%`,
        min: 5, max: 50, step: 5,
    },
    {
        key: 'scrollIntensity' as const,
        label: 'Skimming Pattern',
        description: 'Rapid scrolls in a section before "Skimming but Stuck" triggers',
        icon: Zap,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        badge: (v: number) => `${v} scroll${v === 1 ? '' : 's'}`,
        min: 2, max: 15, step: 1,
    },
]

export default function SituationSettings({ isOpen, onClose }: SituationSettingsProps) {
    const [thresholds, setThresholds] = useState({
        highlightCount: 2,
        timeSpent: 120,
        revisitCount: 2,
        annotationDensity: 20,
        scrollIntensity: 5,
    })

    useEffect(() => {
        if (isOpen) {
            const current = contextualAI.struggleThresholds
            setThresholds({
                highlightCount: current.highlightCount,
                timeSpent: Math.round(current.timeSpent / 1000),
                revisitCount: current.revisitCount,
                annotationDensity: Math.round(current.annotationDensity * 100),
                scrollIntensity: (current as any).scrollIntensity || 5,
            })
        }
    }, [isOpen])

    const handleSave = () => {
        contextualAI.updateThresholds({
            highlightCount: thresholds.highlightCount,
            timeSpent: thresholds.timeSpent * 1000,
            revisitCount: thresholds.revisitCount,
            annotationDensity: thresholds.annotationDensity / 100,
            scrollIntensity: thresholds.scrollIntensity,
        } as any)
        toast.success('Settings saved')
        onClose()
    }

    const handleReset = () => {
        setThresholds({ highlightCount: 2, timeSpent: 120, revisitCount: 2, annotationDensity: 20, scrollIntensity: 5 })
        toast.info('Reset to defaults — click Save to apply')
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] flex flex-col overflow-hidden"
                style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Signal Thresholds</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Tune when AI assistance triggers</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                    {SETTINGS.map(({ key, label, description, icon: Icon, color, bg, badge, min, max, step }) => (
                        <div key={key}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-800">{label}</span>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${bg} ${color}`}>
                                    {badge(thresholds[key])}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3 pl-9">{description}</p>
                            <div className="pl-9 pr-1">
                                <Slider
                                    value={[thresholds[key]]}
                                    min={min}
                                    max={max}
                                    step={step}
                                    onValueChange={([v]) => setThresholds(t => ({ ...t, [key]: v }))}
                                />
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-slate-300">{min}</span>
                                    <span className="text-[10px] text-slate-300">{max}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium h-9 rounded-lg shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Save Changes
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-100 text-sm rounded-lg"
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    )
}
