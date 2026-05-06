// lib/agents/Agent1_UnderstandingDetection.ts
'use client'

import { interactionCollector, type InteractionSession, type SectionInteraction } from '../interactionCollector'
// NOTE: aiCoordinationCore is NOT imported at the top to avoid circular dependency.
// Instead, we use a lazy require inside the fire method.

/**
 * AGENT 1: Understanding Detection (Probabilistic Model v2.0)
 *
 * Uses a continuous probability model instead of binary thresholds.
 * Maintains a live "Struggle Score" (0.0 → 1.0) per section, updated
 * every second, that rises and falls based on weighted behavioral signals.
 *
 * Inspired by: Google's implicit feedback systems (YouTube, Search, Maps)
 * where user state is inferred from a stream of weak signals rather than
 * a single strong trigger.
 *
 * SIGNAL WEIGHTS:
 *  - Dwell time (exceeding expected read time)  +0.05 / second
 *  - Mouse jitter / erratic movement            +0.15 per event
 *  - Scroll regression (reading backwards)      +0.20 per event
 *  - Re-read loop (returning to page)           +0.25 per loop
 *  - Confusion highlight added                  +0.35 (immediate)
 *  - Stuck marker added                         +0.40 (immediate)
 *  - No interaction (frozen)                    +0.08 / second
 *  - Content density boost (math/code sections) +0.10 static
 *  - Scroll past (natural progression)          -0.30 decay
 *  - "Understood" highlight                     -0.25 (immediate)
 *
 * Fire threshold: score > 0.72 → generate notification
 * Cooldown: 90 seconds per section after notification fires
 */

export interface StruggleSignal {
  detected: boolean
  severity: 'low' | 'medium' | 'high'
  confidence: number // 0.0 → 1.0 — the actual probability score
  sectionId: string
  sectionName: string
  text?: string
  contributingFactors: string[] // Human-readable list of what caused this
  indicators: {
    confusionHighlights: number
    stuckMarkers: number
    revisitCount: number
    timeSpent: number
    understandingScore: number
  }
  timestamp: number
}

export interface BreakthroughSignal {
  detected: boolean
  sectionId: string
  sectionName: string
  scoreBefore: number
  scoreAfter: number
  timeToBreakthrough: number
  timestamp: number
}

export interface UnderstandingState {
  currentScore: number
  trend: 'improving' | 'declining' | 'stable'
  recentChanges: Array<{ from: number; to: number; timestamp: number }>
}

export type BehavioralPattern =
  | 'semantic-dwell'
  | 're-read-loop'
  | 'gaze-panic'
  | 'erratic-scan'
  | 'cross-ref-jump'

// Per-section probability state stored in the agent's memory
interface SectionProbabilityState {
  score: number           // 0.0 → 1.0 continuous struggle probability
  lastUpdated: number     // timestamp of last update
  lastNotifiedAt: number  // timestamp of last notification (for cooldown)
  scoreHistory: number[]  // rolling window of last 10 scores for trend
  prevScrollPosition: number
  lastMouseX: number
  lastMouseY: number
  mouseVelocityHistory: number[] // recent mouse speed readings
}

// Global mouse state (updated by the ApryseWebViewer via window events)
interface GlobalMouseState {
  x: number
  y: number
  vx: number  // velocity x
  vy: number  // velocity y
  timestamp: number
  currentSectionId: string
}

class Agent1_UnderstandingDetection {
  private agentId = 'agent-1-understanding-detection'
  private isActive = false
  private monitoringInterval: NodeJS.Timeout | null = null

  // Probabilistic state per section
  private sectionStates: Map<string, SectionProbabilityState> = new Map()

  // Previous understanding scores for breakthrough detection
  private previousUnderstandingScores: Map<string, number> = new Map()

  // Feature 3: Implicit struggle — tracks last time we fired for each section
  // so we don't spam the implicit signal more than once per 5 minutes
  private implicitFiredAt: Map<string, number> = new Map()
  private readonly IMPLICIT_COOLDOWN_MS = 300_000  // 5 minutes
  private readonly IMPLICIT_REVISIT_THRESHOLD = 3
  private readonly IMPLICIT_DWELL_THRESHOLD_MS = 180_000  // 3 minutes

