'use client'

import { useState, useEffect } from 'react'
import { Book, Lightbulb, CheckCircle, ThumbsUp, MoreHorizontal, User, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface WikiEntry {
    id: string
    term: string
    definition: string
    source: 'chat' | 'ai-verified' | 'manual'
    verifiedBy: string[] // User IDs
    confidence: number // 0-1
    timestamp: number
    context?: string // Original chat message
}

export interface InsightEntry {
    id: string
    content: string
    authorName: string
    likes: number
    tags: string[]
    timestamp: number
}

interface CollectiveWikiPanelProps {
    entries: WikiEntry[]
    insights: InsightEntry[]
    onVerifyEntry: (entryId: string) => void
    onLikeInsight: (insightId: string) => void
    onClose?: () => void
}

export default function CollectiveWikiPanel({
    entries,
    insights,
    onVerifyEntry,
    onLikeInsight,
    onClose
}: CollectiveWikiPanelProps) {
    const [activeTab, setActiveTab] = useState('definitions')

    return (
        <div className="h-full flex flex-col bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-2xl w-[320px] transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Book className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 leading-none">Collective Memory</h3>
                        <span className="text-[10px] text-slate-500 font-medium">Live Session Knowledge</span>
                    </div>
                </div>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="definitions" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 pt-3 pb-2">
                    <TabsList className="w-full grid grid-cols-2 bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger
                            value="definitions"
                            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg transition-all"
                        >
                            Definitions
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${entries.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/50 text-slate-500'}`}>
                                {entries.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="insights"
                            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-lg transition-all"
                        >
                            Insights
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${insights.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-200/50 text-slate-500'}`}>
                                {insights.length}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="definitions" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full px-3 pb-4">
                        <div className="space-y-3 pt-1">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-6 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Book className="w-6 h-6 opacity-30" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">No definitions yet</p>
                                    <p className="text-xs mt-1 leading-relaxed max-w-[200px]">
                                        Terms defined in chat will appear here automatically.
                                    </p>
                                </div>
                            ) : (
                                entries.map(entry => (
                                    <div key={entry.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h4 className="font-bold text-sm text-slate-800 tracking-tight">{entry.term}</h4>
                                            {entry.source === 'ai-verified' && (
                                                <div className="flex items-center text-[9px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100/50">
                                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                                    VERIFIED
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed mb-3 font-normal">
                                            {entry.definition}
                                        </p>

                                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                                            <div className="flex -space-x-1.5 pl-1.5">
                                                {entry.verifiedBy.map((v, i) => (
                                                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-white flex items-center justify-center text-[9px] font-bold text-indigo-700 shadow-sm ring-1 ring-slate-50" title={`Verified by ${v}`}>
                                                        {v.charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 rounded-full hover:bg-green-50 hover:text-green-600 transition-colors"
                                                onClick={() => onVerifyEntry(entry.id)}
                                                title="Verify this definition"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="insights" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full px-3 pb-4">
                        <div className="space-y-3 pt-1">
                            {insights.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-6 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Lightbulb className="w-6 h-6 opacity-30" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">No insights yet</p>
                                    <p className="text-xs mt-1 leading-relaxed max-w-[200px]">
                                        Share your realizations in chat to capture them here.
                                    </p>
                                </div>
                            ) : (
                                insights.map(insight => (
                                    <div key={insight.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm relative group hover:border-orange-100 transition-all">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700 shadow-sm border border-white ring-1 ring-orange-50">
                                                {insight.authorName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 leading-none">{insight.authorName}</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                    {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative pl-3 mb-3">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 to-transparent rounded-full"></div>
                                            <p className="text-xs text-slate-700 italic leading-relaxed">
                                                "{insight.content}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex gap-1">
                                                {insight.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium border border-slate-200/50">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-7 px-2 rounded-lg gap-1.5 text-[10px] font-medium transition-all ${insight.likes > 0 ? 'text-orange-600 bg-orange-50 border border-orange-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                onClick={() => onLikeInsight(insight.id)}
                                            >
                                                <ThumbsUp className="w-3 h-3" />
                                                {insight.likes > 0 && <span>{insight.likes}</span>}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>

            {/* Footer / Input area could go here */}
        </div>
    )
}
