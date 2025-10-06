import fs from 'fs'
import path from 'path'

const ANNOTATIONS_DIR = path.join(process.cwd(), 'data', 'annotations')

// Ensure the annotations directory exists
if (!fs.existsSync(ANNOTATIONS_DIR)) {
  fs.mkdirSync(ANNOTATIONS_DIR, { recursive: true })
}

export interface Annotation {
  id: string
  documentId: string
  type: 'highlight' | 'comment' | 'note'
  content: string
  position: {
    pageNumber: number
    x?: number
    y?: number
    width?: number
    height?: number
    selection?: string
  }
  color?: string
  author: {
    id: string
    name: string
  }
  timestamp: string
  replies?: {
    id: string
    content: string
    author: {
      id: string
      name: string
    }
    timestamp: string
  }[]
}

export interface DocumentAnnotations {
  documentId: string
  annotations: Annotation[]
  lastUpdated: string
}

export async function getDocumentAnnotations(documentId: string): Promise<Annotation[]> {
  try {
    const filePath = path.join(ANNOTATIONS_DIR, `${documentId}.json`)
    
    if (!fs.existsSync(filePath)) {
      return []
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const documentAnnotations: DocumentAnnotations = JSON.parse(fileContent)
    
    return documentAnnotations.annotations || []
  } catch (error) {
    console.error('Error reading annotations:', error)
    return []
  }
}

export async function saveAnnotation(documentId: string, annotation: Annotation): Promise<void> {
  try {
    const filePath = path.join(ANNOTATIONS_DIR, `${documentId}.json`)
    
    // Get existing annotations
    const existingAnnotations = await getDocumentAnnotations(documentId)
    
    // Add or update the annotation
    const annotationIndex = existingAnnotations.findIndex(a => a.id === annotation.id)
    if (annotationIndex >= 0) {
      existingAnnotations[annotationIndex] = annotation
    } else {
      existingAnnotations.push(annotation)
    }
    
    // Save to file
    const documentAnnotations: DocumentAnnotations = {
      documentId,
      annotations: existingAnnotations,
      lastUpdated: new Date().toISOString()
    }
    
    fs.writeFileSync(filePath, JSON.stringify(documentAnnotations, null, 2))
  } catch (error) {
    console.error('Error saving annotation:', error)
    throw error
  }
}

export async function deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
  try {
    const filePath = path.join(ANNOTATIONS_DIR, `${documentId}.json`)
    
    // Get existing annotations
    const existingAnnotations = await getDocumentAnnotations(documentId)
    
    // Remove the annotation
    const filteredAnnotations = existingAnnotations.filter(a => a.id !== annotationId)
    
    // Save to file
    const documentAnnotations: DocumentAnnotations = {
      documentId,
      annotations: filteredAnnotations,
      lastUpdated: new Date().toISOString()
    }
    
    fs.writeFileSync(filePath, JSON.stringify(documentAnnotations, null, 2))
  } catch (error) {
    console.error('Error deleting annotation:', error)
    throw error
  }
}

export async function addAnnotationReply(
  documentId: string, 
  annotationId: string, 
  reply: {
    id: string
    content: string
    author: { id: string; name: string }
    timestamp: string
  }
): Promise<void> {
  try {
    const annotations = await getDocumentAnnotations(documentId)
    const annotation = annotations.find(a => a.id === annotationId)
    
    if (!annotation) {
      throw new Error('Annotation not found')
    }
    
    if (!annotation.replies) {
      annotation.replies = []
    }
    
    annotation.replies.push(reply)
    
    await saveAnnotation(documentId, annotation)
  } catch (error) {
    console.error('Error adding annotation reply:', error)
    throw error
  }
}

