'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, FileText, ArrowLeft, Beaker, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

export default function TestUploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = async (file: File): Promise<string | null> => {
    // ... existing logic ...
    try {
      const formData = new FormData()
      formData.append('file', file)

      // progress simulation
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + 5
        })
      }, 100)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(interval)
      setUploadProgress(100)

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`)

      const result = await response.json()
      return result.document.id
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
      return null
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const file = acceptedFiles[0]

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const documentId = await uploadFile(file)

    if (documentId) {
      toast.success('Document uploaded successfully!')
      setTimeout(() => router.push(`/document/${documentId}`), 1500)
    } else {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isUploading
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-blue-500/30">

      {/* Header */}
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
            <Beaker size={12} />
            <span>Playground Mode</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Upload Playground</h1>
            <p className="text-slate-400 text-lg">Test the upload capabilities in an isolated environment.</p>
          </motion.div>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            {...getRootProps()}
            className={`
              relative group cursor-pointer
              rounded-[2rem] border-2 border-dashed transition-all duration-300
              h-80 flex items-center justify-center p-8
              ${isDragActive
                ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
              }
              ${isUploading ? 'pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center w-full max-w-xs"
                >
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                    />
                  </div>
                  <p className="text-blue-400 font-medium animate-pulse">Uploading Document...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                    <Upload size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                      {isDragActive ? 'Drop it like it\'s hot' : 'Click or drag PDF here'}
                    </p>
                    <p className="text-sm text-slate-500">Up to 50MB • PDF only</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Test Controls */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <Button
              variant="outline"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white h-12"
              onClick={() => toast.success('Toast notification system operational')}
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Test Notification
            </Button>
            <Button
              variant="outline"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white h-12"
              onClick={async () => {
                try {
                  const res = await fetch('/api/upload', { method: 'GET' })
                  if (res.ok) toast.success('API Endpoint Reachable')
                  else toast.error('API Error: ' + res.status)
                } catch (e) { toast.error('API Unreachable') }
              }}
            >
              <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
              Ping API
            </Button>
          </div>

        </div>
      </main>
    </div>
  )
} 