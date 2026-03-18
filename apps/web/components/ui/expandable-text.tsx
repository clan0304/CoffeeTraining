'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from './button'

interface ExpandableTextProps {
  text: string
  maxLines?: number
  className?: string
}

export function ExpandableText({ 
  text, 
  maxLines = 4, 
  className = '' 
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if text overflows the max lines
    if (measureRef.current) {
      const lineHeight = parseFloat(getComputedStyle(measureRef.current).lineHeight)
      const maxHeight = lineHeight * maxLines
      const actualHeight = measureRef.current.scrollHeight
      
      setIsOverflowing(actualHeight > maxHeight)
    }
  }, [text, maxLines])

  if (!text) return null

  return (
    <div className={className}>
      {/* Hidden element to measure full text height */}
      <div
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none break-words text-sm leading-relaxed"
        style={{ 
          width: textRef.current?.offsetWidth || 'auto',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {text}
      </div>
      
      {/* Visible text */}
      <div
        ref={textRef}
        className="break-words text-sm leading-relaxed text-foreground"
        style={{
          display: !isExpanded && isOverflowing ? '-webkit-box' : 'block',
          WebkitLineClamp: !isExpanded && isOverflowing ? maxLines : undefined,
          WebkitBoxOrient: !isExpanded && isOverflowing ? 'vertical' : undefined,
          overflow: !isExpanded && isOverflowing ? 'hidden' : 'visible',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {text}
      </div>
      
      {/* Show more/less button */}
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {isExpanded ? (
            <span className="flex items-center gap-1">
              Show less
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
              </svg>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Show more
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </span>
          )}
        </button>
      )}
    </div>
  )
}