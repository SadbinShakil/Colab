import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply middleware to API routes that need authentication
  if (request.nextUrl.pathname.startsWith('/api/annotations/layers')) {
    // For now, we'll implement basic authentication checking
    // In a production app, you'd verify JWT tokens or session cookies here
    
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('session')
    
    // Allow requests with either authorization header or session cookie
    // This is a simplified check - implement proper auth validation based on your auth system
    if (!authHeader && !sessionCookie) {
      // For development, we'll be permissive and just log the request
      console.log('⚠️ Unauthenticated request to annotation API:', request.nextUrl.pathname)
      
      // For development: Allow unauthenticated requests
      // In production, uncomment this to require authentication:
      // return NextResponse.json(
      //   { error: 'Authentication required' },
      //   { status: 401 }
      // )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/annotations/layers/:path*',
    '/api/annotations/layers/user/:path*'
  ]
}
