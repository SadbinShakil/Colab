'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StruggleJourney {
    id: string
    userId: string
    userName: string
    sectionId: string
    sectionName: string
    startTime: number
    endTime?: number
    duration?: number
    resolutionMethod?: 'peer-help' | 'figure-reference' | 'external-search' | 'self-resolved' | 'still-struggling'
    resolutionDetails?: string
    behavioralPatterns: string[]
    confusionHighlights: number
    timestamp: number
}

interface JourneyReplayPanelProps {
    isOpen: boolean
    onClose: () => void
    documentId: string
    sectionId: string
    sectionName: string
    userId?: string // If provided, show only this user's journey
    onJumpToResource?: (resource: string) => void
}

export default function JourneyReplayPanel({
    isOpen,
    onClose,
    documentId,
    sectionId,
    sectionName,
    userId,
    onJumpToResource
}: JourneyReplayPanelProps) {
    const [journeys, setJourneys] = useState<StruggleJourney[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedJourney, setSelectedJourney] = useState<StruggleJourney | null>(null)

    useEffect(() => {
        if (isOpen && documentId && sectionId) {
            loadJourneys()
        }
    }, [isOpen, documentId, sectionId, userId])

    const loadJourneys = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                documentId,
                sectionId,
                action: 'journey-replay'
            })

            if (userId) {
                params.append('userId', userId)
            }

            const response = await fetch(`/api/collaborative-insights?${params}`)

            if (response.ok) {
                const data = await response.json()
                if (data.success && data.journey) {
                    setJourneys(data.journey)
                    if (data.journey.length > 0) {
                        setSelectedJourney(data.journey[0])
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load journey replay:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        return `${minutes}m ${seconds}s`
    }

    const getResolutionIcon = (method?: string) => {
        switch (method) {
            case 'peer-help':
                return <User className="w-4 h-4 text-blue-500" />
            case 'figure-reference':
                return <ExternalLink className="w-4 h-4 text-green-500" />
            case 'self-resolved':
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'still-struggling':
                return <AlertCircle className="w-4 h-4 text-orange-500" />
            default:
                return <Clock className="w-4 h-4 text-gray-500" />
        }
    }

    const getResolutionLabel = (method?: string) => {
        switch (method) {
            case 'peer-help':
                return 'Resolved with peer help'
            case 'figure-reference':
                return 'Resolved via figure/section'
            case 'self-resolved':
                return 'Self-resolved'
            case 'external-search':
                return 'External research'
            case 'still-struggling':
                return 'Still struggling'
            default:
                return 'In progress'
        }
    }

    const getPatternLabel = (pattern: string) => {
        const labels: Record<string, string> = {
            'semantic-dwell': '👁️ Extended stare',
            're-read-loop': '🔄 Re-reading',
            'erratic-scan': '⚡ Erratic scrolling',
            'gaze-panic': '😰 Confused gaze',
            'cross-ref-jump': '🔗 Cross-referencing'
        }
        return labels[pattern] || pattern
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">🎬 Journey Replay</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">{sectionName}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : journeys.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No journey data available for this section yet.</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Be the first to complete this section and help future researchers!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Journey List */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {journeys.map((journey) => (
                                    <button
                                        key={journey.id}
                                        onClick={() => setSelectedJourney(journey)}
                                        className={`text-left p-4 rounded-lg border-2 transition-all ${selectedJourney?.id === journey.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium text-sm">{journey.userName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {journey.duration ? formatDuration(journey.duration) : 'In progress'}
                                        </div>
                                        {journey.resolutionMethod && (
                                            <div className="flex items-center gap-2 mt-2">
                                                {getResolutionIcon(journey.resolutionMethod)}
                                                <span className="text-xs">{getResolutionLabel(journey.resolutionMethod)}</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Selected Journey Details */}
                            {selectedJourney && (
                                <div className="border-t pt-6">
                                    <h3 className="font-semibold text-lg mb-4">
                                        {selectedJourney.userName}'s Journey
                                    </h3>

                                    {/* Timeline */}
                                    <div className="space-y-4">
                                        {/* Start */}
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                                <div className="w-0.5 h-full bg-gray-200" />
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <p className="font-medium text-sm">Struggle Detected</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(selectedJourney.startTime).toLocaleString()}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {selectedJourney.behavioralPatterns.map((pattern, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {getPatternLabel(pattern)}
                                                        </Badge>
                                                    ))}
                                                    <Badge variant="outline" className="text-xs">
                                                        {selectedJourney.confusionHighlights} confusion highlights
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        {selectedJourney.duration && (
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                    <div className="w-0.5 h-full bg-gray-200" />
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <p className="font-medium text-sm">Time Spent</p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDuration(selectedJourney.duration)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Resolution */}
                                        {selectedJourney.endTime && (
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {getResolutionLabel(selectedJourney.resolutionMethod)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(selectedJourney.endTime).toLocaleString()}
                                                    </p>
                                                    {selectedJourney.resolutionDetails && (
                                                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                            <p className="text-sm text-green-800">
                                                                💡 {selectedJourney.resolutionDetails}
                                                            </p>
                                                            {/* Extract and show helpful resources */}
                                                            {selectedJourney.resolutionDetails.match(/Figure \d+|Section \d+(\.\d+)?/gi)?.map((resource, idx) => (
                                                                <Button
                                                                    key={idx}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="mt-2 mr-2"
                                                                    onClick={() => onJumpToResource?.(resource)}
                                                                >
                                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                                    Jump to {resource}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
