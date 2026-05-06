/**
 * /api/telemetry
 *
 * Persists behavioral signal events to disk as newline-delimited JSON (NDJSON).
 * One file per session: study-data/telemetry_{sessionId}.ndjson
 * Each line is a self-contained JSON event — easy to parse with pandas/jq.
 *
 * Also writes to Firebase via sessionLogger when a sessionId is provided.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const TELEMETRY_DIR = path.join(process.cwd(), 'study-data', 'telemetry')

function ensureDir() {
  if (!fs.existsSync(TELEMETRY_DIR)) {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { type, payload, sessionId, userId, timestamp } = data

    const event = {
      type,
      userId: userId || 'unknown',
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      payload: payload || {},
      receivedAt: new Date().toISOString(),
    }

    // Persist to disk
    ensureDir()
    const filename = sessionId
      ? `telemetry_${sessionId}.ndjson`
      : `telemetry_unsessioned_${new Date().toISOString().slice(0, 10)}.ndjson`
    const filepath = path.join(TELEMETRY_DIR, filename)

    fs.appendFileSync(filepath, JSON.stringify(event) + '\n')

    console.log(`[TELEMETRY] ${type} — ${userId} — session=${sessionId}`)

    return NextResponse.json({ success: true, persisted: true })
  } catch (error) {
    console.error('[Telemetry Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to persist telemetry' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Returns list of telemetry files — for researcher download
  try {
    ensureDir()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    const files = fs.readdirSync(TELEMETRY_DIR).filter(f => f.endsWith('.ndjson'))

    if (sessionId) {
      const target = `telemetry_${sessionId}.ndjson`
      const filepath = path.join(TELEMETRY_DIR, target)
      if (!fs.existsSync(filepath)) {
        return NextResponse.json({ events: [] })
      }
      const lines = fs.readFileSync(filepath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l))
      return NextResponse.json({ events: lines })
    }

    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
