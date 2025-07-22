'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

export default function TestUploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file: File): Promise<string | null> => {
    console.log('Starting upload for file:', file.name)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending upload request...')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log('Upload response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload successful:', result)
      return result.document.id
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed. Please try again.')
      return null
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles)
    
    if (acceptedFiles.length === 0) {
      console.log('No files accepted')
      toast.error('No valid files selected')
      return
    }
    
    const file = acceptedFiles[0]
    console.log('Processing file:', file)
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      console.log('Invalid file type:', file.type)
      toast.error('Only PDF files are supported')
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      console.log('File too large:', file.size)
      toast.error('File size must be less than 50MB')
      return
    }

    console.log('File validation passed, starting upload...')
    setIsUploading(true)
    setUploadProgress(50)
    
    const documentId = await uploadFile(file)
    
    if (documentId) {
      toast.success('Document uploaded successfully!')
      console.log('Upload complete, document ID:', documentId)
      setUploadProgress(100)
      setTimeout(() => {
        router.push(`/document/${documentId}`)
      }, 1500)
    } else {
      console.log('Upload failed, resetting state')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading
  })

  const testToast = () => {
    console.log('Test button clicked')
    toast.success('Test toast working!')
  }

  const testUploadAPI = async () => {
    console.log('Testing upload API...')
    try {
      const response = await fetch('/api/upload', {
        method: 'GET'
      })
      console.log('API test response:', response.status)
      if (response.ok) {
        toast.success('Upload API is working!')
      } else {
        toast.error('Upload API test failed')
      }
    } catch (error) {
      console.error('API test error:', error)
      toast.error('API test failed')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Upload Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testToast} style={{ marginRight: '10px', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          Test Toast
        </button>
        <button onClick={testUploadAPI} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
          Test Upload API
        </button>
      </div>

      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '10px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#e3f2fd' : '#f9f9f9',
          marginBottom: '20px'
        }}
      >
        <input {...getInputProps()} />
        
        {!isUploading ? (
          <div>
            <h3>{isDragActive ? 'Drop your PDF here' : 'Click or drag PDF file here'}</h3>
            <p>Only PDF files are supported (max 50MB)</p>
          </div>
        ) : (
          <div>
            <h3>Uploading... {uploadProgress}%</h3>
            <div style={{ width: '100%', backgroundColor: '#ddd', borderRadius: '10px', height: '20px', marginTop: '10px' }}>
              <div 
                style={{ 
                  width: `${uploadProgress}%`, 
                  backgroundColor: '#007bff', 
                  height: '100%', 
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Debug Info:</strong>
        <p>Drag Active: {isDragActive ? 'Yes' : 'No'}</p>
        <p>Is Uploading: {isUploading ? 'Yes' : 'No'}</p>
        <p>Upload Progress: {uploadProgress}%</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Back to Main Upload
        </button>
      </div>
    </div>
  )
} 