  // Global mouse state received via window events
  private mouseState: GlobalMouseState = {
    x: 0, y: 0, vx: 0, vy: 0,
    timestamp: Date.now(),
    currentSectionId: ''
  }

  // =============================================================================
  // CONFIGURATION — tune these weights to calibrate sensitivity
  // =============================================================================
  private readonly WEIGHTS = {
    dwell_per_second: 0.06,  // Increased from 0.04 to make long reading trigger faster
    mouse_jitter: 0.12,  // added when mouse speed is chaotic
    scroll_regression: 0.20,  // added when user scrolls UP (reading backwards)
    reread_loop: 0.22,  // added per detected page re-visit loop
    confusion_highlight: 0.35,  // added immediately when user highlights as "confused"
    stuck_marker: 0.42,  // added immediately when user drops a stuck marker
    frozen_no_interaction: 0.12,  // Increased from 0.06: added per second of frozen stare
    content_density_boost: 0.08,  // static boost for math/dense sections
    scroll_past_decay: -0.28,  // subtracted when user naturally progresses
    understood_highlight: -0.25,  // subtracted when user marks something understood
  }

  // Score must exceed this to trigger a notification
  private readonly FIRE_THRESHOLD = 0.72

  // Score for low/medium/high classification
  private readonly SEVERITY_THRESHOLDS = {
    medium: 0.72,
    high: 0.88
  }

  // After notifying, how long before we can notify about the same section again (ms)
  private readonly COOLDOWN_MS = 90_000

  // Natural decay rate: score decays by this factor per second when no struggle signals
  private readonly DECAY_RATE = 0.015

  // How long we consider a section "currently active" (ms)
  // ✅ 60s: reading heartbeat updates lastActiveTimestamp every second during reading
  private readonly ACTIVE_RECENCY_MS = 60_000

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  activate() {
    if (this.isActive) return
    this.isActive = true
    console.log('🧠 [Agent 1] Probabilistic Understanding Detection v2.0 activated')
    this.setupMouseSignalListeners()
    this.startMonitoring()
  }

  deactivate() {
    this.isActive = false
    if (this.monitoringInterval) clearInterval(this.monitoringInterval)
    console.log('🧠 [Agent 1] Deactivated')
  }

  getStatus() {
    return {
      agentId: this.agentId,
      name: 'Understanding Detection',
      active: this.isActive,
      type: 'always-monitoring',
      description: 'Probabilistic struggle detection via continuous behavioral signal analysis'
    }
  }

  // =============================================================================
  // MOUSE SIGNAL LISTENERS
  // These receive real-time mouse signals from the viewer for jitter/velocity detection
  // =============================================================================

