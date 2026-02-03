// lib/eyeTracking.ts
'use client'

export interface GazePoint {
  x: number
  y: number
  timestamp: number
  page: number
  documentId: string
}

class EyeTrackingService {
  private gazePoints: GazePoint[] = []
  private isTracking = false
  private currentPage = 1
  private currentDocumentId = ''
  private calibrated = false
  private webgazer: any = null
  private lastLoggedText = ''
  private lastLogTime = 0

  // Fixation detection
  private fixationStartTime = 0
  private lastFixationPos = { x: 0, y: 0 }
  private fixationThresholdTime = 2000 // 2 seconds
  private fixationRadius = 50 // 50 pixels
  private onFixationCallback: ((text: string, x: number, y: number, page: number) => void) | null = null

  // ✅ ADD: Get WebGazer instance for calibration component
  getWebGazerInstance() {
    return this.webgazer
  }

  // ✅ ADD: Set fixation callback
  setFixationListener(callback: (text: string, x: number, y: number, page: number) => void) {
    this.onFixationCallback = callback
  }

  async initialize() {
    // Only run in browser
    if (typeof window === 'undefined') {
      return false
    }

    try {
      console.log('🎯 Initializing WebGazer...')

      // Dynamic import - only loads in browser
      const webgazerModule = await import('webgazer')
      this.webgazer = webgazerModule.default

      // Initialize WebGazer
      await this.webgazer
        .setRegression('ridge')
        .setTracker('TFFacemesh')
        .begin()

      // Hide the default video preview
      this.webgazer.showVideoPreview(false)
      this.webgazer.showPredictionPoints(true) // Show red dot for debugging

      console.log('✅ WebGazer initialized')
      return true
    } catch (error) {
      console.error('❌ WebGazer initialization failed:', error)
      return false
    }
  }

  startCalibration() {
    if (!this.webgazer) return false

    console.log('🎯 Starting calibration...')
    this.webgazer.showPredictionPoints(true)

    // ✅ ADD: Clear existing calibration data for fresh start
    this.webgazer.clearData()

    return true
  }

  finishCalibration() {
    if (!this.webgazer) return false

    console.log('✅ Calibration complete')
    this.calibrated = true

    // ✅ CHANGE: Keep prediction points visible for a bit to verify accuracy
    setTimeout(() => {
      if (this.webgazer) {
        this.webgazer.showPredictionPoints(false)
      }
    }, 3000)

    return true
  }

  startTracking(documentId: string, page: number) {
    if (!this.webgazer || !this.calibrated) {
      console.warn('⚠️ Eye tracking not calibrated yet')
      return
    }

    this.currentDocumentId = documentId
    this.currentPage = page
    this.isTracking = true

    console.log('👁️ Eye tracking started')

    this.webgazer.setGazeListener((data: any, timestamp: number) => {
      if (data && this.isTracking) {
        const gazePoint: GazePoint = {
          x: data.x,
          y: data.y,
          timestamp,
          page: this.currentPage,
          documentId: this.currentDocumentId
        }

        this.gazePoints.push(gazePoint)

        // Keep only last 1000 points to avoid memory issues
        if (this.gazePoints.length > 1000) {
          this.gazePoints.shift()
        }

        // --- Fixation Detection Logic ---
        const dist = Math.sqrt(
          Math.pow(data.x - this.lastFixationPos.x, 2) + Math.pow(data.y - this.lastFixationPos.y, 2)
        )

        if (dist < this.fixationRadius) {
          // Still in same area
          if (this.fixationStartTime === 0) {
            this.fixationStartTime = timestamp
          } else if (timestamp - this.fixationStartTime > this.fixationThresholdTime) {
            // Fixation detected!
            // Only trigger if we haven't triggered recently (debounce)
            const now = Date.now()
            if (now - this.lastLogTime > 3000) { // Reuse log timer for debounce
              console.log('👁️ FIXATION DETECTED!')
              this.extractTextAtGazePoint(data.x, data.y, true) // Pass true to trigger callback
            }
          }
        } else {
          // Moved outside radius - reset
          this.lastFixationPos = { x: data.x, y: data.y }
          this.fixationStartTime = 0
        }

        // Extract text at gaze point (every 10th point to avoid spam - kept for logging)
        if (this.gazePoints.length % 20 === 0) {
          this.extractTextAtGazePoint(data.x, data.y, false)
        }
      }
    })
  }


