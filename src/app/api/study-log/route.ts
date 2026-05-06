import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Saves study log JSON to /study-data/ folder on the server
// One file per participant per session

export async function POST(request: NextRequest) {
  try {
    const { participantId, sessionId, condition, paperId, events } = await request.json()

    const dir = path.join(process.cwd(), 'study-data')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const filename = `${participantId}_${condition}_${paperId}_${sessionId}.json`
    const filepath = path.join(dir, filename)

    fs.writeFileSync(filepath, JSON.stringify({
      participantId,
      sessionId,
      condition,
      paperId,
      exportedAt: new Date().toISOString(),
      events
    }, null, 2))

    console.log(`[STUDY LOG] Saved: ${filename} (${events.length} events)`)
    return NextResponse.json({ success: true, filename })

  } catch (error) {
    console.error('[STUDY LOG] Error saving:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const dir = path.join(process.cwd(), 'study-data')
    if (!fs.existsSync(dir)) return NextResponse.json({ files: [] })

    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')

    if (file) {
      // Return the content of a single study file
      const safe = path.basename(file) // prevent path traversal
      const filepath = path.join(dir, safe)
      if (!fs.existsSync(filepath) || !safe.endsWith('.json')) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
      return NextResponse.json(data)
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
