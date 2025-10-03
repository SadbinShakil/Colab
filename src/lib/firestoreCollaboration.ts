/**
 * Firebase Firestore Collaboration Service
 * Parallel implementation alongside existing system
 * Based on ChatGPT's recommended approach
 */

// Import polyfills first
import './firebasePolyfills'

// Use Firebase v8 SDK (legacy) to match existing system
// Import Firebase only on client side to avoid SSR issues
let firebase: any = null
let firebaseInitialized = false

const initializeFirebase = async () => {
  if (firebaseInitialized) return firebase
  
  if (typeof window !== 'undefined') {
    const firebaseModule = await import('firebase/app')
    await import('firebase/firestore')
    await import('firebase/auth')
    
    firebase = firebaseModule.default
    firebaseInitialized = true
  }
  
  return firebase
}

// Firebase configuration (using your existing config)
const firebaseConfig = {
  apiKey: "AIzaSyCHDrzdTuWebpl2tsNZR_eorIsmhK4YIvw",
  authDomain: "thesis-webviewer-collab.firebaseapp.com",
  databaseURL: "https://thesis-webviewer-collab-default-rtdb.firebaseio.com",
  projectId: "thesis-webviewer-collab",
  storageBucket: "thesis-webviewer-collab.firebasestorage.app",
  messagingSenderId: "233993540501",
  appId: "1:233993540501:web:7e092a284a0ba56cb59c9c"
}

// Initialize Firebase (v8 syntax) - will be done dynamically
let db: any = null
let auth: any = null

const initializeFirebaseServices = async () => {
  if (db && auth) return { db, auth }
  
  const firebaseInstance = await initializeFirebase()
  if (!firebaseInstance) return { db: null, auth: null }
  
  if (!firebaseInstance.apps.length) {
    firebaseInstance.initializeApp(firebaseConfig)
  }
  
  db = firebaseInstance.firestore()
  auth = firebaseInstance.auth()
  
  return { db, auth }
}

// Types
export interface FirestoreAnnotation {
  id?: string
  documentId: string
  apryseId: string        // WebViewer annotation.Id (used as Firestore doc ID)
  xfdf: string            // XFDF data for the annotation
  userId: string
  userName: string
  deleted?: boolean       // Soft delete flag
  createdAt: any // firebase.firestore.Timestamp
  updatedAt: any // firebase.firestore.Timestamp
}

export interface FSUpsertPayload {
  documentId: string
  apryseId: string           // WebViewer annotation Id
  xfdf?: string | null       // exported xfdf for this change
  deleted?: boolean
  userId: string
  userName: string
}

export interface FirestoreCollaborationCallbacks {
  onAnnotationAdded?: (annotation: FirestoreAnnotation) => void
  onAnnotationUpdated?: (annotation: FirestoreAnnotation) => void
  onAnnotationDeleted?: (annotationId: string) => void
  onError?: (error: Error) => void
}

class FirestoreCollaborationService {
  private isInitialized = false
  private unsubscribeFunctions: (() => void)[] = []
  private callbacks: FirestoreCollaborationCallbacks = {}

  /**
   * Initialize the service with authentication
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🔥 Initializing Firestore collaboration service...')
      
      // Initialize Firebase services dynamically
      const services = await initializeFirebaseServices()
      if (!services.db || !services.auth) {
        throw new Error('Failed to initialize Firebase services')
      }
      
      // Sign in anonymously (v8 syntax)
      await services.auth.signInAnonymously()
      console.log('✅ Firebase authentication successful')
      
      this.isInitialized = true
      console.log('✅ Firestore collaboration service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Firestore collaboration:', error)
      throw error
    }
  }

  /**
   * Set up bulletproof real-time listeners for a document
   */
  async setupRealtimeListeners(
    documentId: string, 
    callbacks: FirestoreCollaborationCallbacks
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    this.callbacks = callbacks
    console.log(`🔥 Setting up bulletproof Firestore real-time listeners for document: ${documentId}`)

    // Get Firebase services
    const services = await initializeFirebaseServices()
    if (!services.db) {
      throw new Error('Firebase services not available')
    }

    // Bulletproof query - no orderBy to avoid index issues
    const q = services.db.collection('annotations')
      .where('documentId', '==', documentId)

    // Bulletproof listener with metadata changes
    const unsubscribe = q.onSnapshot({ includeMetadataChanges: true }, async (snap: any) => {
      console.group('[FS] snapshot')
      console.log('size=', snap.size, 'fromCache=', snap.metadata.fromCache)

      for (const ch of snap.docChanges()) {
        const doc = ch.doc
        const d = doc.data()
        const isLocalWrite = doc.metadata.hasPendingWrites === true

        console.log(
          ch.type,
          doc.id,
          { userId: d.userId, deleted: d.deleted, isLocalWrite }
        )

        // Skip our own local optimistic writes; we only want remote commits
        if (isLocalWrite) {
          console.log('⚠️ Skipping local write - waiting for remote commit')
          continue
        }

        try {
          // Handle deleted annotations
          if (d.deleted || ch.type === 'removed') {
            console.log('🔥 Firestore annotation deleted:', doc.id)
            this.callbacks.onAnnotationDeleted?.(doc.id)
            continue
          }

          // Handle add/modify with XFDF import
          if (typeof d.xfdf === 'string' && d.xfdf.trim()) {
            console.log('[IMPORT] xfdf length', d.xfdf.length, 'from', d.userId)
            this.callbacks.onAnnotationAdded?.({ id: doc.id, ...d } as FirestoreAnnotation)
          } else {
            console.log('⚠️ Skipping - empty or invalid XFDF')
          }
        } catch (e) {
          console.error('❌ Firestore listener callback error:', e)
        }
      }
      console.groupEnd()
    })

    this.unsubscribeFunctions.push(unsubscribe)
    console.log('✅ Bulletproof Firestore real-time listeners set up')
  }

