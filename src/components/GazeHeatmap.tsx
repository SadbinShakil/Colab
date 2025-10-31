'use client'

import { useEffect, useState } from 'react'
import { eyeTracker } from '@/lib/eyeTracking'

interface GazeHeatmapProps {
  page: number
  enabled: boolean
}

export default function GazeHeatmap({ page, enabled }: GazeHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<number[][]>([])

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const heatmap = eyeTracker.getHeatmapData(page, window.innerWidth, window.innerHeight)
      setHeatmapData(heatmap)
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [page, enabled])

  if (!enabled || heatmapData.length === 0) return null

  const gridSize = heatmapData.length
  const cellWidth = 100 / gridSize
  const cellHeight = 100 / gridSize

  // Find max value for color scaling
  const maxValue = Math.max(...heatmapData.flat())

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="relative w-full h-full">
        {heatmapData.map((row, y) =>
          row.map((value, x) => {
            if (value === 0) return null
            
            const intensity = value / maxValue
            const opacity = 0.2 + (intensity * 0.6)
            
            return (
              <div
                key={`${x}-${y}`}
                className="absolute"
                style={{
                  left: `${x * cellWidth}%`,
                  top: `${y * cellHeight}%`,
                  width: `${cellWidth}%`,
                  height: `${cellHeight}%`,
                  backgroundColor: `rgba(255, ${255 - intensity * 200}, 0, ${opacity})`,
                  transition: 'background-color 0.3s ease'
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}