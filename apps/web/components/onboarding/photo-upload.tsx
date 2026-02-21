'use client'

import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PhotoUploadProps {
  value: File | null
  onChange: (file: File | null) => void
  previewUrl: string | null
}

export function PhotoUpload({ value, onChange, previewUrl }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setIsCompressing(true)

    try {
      // Compress image to max 1MB
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      })

      // Create preview URL
      const url = URL.createObjectURL(compressedFile)
      setLocalPreview(url)
      onChange(compressedFile)
    } catch (error) {
      console.error('Error compressing image:', error)
      alert('Failed to process image')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleRemove = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
    }
    setLocalPreview(null)
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const displayUrl = localPreview || previewUrl

  return (
    <div className="space-y-3">
      <Label>Profile Photo (Optional)</Label>
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={displayUrl || undefined} alt="Profile photo" />
          <AvatarFallback className="text-2xl">?</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isCompressing}
          >
            {isCompressing ? 'Processing...' : value ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {(value || displayUrl) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="text-xs text-muted-foreground">
        Max 1MB. Will be resized to 800px.
      </p>
    </div>
  )
}
