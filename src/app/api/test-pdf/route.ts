import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[Test PDF] API route called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', success: false },
        { status: 400 }
      )
    }
    
    console.log(`[Test PDF] File received: ${file.name}, Type: ${file.type}, Size: ${file.size}`)
    
    return NextResponse.json({
      success: true,
      message: 'API route working correctly',
      file: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Test PDF] Error:', error)
    return NextResponse.json(
      { 
        error: 'API route error', 
        details: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test PDF API route is working',
    timestamp: new Date().toISOString()
  })
}