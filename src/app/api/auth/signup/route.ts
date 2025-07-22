import { NextRequest, NextResponse } from 'next/server'
import { addUser, userExists } from '@/lib/users'

interface SignupRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  institution?: string
  expertise: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json()
    
    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already exists
    if (userExists(body.email)) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Validate password length
    if (body.password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create new user (in a real app, hash the password)
    const newUser = addUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      institution: body.institution || '',
      expertise: body.expertise || [],
      // In production: hash the password with bcrypt or similar
      password: body.password
    })

    // Return success response (don't include password)
    const { password, ...userWithoutPassword } = newUser
    
    return NextResponse.json(
      { 
        message: 'Account created successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 