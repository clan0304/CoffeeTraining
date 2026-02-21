'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCuppingRoom } from '@/actions/cupping'

export default function CreateCuppingRoomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await createCuppingRoom({
      name: name.trim() || null,
    })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if (result.room) {
      router.push(`/cupping/${result.room.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create Cupping Room</h1>
          <p className="text-muted-foreground">
            Host a cupping session for your team
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Room Settings</CardTitle>
              <CardDescription>
                Set up your cupping session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekly Cupping"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3 mt-6">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>

            <div className="text-center">
              <Link href="/cupping" className="text-sm text-muted-foreground hover:underline">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
