import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  try {
    // Confusion per section from Prisma
    const confusions = await prisma.conceptConfusion.findMany({ where: { paperId: documentId } })
    const confusionBySec = new Map<string, { name: string; count: number }>()
    for (const c of confusions) {
      const key = c.sectionId
      if (!confusionBySec.has(key)) confusionBySec.set(key, { name: c.sectionName, count: 0 })
      confusionBySec.get(key)!.count++
    }

    // Marginal note density per section
    const notes = await (prisma as any).marginalNote.findMany({ where: { paperId: documentId } })
    const noteBySec = new Map<string, { count: number; epistemicTensions: number }>()
    const tensionTags = ['Gap', 'Contradiction', 'Assumption']
    for (const n of notes) {
      const key = n.sectionName || 'unknown'
      if (!noteBySec.has(key)) noteBySec.set(key, { count: 0, epistemicTensions: 0 })
      noteBySec.get(key)!.count++
      if (tensionTags.includes(n.epistemicTag || '')) noteBySec.get(key)!.epistemicTensions++
    }

    // Live peer positions from in-memory room state
    const room = (global as any).__documentRooms?.get(documentId)
    const peerPositions: Record<string, { page: number; sectionId: string; sectionName: string }> = {}
    if (room?.users) {
      for (const u of room.users) {
        if (u.currentPage) {
          peerPositions[u.userId] = {
            page: u.currentPage,
            sectionId: u.currentSectionId || '',
            sectionName: u.currentSectionName || `Page ${u.currentPage}`
          }
        }
      }
    }

    // Build section snapshots
    const allSectionIds = new Set([...confusionBySec.keys(), ...noteBySec.keys()])
    const sections = Array.from(allSectionIds).map(sectionId => {
      const confusion = confusionBySec.get(sectionId) || { name: sectionId, count: 0 }
      const noteData = noteBySec.get(sectionId) || { count: 0, epistemicTensions: 0 }
      const peerCount = Object.values(peerPositions).filter(p => p.sectionId === sectionId).length
      return {
        sectionId,
        sectionName: confusion.name,
        confusionCount: confusion.count,
        marginaliaDensity: noteData.count,
        epistemicTensions: noteData.epistemicTensions,
        peerCount,
      }
    })

    return NextResponse.json({
      success: true,
      snapshot: { sections, peerPositions, generatedAt: Date.now() }
    })
  } catch (error: any) {
    console.error('[trajectory-snapshot]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
