/**
 * Firebase Server for Apryse WebViewer Real-time Collaboration
 * Following the official Apryse collaboration guide
 * Uses Firebase v8 SDK (legacy) as required by Apryse
 */

// Import Firebase v8 SDK (legacy)
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'

// Firebase configuration - Your actual config
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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

class FirebaseServer {
  constructor() {
    this.annotationsRef = firebase.database().ref().child('annotations')
    this.authorsRef = firebase.database().ref().child('authors')
  }

  /**
   * Bind to Firebase events
   */
  bind(action, callbackFunction) {
    switch(action) {
      case 'onAuthStateChanged':
        firebase.auth().onAuthStateChanged(callbackFunction)
        break
      case 'onAnnotationCreated':
        this.annotationsRef.on('child_added', callbackFunction)
        break
      case 'onAnnotationUpdated':
        this.annotationsRef.on('child_changed', callbackFunction)
        break
      case 'onAnnotationDeleted':
        this.annotationsRef.on('child_removed', callbackFunction)
        break
      default:
        console.error('The action is not defined.')
        break
    }
  }

  /**
   * Check if author exists in the database
   */
  checkAuthor(authorId, openReturningAuthorPopup, openNewAuthorPopup) {
    this.authorsRef.once('value', authors => {
      if (authors.hasChild(authorId)) {
        this.authorsRef.child(authorId).once('value', author => {
          openReturningAuthorPopup(author.val().authorName)
        })
      } else {
        openNewAuthorPopup()
      }
    })
  }

  /**
   * Sign in anonymously
   */
  signInAnonymously() {
    return firebase.auth().signInAnonymously().catch(error => {
      if (error.code === 'auth/operation-not-allowed') {
        alert('You must enable Anonymous auth in the Firebase Console.')
      } else {
        console.error('Sign-in error:', error)
      }
    })
  }

  /**
   * Create an annotation
   */
  createAnnotation(annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData)
  }

  /**
   * Update an annotation
   */
  updateAnnotation(annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData)
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(annotationId) {
    this.annotationsRef.child(annotationId).remove()
  }

  /**
   * Update author information
   */
  updateAuthor(authorId, authorData) {
    this.authorsRef.child(authorId).set(authorData)
  }
}

// Export singleton instance
export default new FirebaseServer()
