'use client'

/**
 * PDFMinimap
 *
 * A custom scrollbar overlay rendered on the right edge of the PDF viewer.
 * Shows two layers of collaborative signal:
 *
 * 1. PEER POSITION DOTS — colored dot per collaborator at their current page.
 *    Color matches their identity color assigned by the server.
 *
 * 2. CONFUSION HEATMAP — aggregated D_s signals across all peers per page.
 *    Color encodes intensity: low → transparent, high → amber/red.
 *    Only shows for pages where D_s >= tau_fire (0.72) across ≥1 peer.
 *    Grounded in the CoRead signal model (implicit weights: reread, scroll regression, dwell).
 *
 * Clicking anywhere on the minimap scrolls to that page.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react'

export interface PeerPosition {
  userId: string
  userName: string
  color: string       // identity color from server (USER_IDENTITY_COLORS)
  page: number
  currentSectionName?: string  // section the peer is currently in, for ribbon tooltip
}

export interface PageDsSignal {
  page: number
  ds: number          // 0–1 aggregated D_s for this page across all peers
  peerCount: number   // how many peers contributed this signal
}

interface PDFMinimapProps {
  numPages: number
  currentPage: number
  peers: PeerPosition[]
  pageDs: Map<number, PageDsSignal>   // page → aggregated signal
  onNavigate: (page: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>   // the scrollable PDF container
}

// tau_fire from the CoRead signal model — below this, no heatmap shown
const TAU_FIRE = 0.72

// Map D_s 0.72–1.0 → amber/red opacity
function dsToStyle(ds: number, peerCount: number): { background: string; opacity: number } {
  const normalized = Math.min((ds - TAU_FIRE) / (1 - TAU_FIRE), 1) // 0–1 within firing range
  // Multi-peer signal is stronger (social proof)
  const boost = Math.min(peerCount * 0.3, 0.6)
  const opacity = Math.min(0.15 + normalized * 0.5 + boost, 0.85)
  // Low: amber. High: rose-red.
  const r = Math.round(245 + (239 - 245) * normalized)
  const g = Math.round(158 + (68 - 158) * normalized)
  const b = Math.round(11 + (68 - 11) * normalized)
  return { background: `rgb(${r},${g},${b})`, opacity }
}

export default function PDFMinimap({
  numPages,
  currentPage,
  peers,
  pageDs,
  onNavigate,
  containerRef,
}: PDFMinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null)
  const [viewportFraction, setViewportFraction] = useState({ top: 0, height: 0.2 })

  // Track the scroll viewport indicator
  useEffect(() => {
    const container = containerRef.current
    if (!container || numPages === 0) return

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const top = scrollTop / scrollHeight
      const height = clientHeight / scrollHeight
      setViewportFraction({ top, height })
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    return () => container.removeEventListener('scroll', update)
  }, [containerRef, numPages])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || numPages === 0) return
    const rect = minimapRef.current.getBoundingClientRect()
    const fraction = (e.clientY - rect.top) / rect.height
    const page = Math.max(1, Math.min(numPages, Math.round(fraction * numPages)))
    onNavigate(page)
  }, [numPages, onNavigate])

  if (numPages === 0) return null

  return (
    <div
      ref={minimapRef}
      onClick={handleClick}
      className="absolute right-0 top-0 bottom-0 w-5 cursor-pointer select-none z-20 flex flex-col"
      title="Click to navigate · Amber = readers struggling here"
      style={{ background: 'rgba(248,250,252,0.92)', borderLeft: '1px solid #e2e8f0' }}
    >
      {/* Confusion heatmap bands */}
      {Array.from(pageDs.entries())
        .filter(([, sig]) => sig.ds >= TAU_FIRE)
        .map(([page, sig]) => {
          const topPct = ((page - 1) / numPages) * 100
          const heightPct = (1 / numPages) * 100
          const style = dsToStyle(sig.ds, sig.peerCount)
          return (
            <div
              key={`ds-${page}`}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                background: style.background,
                opacity: style.opacity,
                borderRadius: '1px',
              }}
              title={`p.${page}: D_s=${sig.ds.toFixed(2)} across ${sig.peerCount} reader${sig.peerCount !== 1 ? 's' : ''}`}
            />
          )
        })}

      {/* Viewport indicator */}
      <div
        className="absolute left-0 right-0 pointer-events-none rounded-sm"
        style={{
          top: `${viewportFraction.top * 100}%`,
          height: `${viewportFraction.height * 100}%`,
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      />

      {/* Current page tick */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `${((currentPage - 0.5) / numPages) * 100}%`,
          height: '2px',
          background: '#6366f1',
          opacity: 0.8,
        }}
      />

      {/* Peer position dots */}
      {peers.map((peer) => {
        const topPct = ((peer.page - 0.5) / numPages) * 100
        return (
          <div
            key={peer.userId}
            className="absolute right-0.5 pointer-events-none flex items-center justify-end"
            style={{ top: `${topPct}%`, transform: 'translateY(-50%)' }}
            title={`${peer.userName} · p.${peer.page}`}
          >
            <div
              className="w-2 h-2 rounded-full ring-1 ring-white shadow-sm"
              style={{ background: peer.color }}
            />
          </div>
        )
      })}

      {/* Page number tooltip on hover (CSS-only, shown via title attr) */}
    </div>
  )
}