  /**
   * Upsert annotation using Apryse ID as doc ID and store XFDF
   */
  async upsertAnnotation(p: FSUpsertPayload): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    try {
      console.log('🔥 Upserting annotation to Firestore:', p.apryseId)
      
      // Get Firebase services
      const services = await initializeFirebaseServices()
      if (!services.db) {
        throw new Error('Firebase services not available')
      }
      
      const ref = services.db.collection('annotations').doc(p.apryseId) // Key by Apryse Id
      
      await ref.set({
        documentId: p.documentId,
        apryseId: p.apryseId,
        xfdf: p.xfdf ?? null,
        deleted: !!p.deleted,
        userId: p.userId,
        userName: p.userName,
        updatedAt: firebase?.firestore?.FieldValue?.serverTimestamp() || new Date(),
        createdAt: firebase?.firestore?.FieldValue?.serverTimestamp() || new Date(),
      }, { merge: true })
      
      console.log('✅ Annotation upserted to Firestore with ID:', p.apryseId)
    } catch (error) {
      console.error('❌ Failed to upsert annotation to Firestore:', error)
      throw error
    }
  }

  /**
   * Delete annotation by Apryse ID (soft delete)
   */
  async deleteByApryseId(apryseId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    try {
      console.log('🔥 Deleting annotation from Firestore by Apryse ID:', apryseId)
      
      // Get Firebase services
      const services = await initializeFirebaseServices()
      if (!services.db) {
        throw new Error('Firebase services not available')
      }
      
      // Soft delete - set deleted: true
      await services.db.collection('annotations').doc(apryseId).set({
        deleted: true,
        updatedAt: firebase?.firestore?.FieldValue?.serverTimestamp() || new Date(),
      }, { merge: true })
      
      console.log('✅ Annotation soft deleted from Firestore')
    } catch (error) {
      console.error('❌ Failed to delete annotation from Firestore:', error)
      throw error
    }
  }

  /**
   * Get all annotations for a document (one-time fetch)
   */
  async getAnnotations(documentId: string): Promise<FirestoreAnnotation[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    try {
      console.log('🔥 Fetching annotations from Firestore for document:', documentId)
      
      // Get Firebase services
      const services = await initializeFirebaseServices()
      if (!services.db) {
        throw new Error('Firebase services not available')
      }
      
      const snapshot = await services.db.collection('annotations')
        .where('documentId', '==', documentId)
        .get()
      
      const annotations: FirestoreAnnotation[] = []
      snapshot.forEach((doc: any) => {
        const data = doc.data()
        if (!data.deleted) {  // Only include non-deleted annotations
          annotations.push({ id: doc.id, ...data } as FirestoreAnnotation)
        }
      })
      
      console.log(`✅ Fetched ${annotations.length} annotations from Firestore`)
      return annotations
    } catch (error) {
      console.error('❌ Failed to fetch annotations from Firestore:', error)
      throw error
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    console.log('🔥 Cleaning up Firestore collaboration service')
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    this.unsubscribeFunctions = []
    this.callbacks = {}
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }
}

// Export singleton instance
export const firestoreCollaboration = new FirestoreCollaborationService()
export default firestoreCollaboration
