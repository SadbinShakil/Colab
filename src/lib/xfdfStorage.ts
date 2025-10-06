import { prisma } from './prisma'

/**
 * Ensure a user exists in the database, create if missing
 */
async function ensureUserExists(userId?: string): Promise<void> {
  if (!userId) return // No user ID provided, skip check
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!existingUser) {
      console.log(`🔧 Creating missing user: ${userId}`)
      await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@auto-generated.local`,
          name: `Auto User ${userId}`,
          password: 'auto-generated', // In real app, this would be properly hashed
          role: 'STUDENT'
        }
      })
      console.log(`✅ Created user: ${userId}`)
    }
  } catch (error) {
    console.error(`❌ Error ensuring user exists (${userId}):`, error)
    // Don't throw - let the annotation save attempt continue
  }
}

/**
 * Ensure a document exists in the database, create if missing
 */
async function ensureDocumentExists(documentId: string, uploadedBy?: string): Promise<void> {
  try {
    const existingDocument = await prisma.paper.findUnique({
      where: { id: documentId }
    })
    
    if (!existingDocument) {
      console.log(`🔧 Creating missing document: ${documentId}`)
      
      // Ensure the uploader exists first
      const uploaderUserId = uploadedBy || 'system-auto'
      await ensureUserExists(uploaderUserId)
      
      await prisma.paper.create({
        data: {
          id: documentId,
          title: `Auto Document ${documentId}`,
          filename: `auto-document-${documentId}.pdf`,
          filepath: `/auto-generated/${documentId}.pdf`,
          uploadedBy: uploaderUserId,
          description: 'Auto-generated document for annotation storage'
        }
      })
      console.log(`✅ Created document: ${documentId}`)
    }
  } catch (error) {
    console.error(`❌ Error ensuring document exists (${documentId}):`, error)
    // Don't throw - let the annotation save attempt continue
  }
}

export interface AnnotationLayerData {
  id: string
  documentId: string
  userId?: string | null
  xfdf: string
  version: number
  isGlobal: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LayerResponse {
  userLayer?: AnnotationLayerData
  globalLayer?: AnnotationLayerData
  mergedXfdf?: string
}

/**
 * Get annotation layers for a document
 */
export async function getAnnotationLayers(
  documentId: string,
  userId?: string,
  includeGlobal: boolean = true
): Promise<LayerResponse> {
  try {
    const layers = await prisma.annotationLayer.findMany({
      where: {
        documentId,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(includeGlobal ? [{ isGlobal: true, userId: null }] : [])
        ]
      },
      orderBy: { updatedAt: 'desc' }
    })

    const userLayer = layers.find(layer => layer.userId === userId)
    const globalLayer = layers.find(layer => layer.isGlobal && !layer.userId)

    // Merge XFDF if both layers exist
    let mergedXfdf: string | undefined
    if (userLayer && globalLayer) {
      mergedXfdf = mergeXfdfLayers(globalLayer.xfdf, userLayer.xfdf)
    } else if (userLayer) {
      mergedXfdf = userLayer.xfdf
    } else if (globalLayer) {
      mergedXfdf = globalLayer.xfdf
    }

    return {
      userLayer: userLayer || undefined,
      globalLayer: globalLayer || undefined,
      mergedXfdf
    }
  } catch (error) {
    console.error('Error fetching annotation layers:', error)
    throw error
  }
}

/**
 * Save or update an annotation layer
 */
export async function saveAnnotationLayer(
  documentId: string,
  xfdf: string,
  userId?: string,
  isGlobal: boolean = false,
  expectedVersion?: number
): Promise<AnnotationLayerData> {
  try {
    // Ensure required entities exist before creating annotation layer
    await ensureUserExists(userId)
    await ensureDocumentExists(documentId, userId)
    
    // Check if layer exists
    const existingLayer = await prisma.annotationLayer.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId: userId || null
        }
      }
    })

    // Handle optimistic concurrency
    if (existingLayer && expectedVersion && existingLayer.version !== expectedVersion) {
      throw new Error(`Version conflict. Expected ${expectedVersion}, got ${existingLayer.version}`)
    }

    if (existingLayer) {
      // Update existing layer
      return await prisma.annotationLayer.update({
        where: { id: existingLayer.id },
        data: {
          xfdf,
          version: { increment: 1 },
          isGlobal,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new layer
      return await prisma.annotationLayer.create({
        data: {
          documentId,
          userId,
          xfdf,
          isGlobal,
          version: 1
        }
      })
    }
  } catch (error) {
    console.error('Error saving annotation layer:', error)
    throw error
  }
}

/**
 * Delete an annotation layer
 */
export async function deleteAnnotationLayer(layerId: string): Promise<void> {
  try {
    await prisma.annotationLayer.delete({
      where: { id: layerId }
    })
  } catch (error) {
    console.error('Error deleting annotation layer:', error)
    throw error
  }
}

/**
 * Delete all layers for a user on a document
 */
export async function deleteUserLayers(documentId: string, userId: string): Promise<void> {
  try {
    await prisma.annotationLayer.deleteMany({
      where: {
        documentId,
        userId
      }
    })
  } catch (error) {
    console.error('Error deleting user layers:', error)
    throw error
  }
}

/**
 * Simple XFDF merging - combines annotations from multiple layers
 * In a production environment, you might want more sophisticated merging logic
 */
function mergeXfdfLayers(globalXfdf: string, userXfdf: string): string {
  try {
    // If either is empty, return the other
    if (!globalXfdf.trim()) return userXfdf
    if (!userXfdf.trim()) return globalXfdf

    // Simple merge: extract annotations from both and combine
    const globalAnnotations = extractAnnotationsFromXfdf(globalXfdf)
    const userAnnotations = extractAnnotationsFromXfdf(userXfdf)

    // Create merged XFDF with both sets of annotations
    const mergedAnnotations = [...globalAnnotations, ...userAnnotations]
    return createXfdfFromAnnotations(mergedAnnotations)
  } catch (error) {
    console.error('Error merging XFDF layers:', error)
    // Fallback: return user layer if merge fails
    return userXfdf || globalXfdf
  }
}

/**
 * Extract annotation elements from XFDF string
 */
function extractAnnotationsFromXfdf(xfdf: string): string[] {
  try {
    // Simple regex to extract annotation elements
    // In production, consider using a proper XML parser
    const annotationRegex = /<(highlight|ink|freetext|square|circle|line|polyline|polygon|stamp|fileattachment|sound|movie|widget|link|redact|watermark|trapnet|squiggly|strikeout|underline|caret)[^>]*>.*?<\/\1>/gs
    const matches = xfdf.match(annotationRegex) || []
    return matches
  } catch (error) {
    console.error('Error extracting annotations from XFDF:', error)
    return []
  }
}

/**
 * Create XFDF string from annotation elements
 */
function createXfdfFromAnnotations(annotations: string[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
<annots>`
  
  const footer = `</annots>
</xfdf>`

  return header + annotations.join('') + footer
}

/**
 * Validate XFDF format
 */
export function validateXfdf(xfdf: string): boolean {
  try {
    // Basic validation - check for XFDF structure
    return xfdf.includes('<xfdf') && xfdf.includes('</xfdf>')
  } catch (error) {
    return false
  }
}

/**
 * Get layer statistics for a document
 */
export async function getLayerStats(documentId: string): Promise<{
  totalLayers: number
  userLayers: number
  globalLayers: number
  lastUpdated?: Date
}> {
  try {
    const layers = await prisma.annotationLayer.findMany({
      where: { documentId },
      select: {
        isGlobal: true,
        userId: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    return {
      totalLayers: layers.length,
      userLayers: layers.filter(l => !l.isGlobal && l.userId).length,
      globalLayers: layers.filter(l => l.isGlobal).length,
      lastUpdated: layers[0]?.updatedAt
    }
  } catch (error) {
    console.error('Error getting layer stats:', error)
    throw error
  }
}
