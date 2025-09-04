'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { 
  Copy, 
  Highlighter, 
  MessageSquare, 
  Brain,
  X,
  Check,
  BookOpen,
  Search,
  Share,
  Calculator,
  Table2,
  Image as ImageIcon,
  GraduationCap,
  HelpCircle
} from 'lucide-react'
import { getContentType } from '../utils/contentDetector'
import { isTableContent } from '../utils/tableDetector'
import { isImageContent } from '../utils/imageDetector'

interface TextSelectionPopupProps {
  selectedText: string
  position: { x: number; y: number }
  onClose: () => void
  onHighlight?: (color: string) => void
  onAnnotate?: (comment: string) => void
  onAIExplain?: () => void
  onGeneralExplain?: () => void
  onTableExplain?: () => void
  onImageExplain?: () => void
  onPrerequisiteHelp?: () => void
  onStuckHelp?: () => void
  onCopy?: () => void
  documentContext?: string
}

export default function TextSelectionPopup({
  selectedText,
  position,
  onClose,
  onHighlight,
  onAnnotate,
  onAIExplain,
  onGeneralExplain,
  onTableExplain,
  onImageExplain,
  onPrerequisiteHelp,
  onStuckHelp,
  onCopy,
  documentContext
}: TextSelectionPopupProps) {
  const [showAnnotation, setShowAnnotation] = useState(false)
  const [annotationText, setAnnotationText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showHighlightColors, setShowHighlightColors] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  const highlightColors = [
    { name: 'Yellow', color: '#ffeb3b' },
    { name: 'Green', color: '#4caf50' },
    { name: 'Blue', color: '#2196f3' },
    { name: 'Pink', color: '#e91e63' },
    { name: 'Orange', color: '#ff9800' }
  ]

  // Position the popup near the selection
  useEffect(() => {
    if (popupRef.current) {
      const popup = popupRef.current
      const popupRect = popup.getBoundingClientRect()
      
      // Calculate position to keep popup in viewport
      let left = position.x - popupRect.width / 2
      let top = position.y - popupRect.height - 10
      
      // Adjust if popup goes outside viewport
      if (left < 10) left = 10
      if (left + popupRect.width > window.innerWidth - 10) {
        left = window.innerWidth - popupRect.width - 10
      }
      if (top < 10) {
        top = position.y + 20 // Show below selection if no room above
      }
      
      popup.style.left = `${left}px`
      popup.style.top = `${top}px`
    }
  }, [position])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText)
      setCopied(true)
      if (onCopy) onCopy()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleHighlight = (color: string) => {
    if (onHighlight) {
      onHighlight(color)
    }
    setShowHighlightColors(false)
    onClose()
  }

  const handleAnnotate = () => {
    if (annotationText.trim() && onAnnotate) {
      onAnnotate(annotationText)
      setAnnotationText('')
      setShowAnnotation(false)
      onClose()
    }
  }

  const handleAIExplain = () => {
    if (onAIExplain) {
      onAIExplain()
    }
    onClose()
  }

  const handleWebSearch = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`
    window.open(searchUrl, '_blank')
    onClose()
  }

  const handleLookup = () => {
    const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(selectedText)}`
    window.open(searchUrl, '_blank')
    onClose()
  }

  // Truncate text if too long
  const displayText = selectedText.length > 100 
    ? selectedText.substring(0, 100) + '...' 
    : selectedText

  return (
    <div 
      ref={popupRef}
      className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2"
      style={{ position: 'fixed' }}
    >
      <Card className="shadow-2xl border-gray-200 bg-white p-0 min-w-[300px] max-w-[400px]">
        {/* Header with selected text */}
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-700 font-medium line-clamp-2">
              "{displayText}"
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main actions */}
        <div className="p-2">
          {console.log('🎯 Rendering main actions, showAnnotation:', showAnnotation, 'showHighlightColors:', showHighlightColors)}
          {!showAnnotation && !showHighlightColors ? (
            <div className="grid grid-cols-3 gap-1">
              {/* Copy */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="text-xs">Copy</span>
              </Button>

              {/* Highlight */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHighlightColors(true)}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Highlighter className="h-4 w-4" />
                <span className="text-xs">Highlight</span>
              </Button>

              {/* Annotate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🎯 Comment button clicked, setting showAnnotation to true');
                  setShowAnnotation(true);
                }}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Comment</span>
              </Button>

              {/* Math AI Explainer */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onAIExplain) onAIExplain()
                }}
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-blue-50"
                title="Get mathematical explanation powered by GPT-4"
              >
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Math AI</span>
              </Button>

                             {/* Advanced AI Explainer */}
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   if (onGeneralExplain) onGeneralExplain()
                 }}
                 className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50"
                 title="Get advanced AI explanation with multiple formats and depth levels"
               >
                 <div className="relative">
                   <BookOpen className="h-4 w-4 text-purple-600" />
                   <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
                 </div>
                 <span className="text-xs font-medium bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">Smart AI</span>
               </Button>

               {/* Table AI Explainer */}
               {isTableContent(selectedText) && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => {
                     if (onTableExplain) onTableExplain()
                   }}
                   className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50"
                   title="Get intelligent table data analysis and insights"
                 >
                   <div className="relative">
                     <Table2 className="h-4 w-4 text-orange-600" />
                     <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
                   </div>
                   <span className="text-xs font-medium bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">Table AI</span>
                 </Button>
               )}

                             {/* Image AI Explainer */}
              {isImageContent(selectedText) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onImageExplain) onImageExplain()
                  }}
                  className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                  title="Get AI-powered image and visual content analysis"
                >
                  <div className="relative">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-xs font-medium bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">Image AI</span>
                </Button>
              )}

              {/* Prerequisite Helper */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onPrerequisiteHelp) onPrerequisiteHelp()
                }}
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50"
                title="Get prerequisite knowledge and background needed to understand this content"
              >
                <div className="relative">
                  <GraduationCap className="h-4 w-4 text-green-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full animate-pulse"></div>
                </div>
                <span className="text-xs font-medium bg-gradient-to-r from-green-700 to-teal-700 bg-clip-text text-transparent">Prerequisites</span>
              </Button>

              {/* I'm Stuck Here */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onStuckHelp) onStuckHelp()
                }}
                className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50"
                title="Mark this area as confusing and get help from the community"
              >
                <div className="relative">
                  <HelpCircle className="h-4 w-4 text-red-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                </div>
                <span className="text-xs font-medium bg-gradient-to-r from-red-700 to-orange-700 bg-clip-text text-transparent">I'm Stuck</span>
              </Button>

              {/* Web Search */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleWebSearch}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Search className="h-4 w-4" />
                <span className="text-xs">Search</span>
              </Button>

              {/* Scholar Lookup */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLookup}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">Scholar</span>
              </Button>
            </div>
          ) : showHighlightColors ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 px-2">Choose highlight color:</p>
              <div className="flex gap-2 px-2">
                {highlightColors.map((item) => (
                  <button
                    key={item.color}
                    onClick={() => handleHighlight(item.color)}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 px-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHighlightColors(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {console.log('🎯 Rendering comment input section, showAnnotation:', true)}
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnnotation(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAnnotate}
                  disabled={!annotationText.trim()}
                >
                  Add Comment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Character count */}
        <div className="px-3 pb-2">
          <p className="text-xs text-gray-500">
            {selectedText.length} characters selected
          </p>
        </div>
      </Card>
    </div>
  )
}
