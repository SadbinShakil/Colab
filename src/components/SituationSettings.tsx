'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
    X, Settings, Highlighter, Clock,
    RotateCw, MessageSquare, Save, RotateCcw,
    Zap, Info, Brain
} from 'lucide-react'
import { contextualAI } from '@/lib/contextualAI'
import { toast } from 'sonner'

interface SituationSettingsProps {
    isOpen: boolean
    onClose: () => void
}

export default function SituationSettings({ isOpen, onClose }: SituationSettingsProps) {
    const [thresholds, setThresholds] = useState({
        highlightCount: 2,
        timeSpent: 120, // in seconds for the UI
        revisitCount: 2,
        annotationDensity: 20, // in percentage for the UI
        scrollIntensity: 5
    })

    useEffect(() => {
        if (isOpen) {
            const current = contextualAI.struggleThresholds
            setThresholds({
                highlightCount: current.highlightCount,
                timeSpent: Math.round(current.timeSpent / 1000),
                revisitCount: current.revisitCount,
                annotationDensity: Math.round(current.annotationDensity * 100),
                scrollIntensity: (current as any).scrollIntensity || 5
            })
        }
    }, [isOpen])

    const handleSave = () => {
        contextualAI.updateThresholds({
            highlightCount: thresholds.highlightCount,
            timeSpent: thresholds.timeSpent * 1000,
            revisitCount: thresholds.revisitCount,
            annotationDensity: thresholds.annotationDensity / 100,
            scrollIntensity: thresholds.scrollIntensity
        } as any)
        toast.success('Settings Saved', {
            description: 'Your smart notification situations have been updated.'
        })
        onClose()
    }

    const handleReset = () => {
        const defaults = {
            highlightCount: 2,
            timeSpent: 120,
            revisitCount: 2,
            annotationDensity: 20,
            scrollIntensity: 5
        }
        setThresholds(defaults)
        toast.info('Reset to Defaults', {
            description: 'Click save to apply the default settings.'
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl border-0 animate-in zoom-in-95 duration-200">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-t-lg relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Smart Notification Settings</CardTitle>
                            <CardDescription className="text-indigo-100">
                                Define the "situations" that trigger AI assistance
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    {/* Highlight Count Situation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Highlighter className="w-5 h-5 text-blue-600" />
                                <Label className="text-base font-semibold">Highlight Threshold</Label>
                            </div>
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {thresholds.highlightCount} Highlights
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            How many highlights in one section should trigger the "Intensive Reading" situation?
                        </p>
                        <div className="pt-2">
                            <Slider
                                value={[thresholds.highlightCount]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={([v]) => setThresholds(t => ({ ...t, highlightCount: v }))}
                            />
                        </div>
                    </div>

                    {/* Time Spent Situation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <Label className="text-base font-semibold">Focus Duration</Label>
                            </div>
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                                {thresholds.timeSpent} Seconds
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            How long spent on a single section indicates a "Deep Focus" or "Slow Zone" situation?
                        </p>
                        <Slider
                            value={[thresholds.timeSpent]}
                            min={30}
                            max={600}
                            step={10}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, timeSpent: v }))}
                        />
                    </div>

                    {/* Revisit Count Situation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RotateCw className="w-5 h-5 text-purple-600" />
                                <Label className="text-base font-semibold">Revisit Pattern</Label>
                            </div>
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                                {thresholds.revisitCount} Returns
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            How many times returning to a section triggers the "Confusion Loop" situation?
                        </p>
                        <Slider
                            value={[thresholds.revisitCount]}
                            min={2}
                            max={5}
                            step={1}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, revisitCount: v }))}
                        />
                    </div>

                    {/* Annotation Density Situation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                <Label className="text-base font-semibold">Annotation Intensity</Label>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                                {thresholds.annotationDensity}% Content
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            What percentage of section text annotated triggers the "Heavy Study" situation?
                        </p>
                        <Slider
                            value={[thresholds.annotationDensity]}
                            min={5}
                            max={50}
                            step={5}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, annotationDensity: v }))}
                        />
                    </div>

                    {/* Skimming Intensity Situation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-600" />
                                <Label className="text-base font-semibold">Skimming Pattern</Label>
                            </div>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                                {thresholds.scrollIntensity} Scrolls
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                            How many rapid scrolls in a section triggers the "Skimming but Stuck" situation?
                        </p>
                        <Slider
                            value={[thresholds.scrollIntensity]}
                            min={2}
                            max={15}
                            step={1}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, scrollIntensity: v }))}
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-lg"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Situations
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-gray-200"
                        >
                            <RotateCcw className="w-4 h-4 mr-2 text-gray-500" />
                            Defaults
                        </Button>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                        <p className="text-[11px] text-blue-700">
                            Pro-tip: Lower thresholds for more proactive assistance,
                            or higher thresholds if you prefer less frequent notifications.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
            {children}
        </span>
    )
}
