/**
 * XFDF Persistence utilities for ApryseWebViewer
 * Handles loading and saving annotations using XFDF format
 */

export interface XFDFPersistenceOptions {
  documentId: string
  userId?: string
  includeGlobal?: boolean
  autoSaveDelay?: number
}

/**
 * Load annotations from the server and import them into WebViewer
 */
export async function loadAnnotationsFromServer(
  webViewerInstance: any,
  options: XFDFPersistenceOptions
): Promise<number> {
  try {
    const { documentId, userId, includeGlobal = true } = options
    
    console.log('🔄 Loading annotations from server...', { documentId, userId, includeGlobal })
    
    const params = new URLSearchParams({
      documentId,
      ...(userId && { userId }),
      includeGlobal: includeGlobal.toString()
    })
    
    const response = await fetch(`/api/annotations/layers?${params}`, {
      headers: {
        'x-user-id': userId || 'anonymous',
        'x-user-name': 'Development User',
        'x-user-email': 'dev@localhost'
      }
    })
    
    if (!response.ok) {
      console.warn('Failed to load annotations:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    
    if (!data.success) {
      console.warn('Server returned error:', data.error)
      return
    }
    
    const { annotationManager } = webViewerInstance.Core
    
    // Import merged XFDF if available
    if (data.mergedXfdf && data.mergedXfdf.trim()) {
      console.log('📥 Importing merged XFDF annotations...')
      await annotationManager.importAnnotations(data.mergedXfdf)
      console.log('✅ Successfully imported annotations from XFDF')
    } else if (data.userLayer?.xfdf && data.userLayer.xfdf.trim()) {
      console.log('📥 Importing user layer XFDF annotations...')
      await annotationManager.importAnnotations(data.userLayer.xfdf)
      console.log('✅ Successfully imported user annotations from XFDF')
    } else if (data.globalLayer?.xfdf && data.globalLayer.xfdf.trim()) {
      console.log('📥 Importing global layer XFDF annotations...')
      await annotationManager.importAnnotations(data.globalLayer.xfdf)
      console.log('✅ Successfully imported global annotations from XFDF')
    } else {
      console.log('📝 No annotations found to import')
    }
    
    // Return the current version for tracking
    return data.userLayer?.version || data.globalLayer?.version || 1
    
    // Annotations should be automatically visible after import
    // No manual refresh needed as importAnnotations handles display
    
  } catch (error) {
    console.error('❌ Error loading annotations:', error)
    return 1 // Return default version on error
  }
}

/**
 * Save current annotations to the server as XFDF
 */
export async function saveAnnotationsToServer(
  webViewerInstance: any,
  options: XFDFPersistenceOptions,
  expectedVersion?: number
): Promise<{ success: boolean; newVersion?: number; error?: string }> {
  try {
    const { documentId, userId } = options
    
    // Saving annotations to server
    
    const { annotationManager } = webViewerInstance.Core
    
    // Export current annotations as XFDF
    const xfdf = await annotationManager.exportAnnotations()
    
    if (!xfdf || xfdf.trim() === '') {
      console.log('📝 No annotations to save')
      return { success: true }
    }
    
    console.log('📤 Exporting XFDF:', xfdf.length, 'characters')
    
    const response = await fetch('/api/annotations/layers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || 'anonymous',
        'x-user-name': 'Development User',
        'x-user-email': 'dev@localhost'
      },
      body: JSON.stringify({
        documentId,
        userId,
        xfdf,
        isGlobal: false, // User annotations are not global by default
        ...(expectedVersion && { expectedVersion })
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      const errorMessage = data.error || `HTTP ${response.status}`
      console.error('❌ Failed to save annotations:', response.status, errorMessage)
      
      // Handle version conflicts specifically
      if (response.status === 409 && data.code === 'VERSION_CONFLICT') {
        return { success: false, error: `Version conflict: ${errorMessage}` }
      }
      
      return { success: false, error: errorMessage }
    }
    
    if (!data.success) {
      console.error('❌ Server returned error:', data.error)
      return { success: false, error: data.error }
    }
    
    console.log('✅ Successfully saved annotations, new version:', data.layer?.version)
    
    return { 
      success: true, 
      newVersion: data.layer?.version 
    }
    
  } catch (error) {
    console.error('❌ Error saving annotations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Create a debounced auto-save function
 */
export function createAutoSave(
  webViewerInstance: any,
  options: XFDFPersistenceOptions
): { 
  autoSave: () => void
  cancelAutoSave: () => void
  saveNow: () => Promise<{ success: boolean; newVersion?: number; error?: string }>
} {
  const { autoSaveDelay = 2000 } = options
  let timeoutId: NodeJS.Timeout | null = null
  let currentVersion: number | undefined
  let isSaving = false
  let saveQueue: Array<() => Promise<{ success: boolean; newVersion?: number; error?: string }>> = []
  
  const processQueue = async () => {
    if (isSaving || saveQueue.length === 0) return
    
    console.log(`🔄 Processing save queue, ${saveQueue.length} items pending`)
    isSaving = true
    const saveFunction = saveQueue.shift()
    
    if (saveFunction) {
      try {
        const result = await saveFunction()
        if (result.success && result.newVersion) {
          currentVersion = result.newVersion
          console.log('📝 Updated version to:', currentVersion)
        }
      } catch (error) {
        console.error('❌ Error in save queue:', error)
      }
    }
    
    isSaving = false
    
    // Process next item in queue
    if (saveQueue.length > 0) {
      console.log(`⏳ ${saveQueue.length} items still in queue, processing next...`)
      setTimeout(processQueue, 50)
    } else {
      console.log('✅ Save queue empty')
    }
  }
  
  const saveNow = async () => {
    return new Promise((resolve) => {
      const saveFunction = async () => {
        console.log('💾 Executing save operation...')
        const result = await saveAnnotationsToServer(webViewerInstance, options, currentVersion)
        resolve(result)
        return result
      }
      
      console.log(`📝 Adding save to queue, current queue size: ${saveQueue.length}`)
      saveQueue.push(saveFunction)
      processQueue()
    })
  }
  
  const autoSave = () => {
    // Cancel any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    // Set new timeout
    timeoutId = setTimeout(async () => {
      console.log('🔄 Auto-saving annotations...')
      
      try {
        const result = await saveNow()
        
        if (result.success) {
          console.log('✅ Auto-save completed successfully')
        } else {
          console.error('❌ Auto-save failed:', result.error)
          
          // Handle version conflicts by reloading and retrying
          if (result.error?.includes('Version conflict')) {
            console.log('🔄 Version conflict detected, reloading annotations...')
            try {
              const newVersion = await loadAnnotationsFromServer(webViewerInstance, options)
              // Update version after reload
              currentVersion = newVersion
              console.log('✅ Annotations reloaded, version updated to:', newVersion)
            } catch (reloadError) {
              console.error('❌ Failed to reload annotations:', reloadError)
              currentVersion = undefined
            }
          }
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error)
      }
    }, autoSaveDelay)
  }
  
  const cancelAutoSave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    // Clear the save queue
    saveQueue = []
  }
  
  return { autoSave, cancelAutoSave, saveNow }
}

/**
 * Setup annotation persistence for a WebViewer instance
 */
export function setupAnnotationPersistence(
  webViewerInstance: any,
  options: XFDFPersistenceOptions
): {
  loadAnnotations: () => Promise<number>
  saveAnnotations: () => Promise<{ success: boolean; newVersion?: number; error?: string }>
  cleanup: () => void
} {
  const { autoSave, cancelAutoSave, saveNow } = createAutoSave(webViewerInstance, options)
  const { annotationManager } = webViewerInstance.Core
  
  // Set up auto-save on annotation changes
  const handleAnnotationChange = (annotations: any[], action: string) => {
    // Annotation changed: triggering auto-save
    
    // Trigger auto-save for any annotation change
    if (action === 'add' || action === 'modify' || action === 'delete') {
      autoSave()
    }
  }
  
  // Add event listener
  annotationManager.addEventListener('annotationChanged', handleAnnotationChange)
  
  const loadAnnotations = () => loadAnnotationsFromServer(webViewerInstance, options)
  const saveAnnotations = saveNow
  
  const cleanup = () => {
    cancelAutoSave()
    annotationManager.removeEventListener('annotationChanged', handleAnnotationChange)
  }
  
  return {
    loadAnnotations,
    saveAnnotations,
    cleanup
  }
}

/**
 * Delete all user annotations for a document
 */
export async function deleteUserAnnotations(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({ documentId, userId })
    
    const response = await fetch(`/api/annotations/layers/user?${params}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
        'x-user-name': 'Development User',
        'x-user-email': 'dev@localhost'
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error }
    }
    
    return { success: data.success }
    
  } catch (error) {
    console.error('❌ Error deleting user annotations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
