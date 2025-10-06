import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'RESEARCHER' | 'PROFESSOR' | 'ADMIN'
}

/**
 * Extract user information from request
 * This is a simplified implementation - replace with your actual auth system
 */
export function getUserFromRequest(request: NextRequest): AuthUser | null {
  try {
    // Method 1: Check for user ID in headers (for development)
    const userId = request.headers.get('x-user-id')
    const userName = request.headers.get('x-user-name')
    const userEmail = request.headers.get('x-user-email')
    
    if (userId && userName && userEmail) {
      return {
        id: userId,
        name: userName,
        email: userEmail,
        role: 'STUDENT' // Default role
      }
    }
    
    // Method 2: Check session cookie (implement based on your auth system)
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      // Parse session cookie and extract user info
      // This is where you'd validate the session and get user data
      console.log('Session cookie found:', sessionCookie.value)
      
      // For now, return a default user for development
      return {
        id: 'dev-user',
        name: 'Development User',
        email: 'dev@example.com',
        role: 'STUDENT'
      }
    }
    
    // Method 3: Check authorization header (JWT, etc.)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Validate JWT token and extract user info
      console.log('Bearer token found:', token.substring(0, 20) + '...')
      
      // For now, return a default user for development
      return {
        id: 'jwt-user',
        name: 'JWT User',
        email: 'jwt@example.com',
        role: 'STUDENT'
      }
    }
    
    // For development: return a default user if no auth is found
    console.log('🔧 Development mode: Using default user for unauthenticated request')
    return {
      id: 'dev-user-default',
      name: 'Development User',
      email: 'dev@localhost',
      role: 'STUDENT'
    }
  } catch (error) {
    console.error('Error extracting user from request:', error)
    // For development: return a default user even on error
    return {
      id: 'dev-user-error',
      name: 'Development User (Error)',
      email: 'dev-error@localhost',
      role: 'STUDENT'
    }
  }
}

/**
 * Check if user has permission to access a document
 */
export function canAccessDocument(user: AuthUser | null, documentId: string): boolean {
  // For now, allow all authenticated users to access any document
  // In production, implement proper permission checking
  return user !== null
}

/**
 * Check if user can modify annotations for a document
 */
export function canModifyAnnotations(user: AuthUser | null, documentId: string, targetUserId?: string): boolean {
  if (!user) return false
  
  // Users can always modify their own annotations
  if (!targetUserId || user.id === targetUserId) return true
  
  // Admins and professors can modify any annotations
  if (user.role === 'ADMIN' || user.role === 'PROFESSOR') return true
  
  return false
}

/**
 * Check if user can create global annotations
 */
export function canCreateGlobalAnnotations(user: AuthUser | null): boolean {
  if (!user) return false
  
  // Only professors and admins can create global annotations
  return user.role === 'PROFESSOR' || user.role === 'ADMIN'
}
