'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotoUpload } from './photo-upload'
import { completeOnboarding, checkUsernameAvailability, uploadProfilePhoto } from '@/actions/onboarding'

export function OnboardingForm() {
  const router = useRouter()
  const { session } = useSession()
  const { user } = useUser()

  const [photo, setPhoto] = useState<File | null>(null)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const validateUsername = (value: string) => {
    if (!value) {
      return 'Username is required'
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters'
    }
    if (value.length > 30) {
      return 'Username must be less than 30 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    return null
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)
    setUsernameError(validateUsername(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate username
    const validationError = validateUsername(username)
    if (validationError) {
      setUsernameError(validationError)
      return
    }

    setIsSubmitting(true)
    setGeneralError(null)

    try {
      // Check username availability
      const isAvailable = await checkUsernameAvailability(username)
      if (!isAvailable) {
        setUsernameError('Username is already taken')
        setIsSubmitting(false)
        return
      }

      // Upload photo if provided
      let photoUrl: string | null = null
      if (photo && session) {
        const token = await session.getToken({ template: 'supabase' })
        if (token) {
          const uploadResult = await uploadProfilePhoto(photo, token)
          if (uploadResult.error) {
            setGeneralError(uploadResult.error)
            setIsSubmitting(false)
            return
          }
          photoUrl = uploadResult.url || null
        }
      }

      // Complete onboarding
      const result = await completeOnboarding({
        username,
        bio: bio.trim() || null,
        photoUrl,
      })

      if (result.error) {
        setGeneralError(result.error)
        setIsSubmitting(false)
        return
      }

      // Update Clerk user metadata
      await user?.update({
        unsafeMetadata: {
          onboardingComplete: true,
        },
      })

      // Force session refresh to update claims
      await session?.reload()

      // Redirect to home
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Onboarding error:', error)
      setGeneralError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your profile to get started with cupping training
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PhotoUpload
              value={photo}
              onChange={setPhoto}
              previewUrl={null}
            />

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                className={usernameError ? 'border-destructive' : ''}
              />
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500
              </p>
            </div>

            {generalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{generalError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !!usernameError}
            >
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