  // ✅ ADD: External text extractor support
  private textExtractor: ((x: number, y: number) => Promise<string | null>) | null = null

  setTextExtractor(extractor: (x: number, y: number) => Promise<string | null>) {
    this.textExtractor = extractor
  }

  private async extractTextAtGazePoint(x: number, y: number, isFixation = false) {
    try {
      const now = Date.now()

      // If regular logging (not fixation), check debounce
      if (!isFixation && now - this.lastLogTime < 2000) {
        return
      }

      let text = '';

      // 1. Try External Extractor (PDF Viewer Integration)
      if (this.textExtractor) {
        try {
          const extracted = await this.textExtractor(x, y)
          if (extracted) {
            text = extracted
          }
        } catch (err) {
          console.warn('External text extraction failed', err)
        }
      }

      // 2. Fallback to DOM (if external failed or returns empty)
      if (!text) {
        const element = document.elementFromPoint(x, y)
        if (element) {
          // 🚫 IGNORE UI NOISE: Toasts, Popups, Overlays
          const isNoise = element.closest && (
            element.closest('[role="status"]') ||
            element.closest('[role="alert"]') ||
            element.closest('.toast') ||
            element.closest('.sonner-toast')
          )

          if (!isNoise) {
            text = element.textContent?.trim() || ''

            if (text.length > 200) {
              const range = document.caretRangeFromPoint(x, y)
              if (range) {
                const textNode = range.startContainer
                text = textNode.textContent?.trim() || text
              }
            }
          }
        }
      }

      if (text) {
        // Handle Fixation Event
        if (isFixation && this.onFixationCallback && text.length > 3) {
          console.log('👁️ Fixation Triggered on:', text.substring(0, 50))
          this.onFixationCallback(text, x, y, this.currentPage)
          this.lastLogTime = now + 2000 // Prevent immediate re-trigger
          return
        }

        // Only log if text is meaningful and different from last
        if (text.length > 5 && text !== this.lastLoggedText) {
          console.log(`👁️ Looking at: ${text}`)

          this.lastLoggedText = text
          this.lastLogTime = now
        }
      }
    } catch (error) {
      console.error('Error in extractTextAtGazePoint', error)
    }
  }

  stopTracking() {
    this.isTracking = false
    console.log('🛑 Eye tracking stopped')
  }

  updatePage(page: number) {
    this.currentPage = page
  }

  getGazePoints(page?: number): GazePoint[] {
    if (page !== undefined) {
      return this.gazePoints.filter(p => p.page === page)
    }
    return this.gazePoints
  }

  getHeatmapData(page: number, width: number, height: number) {
    const pageGazePoints = this.getGazePoints(page)

    // Create heatmap grid (20x20)
    const gridSize = 20
    const cellWidth = width / gridSize
    const cellHeight = height / gridSize
    const heatmap: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0))

    // Count gaze points in each cell
    pageGazePoints.forEach(point => {
      const cellX = Math.floor(point.x / cellWidth)
      const cellY = Math.floor(point.y / cellHeight)

      if (cellX >= 0 && cellX < gridSize && cellY >= 0 && cellY < gridSize) {
        heatmap[cellY][cellX]++
      }
    })

    return heatmap
  }

  pause() {
    if (!this.webgazer) return
    this.webgazer.pause()
    this.isTracking = false
  }

  resume() {
    if (!this.webgazer || !this.calibrated) return

    this.webgazer.resume()
    this.isTracking = true
  }

  end() {
    if (!this.webgazer) return

    this.webgazer.end()
    this.isTracking = false
    this.calibrated = false
    this.gazePoints = []
  }
}

export const eyeTracker = new EyeTrackingService()