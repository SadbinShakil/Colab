'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Eye, Target, Crosshair } from 'lucide-react'

interface CalibrationPoint {
  x: string
  y: string
  label: string
}

const calibrationPoints: CalibrationPoint[] = [
  { x: '10%', y: '10%', label: 'Top Left' },
  { x: '50%', y: '10%', label: 'Top Center' },
  { x: '90%', y: '10%', label: 'Top Right' },
  { x: '10%', y: '50%', label: 'Middle Left' },
  { x: '50%', y: '50%', label: 'Center' },
  { x: '90%', y: '50%', label: 'Middle Right' },
  { x: '10%', y: '90%', label: 'Bottom Left' },
  { x: '50%', y: '90%', label: 'Bottom Center' },
  { x: '90%', y: '90%', label: 'Bottom Right' },
]

interface EyeTrackingCalibrationProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  webgazer?: any  // ✅ ADD: Pass WebGazer instance
}

export default function EyeTrackingCalibration({
  isOpen,
  onClose,
  onComplete,
  webgazer  // ✅ ADD: Receive WebGazer instance
}: EyeTrackingCalibrationProps) {
  const [currentPoint, setCurrentPoint] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [clickCount, setClickCount] = useState(0)  // ✅ ADD: Track clicks per point
  const [isValidating, setIsValidating] = useState(false)
  const clicksNeeded = 5  // ✅ ADD: Multiple clicks per point for better accuracy

  if (!isOpen) return null

  const handleStartCalibration = () => {
    setIsCalibrating(true)
    setCurrentPoint(0)
    setClickCount(0)
    
    // ✅ ADD: Clear previous calibration data
    if (webgazer) {
      webgazer.clearData()
      console.log('🧹 Cleared previous calibration data')
    }
  }

  const handlePointClick = async (event: React.MouseEvent) => {
    if (!webgazer) {
      console.warn('⚠️ WebGazer not available')
      return
    }
    
    // Get the actual screen coordinates of the click
    const x = event.clientX
    const y = event.clientY
    
    // ✅ CRITICAL: Tell WebGazer to record this point
    webgazer.recordScreenPosition(x, y, 'click')
    
    console.log(`📍 Calibration click ${clickCount + 1}/${clicksNeeded} at (${x}, ${y}) for point "${calibrationPoints[currentPoint].label}"`)
    
    // Increment click count
    const newClickCount = clickCount + 1
    setClickCount(newClickCount)
    
    // Move to next point after enough clicks
    if (newClickCount >= clicksNeeded) {
      if (currentPoint < calibrationPoints.length - 1) {
        // Move to next calibration point
        setCurrentPoint(currentPoint + 1)
        setClickCount(0)
        console.log(`✅ Point "${calibrationPoints[currentPoint].label}" complete, moving to next`)
      } else {
        // All points done
        setIsValidating(true)
        
        // Give WebGazer a moment to process final calibration
        setTimeout(() => {
          console.log('✅ ALL CALIBRATION POINTS COMPLETE!')
          onComplete()
          onClose()
        }, 500)
      }
    }
  }

  const currentCalibrationPoint = calibrationPoints[currentPoint]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center z-[9999]">
      {!isCalibrating ? (
        // Intro Screen - MODERN DESIGN
        <div className="max-w-2xl w-full mx-4">
          <Card className="bg-white/95 backdrop-blur-xl shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-8">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">Eye Tracking Setup</h2>
                  <p className="text-blue-100">Calibrate your gaze for accurate tracking</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8 space-y-6">
              {/* Main Description */}
              <div className="text-center">
              <p className="text-gray-600 text-lg">
                  We'll guide you through a quick <span className="font-semibold text-gray-900">9-point calibration</span>.
                  You'll click each point <span className="font-semibold text-gray-900">5 times</span> for accuracy.
                </p>
              </div>

              {/* Instructions Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Position</h4>
                      <p className="text-sm text-gray-600">Sit 50-70cm from screen</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Stay Still</h4>
                      <p className="text-sm text-gray-600">Keep your head steady</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Look Then Click</h4>
                      <p className="text-sm text-gray-600">Look at target, then click it 5 times</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Look Directly</h4>
                      <p className="text-sm text-gray-600">Gaze at each target</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Estimate */}
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">⏱️ Takes about 60 seconds</span> · 
                  You can recalibrate anytime
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  className="flex-1 h-12 text-base font-medium bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                >
                  Maybe Later
                </Button>
                <Button 
                  onClick={handleStartCalibration} 
                  className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Start Calibration →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Calibration Screen - MODERN DESIGN
        <div className="w-full h-full relative">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

{/* Progress Bar */}
<div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-8 py-4 shadow-2xl border border-white/20">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Point</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {currentPoint + 1} / {calibrationPoints.length}
                  </p>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Clicks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {clickCount} / {clicksNeeded}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Point */}
          <button
            onClick={handlePointClick}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 focus:outline-none group"
            style={{
              left: currentCalibrationPoint.x,
              top: currentCalibrationPoint.y
            }}
          >
            <div className="relative">
              {/* Outer pulse rings */}
              <div className="absolute inset-0 w-24 h-24 -left-4 -top-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 animate-ping"></div>
              <div className="absolute inset-0 w-20 h-20 -left-2 -top-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-40 animate-pulse"></div>
              
              {/* Main target */}
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform border-4 border-white/50">
                <Crosshair className="w-8 h-8 text-white animate-pulse" />
              </div>

              {/* Point label */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-white font-medium text-sm bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  {currentCalibrationPoint.label}
                </span>
              </div>
            </div>
          </button>

{/* Instruction */}
<div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-8 py-4 shadow-2xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                <p className="text-gray-800 font-semibold text-lg">
                  {isValidating 
                    ? 'Processing calibration...' 
                    : `Look at the target, then click it (${clicksNeeded - clickCount} more ${clicksNeeded - clickCount === 1 ? 'click' : 'clicks'})`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Skip button */}
          <Button
            onClick={() => {
              onComplete()
              onClose()
            }}
            className="absolute top-8 right-8 bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg z-50 px-6 py-2 font-medium backdrop-blur-xl"
          >
            Skip →
          </Button>
        </div>
      )}
    </div>
  )
}