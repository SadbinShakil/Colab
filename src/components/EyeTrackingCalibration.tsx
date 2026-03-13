'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Check, X, MousePointer2, ScanFace, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const calibrationPoints = [
  { x: '15%', y: '15%' }, { x: '50%', y: '15%' }, { x: '85%', y: '15%' },
  { x: '15%', y: '50%' }, { x: '50%', y: '50%' }, { x: '85%', y: '50%' },
  { x: '15%', y: '85%' }, { x: '50%', y: '85%' }, { x: '85%', y: '85%' },
]

interface EyeTrackingCalibrationProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  webgazer?: any
}

export default function EyeTrackingCalibration({
  isOpen,
  onClose,
  onComplete,
  webgazer
}: EyeTrackingCalibrationProps) {
  const [pointIndex, setPointIndex] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)

  const CLICKS_NEEDED = 5

  useEffect(() => {
    if (isOpen) {
      setPointIndex(0)
      setClickCount(0)
      setIsCalibrating(false)
      setIsSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleStart = () => {
    if (webgazer) webgazer.clearData()
    setIsCalibrating(true)
  }

  const handlePointClick = (e: React.MouseEvent) => {
    if (webgazer) webgazer.recordScreenPosition(e.clientX, e.clientY, 'click')

    // Animate click
    const nextCount = clickCount + 1

    if (nextCount >= CLICKS_NEEDED) {
      if (pointIndex < calibrationPoints.length - 1) {
        // Smooth transition
        setTimeout(() => {
          setPointIndex(prev => prev + 1)
          setClickCount(0)
        }, 150)
      } else {
        // Success
        setIsSuccess(true)
        setTimeout(() => {
          onComplete()
          onClose()
        }, 2000)
      }
    } else {
      setClickCount(nextCount)
    }
  }

  const currentPoint = calibrationPoints[pointIndex]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] font-sans overflow-hidden flex items-center justify-center cursor-default"
        >
          {/* === 1. LIGHT MODE DEPTH BACKGROUND === */}
          {/* This ensures readability. We use a light base with vibrant blurs. */}
          <div className="absolute inset-0 bg-slate-50">

            {/* Animated Mesh Gradients - Vibrant Colors on Light */}
            <motion.div
              animate={{
                x: [-50, 50, -50],
                y: [-20, 20, -20],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-300/40 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                x: [50, -50, 50],
                y: [20, -20, 20],
                scale: [1.1, 1, 1.1],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-purple-300/40 rounded-full blur-[100px]"
            />

            {/* Fine Grid Pattern Overlay for Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>


          {!isCalibrating ? (
            // === STEP 1: FLOAT GLASS CARD (Intro) ===
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
              className="relative z-10 w-full max-w-[500px] p-6"
            >
              {/* The Glass Container - High Visibility */}
              <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] text-center relative overflow-hidden ring-1 ring-white/80">

                {/* White Glint Top */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent opacity-80 pointer-events-none" />

                {/* Hero Icon: 3D Eye */}
                <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                  <div className="relative w-20 h-20 bg-white rounded-[2rem] border border-blue-50 shadow-xl flex items-center justify-center transform rotate-3">
                    <ScanFace className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
                  </div>
                  {/* Decorative Element */}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center border border-white shadow-sm">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                  Sync your vision
                </h1>

                <p className="text-lg text-slate-500 mb-8 leading-relaxed font-medium">
                  We'll calibrate the eye tracker to your unique gaze patterns.
                </p>

                {/* Feature Pills - High Contrast */}
                <div className="flex justify-center gap-3 mb-8">
                  <div className="bg-white border border-slate-100 px-4 py-2 rounded-full flex items-center gap-2 text-slate-600 text-sm font-bold shadow-sm">
                    <MousePointer2 size={14} className="text-blue-500" /> Follow the orb
                  </div>
                  <div className="bg-white border border-slate-100 px-4 py-2 rounded-full flex items-center gap-2 text-slate-600 text-sm font-bold shadow-sm">
                    <Check size={14} className="text-green-500" /> 5 clicks/point
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleStart}
                    className="h-14 w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Start Calibration <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>

                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors py-2 cursor-pointer"
                  >
                    Skip Setup
                  </button>
                </div>
              </div>
            </motion.div>
          ) : !isSuccess ? (
            // === STEP 2: IMMERSIVE CALIBRATION ===
            <div className="absolute inset-0 z-20 cursor-crosshair">
              {/* Added cursor-crosshair for precision */}

              {/* Minimal HUD - Glass Pill */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none"
              >
                <div className="bg-white/80 backdrop-blur-xl border border-white/50 px-6 py-2.5 rounded-full flex items-center gap-4 shadow-sm ring-1 ring-black/5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calibration</span>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{pointIndex + 1} / 9</span>
                  </div>
                </div>
              </motion.div>

              {/* THE TARGET: GLOSSY 3D ORB (High Viz) */}
              <motion.button
                layoutId="calibration-orb"
                onClick={handlePointClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute w-32 h-32 -ml-16 -mt-16 flex items-center justify-center focus:outline-none cursor-crosshair z-50 rounded-full group outline-none ring-0 border-none"
                style={{ left: currentPoint.x, top: currentPoint.y }}
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
              >
                {/* Outer Glow Ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.4 }}
                  transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                  className="absolute inset-0 bg-blue-400 rounded-full blur-xl"
                />

                {/* 3D Sphere Container */}
                <motion.div
                  className="relative w-14 h-14 rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.3),inset_0_-4px_8px_rgba(0,0,0,0.2),inset_0_4px_8px_rgba(255,255,255,0.9)] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden border border-white/20"
                >
                  {/* Specular Highlight (Gloss) */}
                  <div className="absolute top-1 left-2 w-6 h-3 bg-white/60 rounded-[100%] blur-[1px] rotate-[-15deg]" />

                  {/* Inner Pupil */}
                  <div className="w-3 h-3 bg-white rounded-full shadow-sm z-10" />

                </motion.div>

                {/* Progress Ring */}
                {/* Use a contrasting color for visibility against light bg */}
                <svg className="absolute w-20 h-20 -rotate-90 pointer-events-none">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
                  <motion.circle
                    cx="40" cy="40" r="36"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0px 2px 4px rgba(37,99,235,0.2))" }}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: clickCount / CLICKS_NEEDED }}
                    transition={{ duration: 0.2 }}
                  />
                </svg>

              </motion.button>

              <button
                onClick={onClose}
                className="absolute top-8 right-8 p-3 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-slate-100 transition-all backdrop-blur-md z-[60] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

            </div>
          ) : (
            // === STEP 3: SUCCESS ===
            <motion.div
              className="relative z-10 flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl ring-1 ring-white/50"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Check className="w-12 h-12 text-green-600" strokeWidth={4} />
                </motion.div>
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Synced.</h2>
              <p className="text-lg text-slate-500 font-medium">Eye tracking is ready.</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}