import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    
    // List all files in uploads directory
    const files = await readdir(uploadsDir)
    
    if (id) {
      // Look for files that start with the given ID
      const matchingFiles = files.filter(file => file.startsWith(id + '-'))
      
      if (matchingFiles.length > 0) {
        const file = matchingFiles[0]
        const filePath = join(uploadsDir, file)
        const fileStats = await stat(filePath)
        
        return NextResponse.json({
          success: true,
          file: {
            name: file,
            size: fileStats.size,
            url: `/uploads/${file}`,
            exists: true
          },
          allMatchingFiles: matchingFiles
        })
      } else {
        return NextResponse.json({
          success: false,
          error: `No files found starting with ID: ${id}`,
          availableFiles: files.slice(0, 10) // Show first 10 files
        })
      }
    }
    
    // Return list of all files
    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      files: files.slice(0, 20).map(file => ({
        name: file,
        url: `/uploads/${file}`
      }))
    })
    
  } catch (error) {
    console.error('Error in test-pdf endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 