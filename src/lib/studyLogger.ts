/**
 * CoRead User Study Logger
 * Captures all events needed for the UIST 2026 evaluation.
 * All data stored in localStorage under key `coread_study_log`
 * and flushed to /api/study-log on session end.
 */

export type StudyEventType =
  // ── Session lifecycle ──
  | 'session_start'
  | 'session_end'
  // ── Role assignment ──
  | 'role_card_viewed'
  | 'role_card_accepted'
  | 'role_card_modified'
  | 'role_card_ignored'           // closed without accepting
  // ── Highlights ──
  | 'highlight_created'
  | 'highlight_deleted'
  // ── AI features ──
  | 'ai_help_invoked'
  | 'ai_help_response_received'
  | 'ai_help_dismissed'
  | 'ai_math_invoked'
  | 'ai_image_invoked'
  | 'ai_tutor_invoked'
  | 'ai_summary_invoked'
  // ── Notifications ──
  | 'notification_shown'
  | 'notification_clicked'
  | 'notification_dismissed'      // dismissed > 2s = read but rejected
  | 'notification_ignored'        // dismissed < 2s = not read
  // ── Peer collaboration ──
  | 'peer_chat_invited'
  | 'peer_chat_accepted'
  | 'peer_chat_declined'
  | 'peer_chat_message_sent'
  // ── Struggle & awareness ──
  | 'struggle_detected'
  | 'share_panel_opened'
  // ── Post-reading artifacts ──
  | 'post_summary_opened'
  | 'post_summary_tab_changed'
  // ── Navigation ──
  | 'section_entered'
  | 'section_exited'
  // ── OPT-OUT BEHAVIORS (privacy & control) ──
  | 'implicit_ai_disabled'        // turned off proactive AI help
  | 'implicit_ai_enabled'         // re-enabled it
  | 'collaboration_mode_off'      // switched to solo reading mode
  | 'collaboration_mode_on'       // re-enabled collaboration
  | 'struggle_broadcast_off'      // stopped sharing struggle signals
  | 'struggle_broadcast_on'
  | 'annotation_broadcast_off'    // set highlights to private-by-default
  | 'annotation_broadcast_on'
  | 'eye_tracking_declined'       // skipped calibration
  | 'eye_tracking_accepted'
  | 'eye_tracking_stopped'        // stopped mid-session
  | 'awareness_panel_hidden'      // hid others' highlights from view
  | 'awareness_panel_shown'
  | 'notifications_muted'         // muted all toasts
  | 'notifications_unmuted'

export interface StudyEvent {
  eventType: StudyEventType
  participantId: string
  sessionId: string
  condition: 'coread' | 'baseline'
  paperId: string
  timestamp: number
  data?: Record<string, any>
}

const STORAGE_KEY = 'coread_study_log'

function getLog(): StudyEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function logStudyEvent(event: Omit<StudyEvent, 'timestamp'>) {
  const log = getLog()
  log.push({ ...event, timestamp: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

export function exportStudyLog(): StudyEvent[] {
  return getLog()
}

export function clearStudyLog() {
  localStorage.removeItem(STORAGE_KEY)
}

export function downloadStudyLog(participantId: string) {
  const log = getLog()
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coread_study_${participantId}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Convenience wrappers ──────────────────────────────────────────

let _ctx = { participantId: '', sessionId: '', condition: 'coread' as const, paperId: '' }

export function initStudySession(ctx: typeof _ctx) {
  _ctx = ctx
  logStudyEvent({ ..._ctx, eventType: 'session_start' })
}

export function log(eventType: StudyEventType, data?: Record<string, any>) {
  logStudyEvent({ ..._ctx, eventType, data })
}