  private setupMouseSignalListeners() {
    if (typeof window === 'undefined') return

    // Listen for mouse movement data published by ApryseWebViewer
    window.addEventListener('agent1:mouse-signal', ((e: CustomEvent) => {
      const { x, y, sectionId } = e.detail
      const now = Date.now()
      const dt = (now - this.mouseState.timestamp) / 1000  // seconds

      if (dt > 0 && dt < 1) {  // Only update if delta is reasonable
        this.mouseState.vx = (x - this.mouseState.x) / dt
        this.mouseState.vy = (y - this.mouseState.y) / dt
      }

      this.mouseState.x = x
      this.mouseState.y = y
      this.mouseState.timestamp = now
      this.mouseState.currentSectionId = sectionId

      // Feed jitter signal — only if we're on a section we're tracking
      if (sectionId) {
        this.applyMouseJitterSignal(sectionId)
      }
    }) as EventListener)

    // Listen for scroll regression events from the viewer
    window.addEventListener('agent1:scroll-regression', ((e: CustomEvent) => {
      const { sectionId, direction } = e.detail
      if (direction === 'up' && sectionId) {
        this.applySignal(sectionId, this.WEIGHTS.scroll_regression, 'scroll-regression')
      } else if (direction === 'down' && sectionId) {
        // Natural forward progress — decay score
        this.applySignal(sectionId, this.WEIGHTS.scroll_past_decay, 'scroll-forward')
      }
    }) as EventListener)

    // Listen for explicit confusion/understood highlights from annotation system
    window.addEventListener('agent1:highlight-signal', ((e: CustomEvent) => {
      const { sectionId, reason } = e.detail
      if (reason === 'confusion' || reason === 'question') {
        this.applySignal(sectionId, this.WEIGHTS.confusion_highlight, 'confusion-highlight')
      } else if (reason === 'understood') {
        this.applySignal(sectionId, this.WEIGHTS.understood_highlight, 'understood-highlight')
      }
    }) as EventListener)

    // Listen for stuck markers
    window.addEventListener('agent1:stuck-signal', ((e: CustomEvent) => {
      const { sectionId } = e.detail
      this.applySignal(sectionId, this.WEIGHTS.stuck_marker, 'stuck-marker')
    }) as EventListener)
  }

  // =============================================================================
  // CONTINUOUS MONITORING LOOP (runs every 1 second)
  // =============================================================================

  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (!this.isActive) return

      const session = interactionCollector.getCurrentSession()
      if (!session) return

