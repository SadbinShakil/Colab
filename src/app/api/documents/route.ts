import { NextResponse } from 'next/server'
import { getAllDocuments } from '@/lib/documentStorage'

export async function GET() {
    try {
        const documents = await getAllDocuments()

        // transform for frontend
        const formattedDocs = documents.map(doc => ({
            id: doc.id,
            name: doc.title || doc.originalName || 'Untitled',
            owner: 'Me', // Todo: add owner field to metadata
            modified: new Date(doc.uploadDate).toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
            starred: false, // Todo: add starred field
            type: 'PDF', // currently only PDFs
            originalName: doc.originalName,
            visibility: doc.visibility
        }))

        return NextResponse.json(formattedDocs)
    } catch (error) {
        console.error('Failed to fetch documents:', error)
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
}
