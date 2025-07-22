import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// Storage configuration types
type StorageProvider = 'local' | 'aws' | 'cloudinary'

interface StorageConfig {
  provider: StorageProvider
  bucketName: string
  region: string
  cloudinaryName: string
}

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'paperpal-documents'
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN

export interface UploadResult {
  success: boolean
  url: string
  filename: string
  fileId: string
  publicUrl: string
  size: number
  mimeType: string
  uploadedAt?: string
}

// Server-side only imports
const getServerModules = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Server modules cannot be used on client side')
  }
  const fs = require('fs')
  const path = require('path')
  return { fs, path }
}

export class CloudStorageService {
  private static config: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as StorageProvider) || 'local',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'paperpal-documents',
    region: process.env.AWS_REGION || 'us-east-1',
    cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME || '',
  }

  static async uploadFile(
    file: Buffer, 
    originalName: string, 
    mimeType: string
  ): Promise<UploadResult> {
    const fileId = uuidv4()
    const timestamp = Date.now()
    
    // Ensure originalName is defined and not empty
    const safeName = originalName || 'document.pdf'
    const cleanName = safeName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${cleanName}`
    
    switch (this.config.provider) {
      case 'aws':
        return this.uploadToS3(file, filename, mimeType, fileId)
      case 'cloudinary':
        return this.uploadToCloudinary(file, filename, mimeType, fileId)
      default:
        return this.uploadLocal(file, filename, mimeType, fileId)
    }
  }

  private static async uploadToS3(
    file: Buffer, 
    filename: string, 
    mimeType: string, 
    fileId: string
  ): Promise<UploadResult> {
    const key = `documents/${filename}`
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: 'public-read', // Make files publicly accessible
      Metadata: {
        fileId,
        uploadedAt: new Date().toISOString()
      }
    })

    await s3Client.send(command)

    // Generate public URL
    const publicUrl = CLOUDFRONT_DOMAIN 
      ? `https://${CLOUDFRONT_DOMAIN}/${key}`
      : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`

    return {
      success: true,
      url: publicUrl,
      filename,
      fileId,
      publicUrl,
      size: file.length,
      mimeType,
      uploadedAt: new Date().toISOString()
    }
  }

  private static async uploadToCloudinary(
    file: Buffer, 
    filename: string, 
    mimeType: string, 
    fileId: string
  ): Promise<UploadResult> {
    // Cloudinary implementation (requires cloudinary package)
    // This is a placeholder - you'd need to install and configure cloudinary
    const publicUrl = `https://res.cloudinary.com/your-cloud/raw/upload/documents/${filename}`
    
    return {
      success: true,
      url: publicUrl,
      filename,
      fileId,
      publicUrl,
      size: file.length,
      mimeType,
      uploadedAt: new Date().toISOString()
    }
  }

  private static async uploadLocal(
    file: Buffer, 
    filename: string, 
    mimeType: string, 
    fileId: string
  ): Promise<UploadResult> {
    // Enhanced local storage with better URL handling
    const { fs, path } = getServerModules()
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    const filePath = path.join(uploadsDir, filename)
    fs.writeFileSync(filePath, file)
    
    // Generate public URL - ensure it works in production
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://paperpal.app' 
                     : 'http://localhost:3000')
    
    return {
      success: true,
      url: `${baseUrl}/uploads/${filename}`,
      filename,
      fileId,
      publicUrl: `${baseUrl}/uploads/${filename}`, // For sharing
      size: file.length,
      mimeType
    }
  }

  static async deleteFile(filename: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'aws':
          return this.deleteFromS3(filename)
        case 'cloudinary':
          return this.deleteFromCloudinary(filename)
        default:
          return this.deleteLocal(filename)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }

  private static async deleteFromS3(filename: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: `documents/${filename}`
    })
    
    await s3Client.send(command)
    return true
  }

  private static async deleteFromCloudinary(filename: string): Promise<boolean> {
    // Cloudinary delete implementation
    return true
  }

  private static async deleteLocal(filename: string): Promise<boolean> {
    const { fs, path } = getServerModules()

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename)
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting local file:', error)
      return false
    }
  }

  static async generateShareableLink(filename: string, expiresIn: number = 3600): Promise<string> {
    switch (this.config.provider) {
      case 'aws':
        // Generate presigned URL for temporary access
        const command = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: `documents/${filename}`
        })
        return await getSignedUrl(s3Client, command, { expiresIn })
      default:
        // For local/cloudinary, return the public URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        return `${baseUrl}/uploads/${filename}`
    }
  }
}

// Utility functions for file validation
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = ['application/pdf']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PDF files are allowed' }
  }
  
  return { valid: true }
}

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
} 