      this.updateAllSectionScores(session)
      this.checkFireConditions(session)
      this.detectBreakthroughsAndEmit(session)
      this.checkImplicitStruggle(session)

    }, 1000) // 1 second tick
  }

  // =============================================================================
  // SCORE UPDATE ENGINE — runs every tick for each active section
  // =============================================================================

  private updateAllSectionScores(session: InteractionSession) {
    const NOW = Date.now()

    session.sectionInteractions.forEach((section, sectionId) => {
      const state = this.getOrCreateState(sectionId)
      const dt = (NOW - state.lastUpdated) / 1000  // seconds since last update

      // --- APPLY NATURAL DECAY first ---
      // Like a "leaky bucket": score naturally falls unless struggle signals keep it up
      state.score = Math.max(0, state.score - this.DECAY_RATE * dt)

      // --- SIGNAL 1: Dwell time vs expected read time ---
      this.applyDwellSignal(state, section, dt)

      // --- SIGNAL 2: Frozen / no interaction ---
      const isCurrentlyActive = (NOW - section.lastActiveTimestamp) < this.ACTIVE_RECENCY_MS
      const timeSincePhysicalInteraction = NOW - session.lastActiveTime

      if (!isCurrentlyActive) {
        // User hasn't interacted with this section recently at all — moving on, decay
      } else if (timeSincePhysicalInteraction > 2500 && timeSincePhysicalInteraction < 120_000) {
        // They are on this section, but haven't moved the mouse/scrolled in 2.5 seconds.
        // They are doing a "hard stare" at the text.
        state.score += this.WEIGHTS.frozen_no_interaction * dt

        // Log frozen score acceleration for debugging
        if (Math.random() < 0.1) console.log(`🧊 [Agent 1] Frozen Stare detected in "${section.sectionName}" — accelerating struggle score.`)
      }

      // --- SIGNAL 3: Content density boost (static) ---
      if (this.isSectionContentDense(section)) {
        state.score += this.WEIGHTS.content_density_boost * 0.1 * dt // spread over time
      }

      // Cap score between 0 and 1
      state.score = Math.min(1.0, Math.max(0.0, state.score))

      // Update history
      state.scoreHistory.push(state.score)
      if (state.scoreHistory.length > 10) state.scoreHistory.shift()

      state.lastUpdated = NOW
    })
  }

  // =============================================================================
  // SIGNAL APPLICATION HELPERS
  // =============================================================================

  private applySignal(sectionId: string, weight: number, reason: string) {
    const state = this.getOrCreateState(sectionId)
    const before = state.score
    state.score = Math.min(1.0, Math.max(0.0, state.score + weight))
    if (Math.abs(state.score - before) > 0.01) {
      console.log(`🧠 [Agent1] [${sectionId.slice(0, 20)}] ${reason}: ${before.toFixed(2)} → ${state.score.toFixed(2)}`)
    }
  }

  private applyDwellSignal(
    state: SectionProbabilityState,
    section: SectionInteraction,
    dt: number
  ) {
    // Lowered baseline EXPECTED_READ_TIME to make the detector more aggressive
    // User expects help simply for reading for a while.
    const EXPECTED_READ_TIME_MS = 15_000 // Was 45_000. Now triggers dwell logic after 15s

    if (section.totalTimeSpent > EXPECTED_READ_TIME_MS) {
      // They've been here longer than expected — add dwell signal
      const excessSeconds = Math.min(dt, 5)  // cap contribution per tick
      state.score += this.WEIGHTS.dwell_per_second * excessSeconds

      // Log dwell score acceleration for debugging
      if (Math.random() < 0.1) console.log(`⏳ [Agent 1] High Dwell Time in "${section.sectionName}" — accelerating struggle score.`)
    }
  }

  private applyMouseJitterSignal(sectionId: string) {
    const speed = Math.sqrt(
      this.mouseState.vx * this.mouseState.vx +
      this.mouseState.vy * this.mouseState.vy
    )

    // Only log jitter if this section is "active" and speed is erratic
    // Threshold: >500 px/s is "jittery" (not smooth reading scroll)
    // But <50 px/s is "frozen" which is a different signal
    if (speed > 500) {
      // Fast erratic movement — apply a small jitter signal
      this.applySignal(sectionId, this.WEIGHTS.mouse_jitter * 0.1, 'mouse-jitter')
    }
  }

  private isSectionContentDense(section: SectionInteraction): boolean {
    // If section name contains math/methodology-related terms, it's likely dense
    const denseSectionKeywords = [
      'method', 'equation', 'algorithm', 'proof', 'theorem', 'formula',
      'derivation', 'analysis', 'model', 'architecture', 'implement'
    ]
    const name = section.sectionName.toLowerCase()
    return denseSectionKeywords.some(kw => name.includes(kw))
  }

  // Also apply from SectionInteraction raw data (confusion highlights, stuck markers)
  // This runs once per tick to sync collector metrics into our probability model
  private syncCollectorSignals(section: SectionInteraction, sectionId: string) {
    const state = this.getOrCreateState(sectionId)
    const prevHighlights = this.previousUnderstandingScores.get(`ch_${sectionId}`) || 0
    const prevStuck = this.previousUnderstandingScores.get(`sm_${sectionId}`) || 0

    // New confusion highlights since last tick
    if (section.confusionHighlights > prevHighlights) {
      const newOnes = section.confusionHighlights - prevHighlights
      state.score = Math.min(1.0, state.score + this.WEIGHTS.confusion_highlight * newOnes)
    }

    // New stuck markers since last tick
    if (section.stuckMarkerCount > prevStuck) {
      const newOnes = section.stuckMarkerCount - prevStuck
      state.score = Math.min(1.0, state.score + this.WEIGHTS.stuck_marker * newOnes)
    }

    this.previousUnderstandingScores.set(`ch_${sectionId}`, section.confusionHighlights)
    this.previousUnderstandingScores.set(`sm_${sectionId}`, section.stuckMarkerCount)
  }

  private applyRereadSignal(session: InteractionSession) {
    // Detect re-read loops: if last 4+ page visits repeat the same 1-2 pages
    const last5 = session.pageVisits.slice(-5)
    if (last5.length < 4) return

    const uniquePages = new Set(last5.map(v => v.page))
    if (uniquePages.size <= 2) {
      // User is bouncing between <= 2 pages — strong re-read loop signal
      // Find which section those pages belong to
      const loopPage = last5[last5.length - 1].page
      const currentSectionId = this.mouseState.currentSectionId ||
        `page-${loopPage}`
      this.applySignal(currentSectionId, this.WEIGHTS.reread_loop, 're-read-loop')
    }
  }

  // =============================================================================
  // FIRE CONDITIONS — check if any section has crossed the threshold
  // =============================================================================

  private checkFireConditions(session: InteractionSession) {
    const NOW = Date.now()

    // Sync collector data first
    session.sectionInteractions.forEach((section, sectionId) => {
      this.syncCollectorSignals(section, sectionId)
    })

    // Apply re-read loop signal globally
    this.applyRereadSignal(session)

    // Check each section's score
    session.sectionInteractions.forEach((section, sectionId) => {
      const state = this.sectionStates.get(sectionId)
      if (!state) return

      // Must be recently active
      const isActive = (NOW - section.lastActiveTimestamp) < this.ACTIVE_RECENCY_MS
      if (!isActive) return

      // Must exceed threshold
      if (state.score < this.FIRE_THRESHOLD) return

      // Must be past cooldown
      if (NOW - state.lastNotifiedAt < this.COOLDOWN_MS) return

      // 🔥 FIRE! Build the signal and emit
      const signal = this.buildStruggleSignal(sectionId, section, state)
      state.lastNotifiedAt = NOW

      // ✅ Persist across page refresh so it doesn't re-fire immediately on reload
      this.savePersistedCooldown(sectionId, NOW)

      // After firing, apply a small score reduction (partial reset)
      // so it doesn't immediately re-fire
      state.score = Math.max(0, state.score - 0.3)

      console.log(
        `🚨 [Agent1] STRUGGLE DETECTED — "${section.sectionName}" | confidence: ${signal.confidence.toFixed(2)} | factors: ${signal.contributingFactors.join(', ')}`
      )

      // 1. Emit struggle-detected (for any direct listeners / visualizers)
      this.emitEvent('struggle-detected', signal)

      // 2. ✅ Bridge to Coordination Core via window event (avoids circular import)
      // aiCoordinationCore listens to 'agent1:route-struggle' and calls Agent 7
      const session = interactionCollector.getCurrentSession()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agent1:route-struggle', {
          detail: {
            ...signal,
            userId: session?.userId,
            userName: session?.userName,
            documentId: session?.documentId,
            text: section.lastFixationText
          }
        }))
      }
    })
  }

  private buildStruggleSignal(
    sectionId: string,
    section: SectionInteraction,
    state: SectionProbabilityState
  ): StruggleSignal {
    const score = state.score
    const severity = score >= this.SEVERITY_THRESHOLDS.high ? 'high'
      : score >= this.SEVERITY_THRESHOLDS.medium ? 'medium'
        : 'low'

    // Determine which factors contributed to this score
    const factors: string[] = []
    if (section.totalTimeSpent > 45_000) factors.push('extended dwell time')
    if (section.confusionHighlights > 0) factors.push(`${section.confusionHighlights} confusion highlight(s)`)
    if (section.stuckMarkerCount > 0) factors.push(`${section.stuckMarkerCount} stuck marker(s)`)
    if (section.visitCount > 2) factors.push(`${section.visitCount} revisits`)
    if (this.isSectionContentDense(section)) factors.push('dense content (math/method)')
    if (state.scoreHistory.length >= 3) {
      const trend = state.scoreHistory.slice(-3).every((s, i, arr) =>
        i === 0 || s >= arr[i - 1]
      )
      if (trend) factors.push('consistently rising struggle score')
    }
    if (factors.length === 0) factors.push('prolonged passive engagement')

    return {
      detected: true,
      severity,
      confidence: Number(score.toFixed(2)),
      sectionId,
      sectionName: section.sectionName,
      text: section.lastFixationText,
      contributingFactors: factors,
      indicators: {
        confusionHighlights: section.confusionHighlights,
        stuckMarkers: section.stuckMarkerCount,
        revisitCount: section.visitCount,
        timeSpent: section.totalTimeSpent,
        understandingScore: section.understandingScore
      },
      timestamp: Date.now()
    }
  }

  // =============================================================================
  // BREAKTHROUGH DETECTION
  // =============================================================================

  private detectBreakthroughsAndEmit(session: InteractionSession) {
    session.sectionInteractions.forEach((section, sectionId) => {
      const prevScore = this.previousUnderstandingScores.get(`understanding_${sectionId}`)
      const currentScore = section.understandingScore

      if (prevScore !== undefined && prevScore < 50 && currentScore > 70) {
        const breakthrough: BreakthroughSignal = {
          detected: true,
          sectionId,
          sectionName: section.sectionName,
          scoreBefore: prevScore,
          scoreAfter: currentScore,
          timeToBreakthrough: Date.now() - section.firstVisitTime,
          timestamp: Date.now()
        }
        this.emitEvent('breakthrough-detected', breakthrough)
      }

      this.previousUnderstandingScores.set(`understanding_${sectionId}`, currentScore)
    })
  }

  // =============================================================================
  // STATE HELPERS
  // =============================================================================

  private readonly COOLDOWN_STORAGE_KEY = 'agent1_cooldowns'

  /** Load persisted cooldown timestamps from sessionStorage */
  private loadPersistedCooldown(sectionId: string): number {
    if (typeof window === 'undefined') return 0
    try {
      const raw = sessionStorage.getItem(this.COOLDOWN_STORAGE_KEY)
      if (!raw) return 0
      const data = JSON.parse(raw) as Record<string, number>
      return data[sectionId] ?? 0
    } catch { return 0 }
  }

  /** Persist cooldown timestamp so it survives page refresh */
  private savePersistedCooldown(sectionId: string, timestamp: number) {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(this.COOLDOWN_STORAGE_KEY)
      const data: Record<string, number> = raw ? JSON.parse(raw) : {}
      data[sectionId] = timestamp
      sessionStorage.setItem(this.COOLDOWN_STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }

  private getOrCreateState(sectionId: string): SectionProbabilityState {
    if (!this.sectionStates.has(sectionId)) {
      // ✅ Restore lastNotifiedAt from sessionStorage so cooldown survives refresh
      const persistedLastNotified = this.loadPersistedCooldown(sectionId)
      this.sectionStates.set(sectionId, {
        score: 0,
        lastUpdated: Date.now(),
        lastNotifiedAt: persistedLastNotified,
        scoreHistory: [],
        prevScrollPosition: 0,
        lastMouseX: 0,
        lastMouseY: 0,
        mouseVelocityHistory: []
      })
    }
    return this.sectionStates.get(sectionId)!
  }

  private emitEvent(eventType: string, data: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`agent1:${eventType}`, { detail: data }))
    }
  }

  // =============================================================================
  // PUBLIC QUERY METHODS
  // =============================================================================

  /** Returns the current struggle probability (0.0 → 1.0) for a section */
  getSectionStruggleProbability(sectionId: string): number {
    return this.sectionStates.get(sectionId)?.score ?? 0
  }

  /** Returns all sections currently above the low-struggle threshold, sorted by score */
  getCurrentStrugglingSections(): StruggleSignal[] {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []
    return this.detectStruggle(session)
  }

  /** Compatibility shim — internally uses probabilistic model */
  detectStruggle(session: InteractionSession): StruggleSignal[] {
    const signals: StruggleSignal[] = []
    const NOW = Date.now()

    session.sectionInteractions.forEach((section, sectionId) => {
      const state = this.sectionStates.get(sectionId)
      if (!state) return
      if (state.score < 0.40) return  // Below low threshold — not struggling
      if (NOW - section.lastActiveTimestamp > this.ACTIVE_RECENCY_MS) return

      signals.push(this.buildStruggleSignal(sectionId, section, state))
    })

    return signals.sort((a, b) => b.confidence - a.confidence)
  }

  getRecentBreakthroughs(): BreakthroughSignal[] {
    return [] // Breakthroughs are emitted as events, not stored
  }

  isUserStruggling(): boolean {
    return Array.from(this.sectionStates.values()).some(s => s.score > this.FIRE_THRESHOLD)
  }

  getUnderstandingState(sectionId?: string): UnderstandingState {
    const session = interactionCollector.getCurrentSession()
    if (!session) return { currentScore: 50, trend: 'stable', recentChanges: [] }

    if (sectionId) {
      const section = session.sectionInteractions.get(sectionId)
      if (!section) return { currentScore: 50, trend: 'stable', recentChanges: [] }
      const state = this.sectionStates.get(sectionId)
      const struggleAsScore = Math.round((1 - (state?.score ?? 0)) * 100)
      return { currentScore: struggleAsScore, trend: this.determineTrend(struggleAsScore), recentChanges: [] }
    }

    const sections = Array.from(session.sectionInteractions.values())
    const avg = sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.understandingScore, 0) / sections.length)
      : 50
    return { currentScore: avg, trend: this.determineTrend(avg), recentChanges: [] }
  }

  private determineTrend(score: number): 'improving' | 'declining' | 'stable' {
    if (score > 70) return 'improving'
    if (score < 40) return 'declining'
    return 'stable'
  }

  getConfusionLoops(): Array<{ sectionId: string; count: number }> {
    const session = interactionCollector.getCurrentSession()
    if (!session) return []
    const loops: Array<{ sectionId: string; count: number }> = []
    session.sectionInteractions.forEach((section, sectionId) => {
      if (section.visitCount >= 3 && section.confusionHighlights > section.understoodHighlights) {
        loops.push({ sectionId, count: section.visitCount })
      }
    })
    return loops.sort((a, b) => b.count - a.count)
  }

  // =============================================================================
  // FEATURE 3: IMPLICIT STRUGGLE DETECTION
  //
  // Detects researchers who are stuck but haven't clicked "I'm stuck".
  // Pattern: visitCount > 3 AND dwellTime > 3min AND no understood-highlight.
  // This is the "7 re-reads in 12 minutes" signal from the design doc.
  //
  // Fires a distinct event 'agent1:implicit-struggle' so the UI can offer help
  // gently — a soft nudge, not the full intervention card.
  // =============================================================================

  private checkImplicitStruggle(session: InteractionSession) {
    const NOW = Date.now()

    session.sectionInteractions.forEach((section, sectionId) => {
      // Skip if already above the explicit fire threshold — A7 handles those
      const state = this.sectionStates.get(sectionId)
      if (state && state.score >= this.FIRE_THRESHOLD) return

      // Skip sections that aren't actively being read
      if (NOW - section.lastActiveTimestamp > this.ACTIVE_RECENCY_MS) return

      // Check implicit struggle pattern
      const revisitsExceeded = section.visitCount >= this.IMPLICIT_REVISIT_THRESHOLD
      const dwellExceeded = section.totalTimeSpent >= this.IMPLICIT_DWELL_THRESHOLD_MS
      const noUnderstoodSignal = section.understoodHighlights === 0

      if (!revisitsExceeded || !dwellExceeded || !noUnderstoodSignal) return

      // Cooldown — don't re-fire within 5 minutes for the same section
      const lastFired = this.implicitFiredAt.get(sectionId) ?? 0
      if (NOW - lastFired < this.IMPLICIT_COOLDOWN_MS) return

      this.implicitFiredAt.set(sectionId, NOW)

      const signal = {
        sectionId,
        visitCount: section.visitCount,
        dwellTimeSeconds: Math.round(section.totalTimeSpent / 1000),
        currentDs: state?.score ?? 0,
        pattern: 'revisit-dwell-no-resolution',
        // Human-readable for the help nudge
        description: `Visited ${section.visitCount}× · ${Math.round(section.totalTimeSpent / 60000)}min on this section · no understood signal`,
      }

      console.log(`🔍 [Agent 1] Implicit struggle detected in ${sectionId}:`, signal)
      this.emitEvent('implicit-struggle', signal)
    })
  }
}

// Export singleton instance
export const agent1_understandingDetection = new Agent1_UnderstandingDetection()
export type { Agent1_UnderstandingDetection }