'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, ExternalLink } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  size: number
  url: string
  uploadProgress: number
  status: 'uploading' | 'completed' | 'error'
}

interface SimpleUploaderProps {
  onUploadComplete?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // in MB
}

export default function SimpleUploader({ 
  onUploadComplete, 
  maxFiles = 5,
  maxSize = 50 
}: SimpleUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId = Date.now().toString()
    
    // Create initial file object
    const uploadFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      url: '',
      uploadProgress: 0,
      status: 'uploading'
    }

    try {
      // Simple form data upload
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        ...uploadFile,
        id: result.document.id, // Update with server ID
        url: result.document.url,
        uploadProgress: 100,
        status: 'completed'
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        ...uploadFile,
        uploadProgress: 0,
        status: 'error'
      }
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    // Validate file types
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.error('Only PDF files are allowed')
      return
    }

    // Validate file sizes
    const oversizedFiles = pdfFiles.filter(file => file.size > maxSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error(`Files must be smaller than ${maxSize}MB`)
      return
    }

    // Check total file count
    if (uploadedFiles.length + pdfFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsUploading(true)

    try {
      const newUploadedFiles: UploadedFile[] = []
      
      for (const file of pdfFiles) {
        toast.loading(`Uploading ${file.name}...`, { id: file.name })
        
        const uploadedFile = await uploadFile(file)
        newUploadedFiles.push(uploadedFile)
        
        if (uploadedFile.status === 'completed') {
          toast.success(`${file.name} uploaded successfully!`, { id: file.name })
        } else {
          toast.error(`Failed to upload ${file.name}`, { id: file.name })
        }
      }

      setUploadedFiles(prev => [...prev, ...newUploadedFiles])
      onUploadComplete?.(newUploadedFiles.filter(f => f.status === 'completed'))
      
    } catch (error) {
      console.error('Upload process error:', error)
      toast.error('Upload process failed')
    } finally {
      setIsUploading(false)
    }
  }, [maxFiles, maxSize, uploadedFiles.length, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled: isUploading
  })

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop your PDFs here' : 'Upload PDF Documents'}
        </h3>
        <p className="text-gray-600">
          Drag and drop PDF files here, or click to select files
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Maximum {maxFiles} files • Up to {maxSize}MB each
        </p>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploaded Files</h4>
          
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <FileText className="h-8 w-8 text-blue-600 mr-3 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </p>
                
                {file.status === 'uploading' && (
                  <Progress value={file.uploadProgress} className="mt-2" />
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {file.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/document/${file.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 