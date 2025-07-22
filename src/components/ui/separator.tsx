import React from 'react'

interface SeparatorProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export const Separator: React.FC<SeparatorProps> = ({ 
  className = '', 
  orientation = 'horizontal' 
}) => {
  const baseClasses = orientation === 'horizontal' 
    ? 'h-px w-full bg-gray-200' 
    : 'w-px h-full bg-gray-200'
    
  return <div className={`${baseClasses} ${className}`} />
} 