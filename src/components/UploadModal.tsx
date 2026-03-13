"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface UploadModalProps {
    isOpen: boolean
    onClose: () => void
    onUploadComplete?: () => void
}

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const uploadFile = async (file: File): Promise<string | null> => {
        try {
            const formData = new FormData()
            formData.append('file', file)

            // Fake progress for UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => (prev >= 90 ? prev : prev + 10))
            }, 400)

            const response = await fetch('/api/upload', { method: 'POST', body: formData })

            clearInterval(progressInterval)
            setUploadProgress(100)

            if (!response.ok) throw new Error('Upload failed')

            const result = await response.json()
            return result.document.id
        } catch (error) {
            console.error(error)
            setUploadProgress(0)
            return null
        }
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!acceptedFiles.length) return
        const file = acceptedFiles[0]

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file')
            return
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be under 50MB')
            return
        }

        setIsUploading(true)
        setUploadProgress(5)

        try {
            const id = await uploadFile(file)
            if (id) {
                toast.success("Upload complete")
                setIsUploading(false)
                setUploadProgress(0)
                onClose()
                if (onUploadComplete) onUploadComplete()
                router.push(`/document/${id}`)
            } else {
                toast.error("Upload failed")
                setIsUploading(false)
            }
        } catch (e) {
            toast.error("Upload failed")
            setIsUploading(false)
        }

    }, [onClose, onUploadComplete, router])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
        disabled: isUploading
    })

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle>Upload Research</DialogTitle>
                </DialogHeader>

                <div
                    {...getRootProps()}
                    className={`
              relative group cursor-pointer
              rounded-xl border-2 border-dashed transition-all duration-300 ease-out
              h-64 flex items-center justify-center mt-2
              ${isDragActive
                            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                            : isUploading
                                ? 'border-transparent bg-gray-50'
                                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                        }
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
                                className="flex flex-col items-center"
                            >
                                <div className="relative w-16 h-16 mb-4">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="32" cy="32" r="28"
                                            stroke="currentColor" strokeWidth="4" fill="transparent"
                                            className="text-gray-200"
                                        />
                                        <circle
                                            cx="32" cy="32" r="28"
                                            stroke="currentColor" strokeWidth="4" fill="transparent"
                                            strokeDasharray={175}
                                            strokeDashoffset={175 - (175 * uploadProgress) / 100}
                                            className="text-blue-600 transition-all duration-300"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-bold text-blue-600">{Math.round(uploadProgress)}%</span>
                                    </div>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">Uploading...</h3>
                                <p className="text-xs text-gray-500">Processing document</p>
                            </motion.div>
                        ) : isDragActive ? (
                            <motion.div
                                key="drag"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                    <Upload size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-blue-600">Drop to upload</h3>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center p-6 text-center"
                            >
                                <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-300">
                                    <FileText size={28} strokeWidth={1.5} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                        Click to upload or drag & drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PDF up to 50MB
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-center gap-6 mt-4 opacity-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>AI Analysis</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>Auto-OCR</span>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
