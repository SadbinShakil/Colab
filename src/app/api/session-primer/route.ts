import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  const userId = searchParams.get('userId')
  const title = searchParams.get('title') || undefined

  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  try {
    // Fetch collective memory
    const base = request.nextUrl.origin
    const res = await fetch(`${base}/api/collective-memory?documentId=${documentId}&userId=${userId || ''}&title=${encodeURIComponent(title || '')}`)
    const data = await res.json()

    if (!data.success || !data.knowledge) {
      return NextResponse.json({ success: true, shouldPrime: false, knowledge: null })
    }

    const knowledge = data.knowledge

    // Only prime if at least 2 prior sessions exist
    if (knowledge.totalSessions < 2) {
      return NextResponse.json({ success: true, shouldPrime: false, knowledge })
    }

    // Sort sections by priority: confusionCount * 0.5 + openQuestionsCount * 0.3 + (epistemicTensions > 0 ? 0.2 : 0)
    const prioritySections = knowledge.sectionInsights
      .map((s: any) => ({
        ...s,
        priorityScore: s.confusionCount * 0.5 + (s.openQuestions?.length || 0) * 0.3
      }))
      .sort((a: any, b: any) => b.priorityScore - a.priorityScore)
      .slice(0, 3)

    return NextResponse.json({
      success: true,
      shouldPrime: true,
      knowledge: { ...knowledge, prioritySections }
    })
  } catch (error: any) {
    console.error('[session-primer]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
