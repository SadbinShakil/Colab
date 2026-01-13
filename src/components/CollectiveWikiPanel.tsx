'use client'

import { useState, useEffect } from 'react'
import { Book, Lightbulb, CheckCircle, ThumbsUp, MoreHorizontal, User, Sparkles } from 'lucide-react'
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
}

export default function CollectiveWikiPanel({
    entries,
    insights,
    onVerifyEntry,
    onLikeInsight
}: CollectiveWikiPanelProps) {
    const [activeTab, setActiveTab] = useState('definitions')

    return (
        <Card className="h-full border-l rounded-none shadow-none bg-slate-50/50 w-80 flex flex-col">
            <CardHeader className="p-4 border-b bg-white">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-800">
                    <Book className="w-4 h-4 text-indigo-600" />
                    Collective Memory
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-indigo-50 text-indigo-700">
                        Live
                    </Badge>
                </CardTitle>
            </CardHeader>

            <Tabs defaultValue="definitions" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-2">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="definitions" className="text-xs">
                            Definitions
                            <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center bg-slate-200 text-slate-700 hover:bg-slate-300">
                                {entries.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="text-xs">
                            Insights
                            <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center bg-slate-200 text-slate-700 hover:bg-slate-300">
                                {insights.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="definitions" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-3">
                            {entries.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Book className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">No definitions yet.</p>
                                    <p className="text-[10px] mt-1">Chat with peers to generate wiki entries.</p>
                                </div>
                            ) : (
                                entries.map(entry => (
                                    <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-semibold text-sm text-slate-900">{entry.term}</h4>
                                            {entry.source === 'ai-verified' && (
                                                <div className="flex items-center text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI Verified
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                            {entry.definition}
                                        </p>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <div className="flex -space-x-1.5">
                                                {entry.verifiedBy.slice(0, 3).map((v, i) => (
                                                    <div key={i} className="w-5 h-5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-700">
                                                        {v.slice(0, 1).toUpperCase()}
                                                    </div>
                                                ))}
                                                {entry.verifiedBy.length > 0 && (
                                                    <span className="text-[10px] text-slate-400 pl-2 self-center">
                                                        verified
                                                    </span>
                                                )}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                                                onClick={() => onVerifyEntry(entry.id)}
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="insights" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-3">
                            {insights.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">No insights yet.</p>
                                    <p className="text-[10px] mt-1">Start discussing to capture insights.</p>
                                </div>
                            ) : (
                                insights.map(insight => (
                                    <div key={insight.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                                                {insight.authorName.charAt(0)}
                                            </div>
                                            <span className="text-xs font-medium text-slate-700">{insight.authorName}</span>
                                            <span className="text-[10px] text-slate-400 ml-auto">
                                                {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-800 italic border-l-2 border-orange-200 pl-2 py-1 mb-2">
                                            "{insight.content}"
                                        </p>

                                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                            {insight.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-slate-500">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-6 gap-1 text-[10px] ${insight.likes > 0 ? 'text-orange-600 bg-orange-50' : 'text-slate-400'}`}
                                                onClick={() => onLikeInsight(insight.id)}
                                            >
                                                <ThumbsUp className="w-3 h-3" />
                                                {insight.likes > 0 && insight.likes}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
