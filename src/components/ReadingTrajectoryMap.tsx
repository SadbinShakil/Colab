// src/components/ReadingTrajectoryMap.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Loader2, MapPin, Flame, AlertTriangle } from 'lucide-react'

interface PeerPosition {
  userId: string
  userName: string
  sectionId: string
  sectionName: string
  pageNumber?: number
}

interface SectionSnapshot {
  sectionId: string
  sectionName: string
  confusionScore: number    // 0-1: aggregated D_s across readers
  marginaliaCount: number
  peerCount: number
  hasDivergence: boolean
}

interface TrajectoryData {
  sections: SectionSnapshot[]
  peerPositions: PeerPosition[]
}

interface ReadingTrajectoryMapProps {
  documentId: string
  currentUserId: string
  currentSectionId?: string
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// Color for D_s heatmap: green (0) → amber (0.5) → red (1)
function heatmapColor(score: number): string {
  if (score < 0.3) return 'bg-emerald-100 border-emerald-200'
  if (score < 0.6) return 'bg-amber-100 border-amber-200'
  if (score < 0.8) return 'bg-orange-100 border-orange-200'
  return 'bg-red-100 border-red-200'
}

function heatmapText(score: number): string {
  if (score < 0.3) return 'text-emerald-700'
  if (score < 0.6) return 'text-amber-700'
  if (score < 0.8) return 'text-orange-700'
  return 'text-red-700'
}

// Avatar color palette (cycles)
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500',
]

function avatarColor(userId: string, index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export default function ReadingTrajectoryMap({ documentId, currentUserId, currentSectionId }: ReadingTrajectoryMapProps) {
  const [data, setData] = useState<TrajectoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/trajectory-snapshot?documentId=${documentId}`)
      if (!res.ok) throw new Error('Snapshot fetch failed')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Unable to load reading map')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, 5000)
    return () => clearInterval(interval)
  }, [fetchSnapshot])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Loading reading map…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">{error || 'No data available'}</div>
    )
  }

  // Build a map of sectionId → list of peers there
  const peersAtSection = new Map<string, PeerPosition[]>()
  for (const peer of data.peerPositions) {
    if (peer.userId === currentUserId) continue
    const list = peersAtSection.get(peer.sectionId) || []
    list.push(peer)
    peersAtSection.set(peer.sectionId, list)
  }

  // Index peers for color assignment
  const peerColorIndex = new Map<string, number>()
  data.peerPositions
    .filter(p => p.userId !== currentUserId)
    .forEach((p, i) => peerColorIndex.set(p.userId, i))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-xs font-semibold text-slate-700">Reading Trajectory Map</span>
        <span className="ml-auto text-[10px] text-slate-400">Live · 5s</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200 inline-block" /> Low D_s</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200 inline-block" /> Mid</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 inline-block" /> High D_s</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-violet-500" /> Divergence</span>
        <span className="flex items-center gap-1"><Flame className="w-2.5 h-2.5 text-red-500" /> D_s spike</span>
      </div>

      {data.sections.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">No section data yet. Start reading to populate the map.</p>
      )}

      {data.sections.map(section => {
        const peers = peersAtSection.get(section.sectionId) || []
        const isCurrent = section.sectionId === currentSectionId
        const isSpike = section.confusionScore >= 0.72

        return (
          <div
            key={section.sectionId}
            className={[
              'rounded-lg border px-3 py-2 transition-all',
              heatmapColor(section.confusionScore),
              isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              {/* Section name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium truncate ${heatmapText(section.confusionScore)}`}>
                    {section.sectionName}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-indigo-600 text-white rounded px-1 shrink-0">You</span>
                  )}
                  {isSpike && <Flame className="w-3 h-3 text-red-500 shrink-0" />}
                  {section.hasDivergence && <AlertTriangle className="w-3 h-3 text-violet-500 shrink-0" />}
                </div>
                {/* Marginalia dots */}
                {section.marginaliaCount > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: Math.min(section.marginaliaCount, 8) }).map((_, i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-slate-400 inline-block" />
                    ))}
                    {section.marginaliaCount > 8 && (
                      <span className="text-[10px] text-slate-500">+{section.marginaliaCount - 8}</span>
                    )}
                  </div>
                )}
              </div>

              {/* D_s value */}
              {section.confusionScore > 0 && (
                <span className={`text-[10px] font-mono font-semibold ${heatmapText(section.confusionScore)} shrink-0`}>
                  D_s={section.confusionScore.toFixed(2)}
                </span>
              )}

              {/* Peer avatars */}
              {peers.length > 0 && (
                <div className="flex -space-x-1">
                  {peers.slice(0, 4).map(peer => (
                    <div
                      key={peer.userId}
                      title={peer.userName}
                      className={`w-5 h-5 rounded-full ${avatarColor(peer.userId, peerColorIndex.get(peer.userId) ?? 0)} flex items-center justify-center text-[9px] font-bold text-white border border-white`}
                    >
                      {getInitials(peer.userName)}
                    </div>
                  ))}
                  {peers.length > 4 && (
                    <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 border border-white">
                      +{peers.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
