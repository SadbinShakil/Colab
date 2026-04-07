/**
 * sessionLogger.ts
 *
 * Writes CoRead evaluation data to Firebase Realtime Database (v8 SDK).
 * Implements the data model from CLAUDE.md:
 *
 *   sessions/{sessionId}/
 *     participants/{userId}/dsHistory[]
 *     interventions/{interventionId}/
 *     artifacts/sessionLog/{userId}
 *
 * Always call from client-side code (agents, hooks).
 * Designed to fail silently — never block reading if Firebase is offline.
 */

import firebase from 'firebase/app'
import 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCHDrzdTuWebpl2tsNZR_eorIsmhK4YIvw',
  authDomain: 'thesis-webviewer-collab.firebaseapp.com',
  databaseURL: 'https://thesis-webviewer-collab-default-rtdb.firebaseio.com',
  projectId: 'thesis-webviewer-collab',
  storageBucket: 'thesis-webviewer-collab.firebasestorage.app',
  messagingSenderId: '233993540501',
  appId: '1:233993540501:web:7e092a284a0ba56cb59c9c',
}

// Re-use the existing app if already initialised (firebaseClient.js may initialise first)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const db = firebase.database()

// ---------------------------------------------------------------------------
// Types matching the CLAUDE.md data model
// ---------------------------------------------------------------------------

export type InterventionType =
  | 'notification'
  | 'peer_routing'
  | 'group_study'
  | 'silence'
  | 'grounding_failure'

export type InterventionOutcome =
  | 'accepted'
  | 'dismissed'
  | 'resolved'
  | 'abstained'

export interface InterventionEvent {
  agentId: 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10'
  type: InterventionType
  userId: string
  sectionId: string
  dsAtTrigger: number
  outcome?: InterventionOutcome
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface DsDataPoint {
  timestamp: number
  value: number
  sectionId: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log an intervention event to Firebase.
 * Called by every agent activation — required for evaluation data.
 */
export async function logIntervention(
  sessionId: string,
  event: InterventionEvent
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const ref = db.ref(`sessions/${sessionId}/interventions`)
    await ref.push({
      ...event,
      serverTimestamp: firebase.database.ServerValue.TIMESTAMP,
    })
    console.log(`📊 [SessionLogger] Intervention logged: ${event.agentId} / ${event.type}`)
  } catch (err) {
    console.warn('[SessionLogger] Failed to log intervention (offline?):', err)
  }
}

/**
 * Append a D_s data point to a participant's history.
 * Called by A1 / coordination core whenever D_s crosses τ_fire.
 */
export async function logDsDataPoint(
  sessionId: string,
  userId: string,
  point: DsDataPoint
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const ref = db.ref(`sessions/${sessionId}/participants/${userId}/dsHistory`)
    await ref.push(point)
  } catch (err) {
    console.warn('[SessionLogger] Failed to log D_s point (offline?):', err)
  }
}

/**
 * Update the outcome of an intervention (accepted / dismissed / resolved).
 * Called when the user interacts with a notification card.
 */
export async function updateInterventionOutcome(
  sessionId: string,
  interventionId: string,
  outcome: InterventionOutcome
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await db
      .ref(`sessions/${sessionId}/interventions/${interventionId}/outcome`)
      .set(outcome)
    console.log(`📊 [SessionLogger] Outcome updated: ${interventionId} → ${outcome}`)
  } catch (err) {
    console.warn('[SessionLogger] Failed to update outcome (offline?):', err)
  }
}

/**
 * Write the Session Log artifact for a participant (A5, Phase III).
 */
export async function writeSessionLog(
  sessionId: string,
  userId: string,
  artifact: Record<string, unknown>
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await db
      .ref(`sessions/${sessionId}/artifacts/sessionLog/${userId}`)
      .set({ ...artifact, generatedAt: Date.now() })
    console.log(`📊 [SessionLogger] Session Log written for user ${userId}`)
  } catch (err) {
    console.warn('[SessionLogger] Failed to write Session Log (offline?):', err)
  }
}

/**
 * Register a participant's profile for the session.
 */
export async function registerParticipant(
  sessionId: string,
  userId: string,
  profile: {
    role: 'participant' | 'researcher'
    expertise: 'N' | 'I' | 'E'
    userName: string
    sectionAssignments?: string[]
  }
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await db
      .ref(`sessions/${sessionId}/participants/${userId}`)
      .set({ ...profile, joinedAt: Date.now() })
    console.log(`📊 [SessionLogger] Participant registered: ${userId}`)
  } catch (err) {
    console.warn('[SessionLogger] Failed to register participant (offline?):', err)
  }
}
