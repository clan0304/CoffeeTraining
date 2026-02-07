'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom } from '@/actions/rooms'

export default function CreateRoomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [timerMinutes, setTimerMinutes] = useState(8)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await createRoom({
      name: name.trim() || null,
      timerMinutes,
    })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if (result.room) {
      router.push(`/rooms/${result.room.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create Room</h1>
          <p className="text-muted-foreground">
            Set up a training room for your team
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Room Settings</CardTitle>
              <CardDescription>
                Configure your training session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., Morning Training"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Timer Duration</Label>
                <p className="text-xs text-muted-foreground">
                  Standard cupping time is 8 minutes
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  {[5, 8, 10, 12].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant={timerMinutes === mins ? 'default' : 'outline'}
                      onClick={() => setTimerMinutes(mins)}
                      className="w-16"
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>
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
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
