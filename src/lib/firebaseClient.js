/**
 * Firebase Client for Apryse WebViewer Real-time Collaboration
 * Client-side Firebase integration
 */

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onChildAdded, onChildChanged, onChildRemoved, set, remove, get } from 'firebase/database'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHDrzdTuWebpl2tsNZR_eorIsmhK4YIvw",
  authDomain: "thesis-webviewer-collab.firebaseapp.com",
  databaseURL: "https://thesis-webviewer-collab-default-rtdb.firebaseio.com",
  projectId: "thesis-webviewer-collab",
  storageBucket: "thesis-webviewer-collab.firebasestorage.app",
  messagingSenderId: "233993540501",
  appId: "1:233993540501:web:7e092a284a0ba56cb59c9c",
  measurementId: "G-TPLD9CB3EY"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

class FirebaseClient {
  constructor() {
    this.annotationsRef = ref(database, 'annotations')
    this.authorsRef = ref(database, 'authors')
    this.isAuthenticated = false
  }

  /**
   * Sign in anonymously
   */
  async signInAnonymously() {
    try {
      await signInAnonymously(auth)
      this.isAuthenticated = true
      console.log('✅ Firebase authentication successful')
    } catch (error) {
      console.error('❌ Firebase authentication failed:', error)
      throw error
    }
  }

  /**
   * Create an annotation
   */
  async createAnnotation(annotationId, annotationData) {
    try {
      const annotationRef = ref(database, `annotations/${annotationId}`)
      await set(annotationRef, {
        ...annotationData,
        createdAt: new Date().toISOString(),
        authorId: auth.currentUser?.uid
      })
      console.log('✅ Firebase annotation created:', annotationId)
    } catch (error) {
      console.error('❌ Failed to create Firebase annotation:', error)
      throw error
    }
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(annotationId, annotationData) {
    try {
      const annotationRef = ref(database, `annotations/${annotationId}`)
      await set(annotationRef, {
        ...annotationData,
        updatedAt: new Date().toISOString(),
        authorId: auth.currentUser?.uid
      })
      console.log('✅ Firebase annotation updated:', annotationId)
    } catch (error) {
      console.error('❌ Failed to update Firebase annotation:', error)
      throw error
    }
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId) {
    try {
      const annotationRef = ref(database, `annotations/${annotationId}`)
      await remove(annotationRef)
      console.log('✅ Firebase annotation deleted:', annotationId)
    } catch (error) {
      console.error('❌ Failed to delete Firebase annotation:', error)
      throw error
    }
  }

  /**
   * Listen for annotation changes
   */
  onAnnotationCreated(callback) {
    return onChildAdded(this.annotationsRef, callback)
  }

  onAnnotationUpdated(callback) {
    return onChildChanged(this.annotationsRef, callback)
  }

  onAnnotationDeleted(callback) {
    return onChildRemoved(this.annotationsRef, callback)
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback)
  }
}

// Export singleton instance
export default new FirebaseClient()
