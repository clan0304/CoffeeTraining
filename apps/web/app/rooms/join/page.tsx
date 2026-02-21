'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinRoomByCode } from '@/actions/rooms'

export default function JoinRoomPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    const result = await joinRoomByCode(code.trim())

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if (result.room) {
      router.push(`/rooms/${result.room.id}`)
    }
  }

  // Format input to uppercase and limit to 6 characters
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Join Room</h1>
          <p className="text-muted-foreground">
            Enter a 6-character room code to join
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Room Code</CardTitle>
              <CardDescription>
                Ask the host for the room code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="sr-only">Room Code</Label>
                <Input
                  id="code"
                  placeholder="XXXXXX"
                  value={code}
                  onChange={handleCodeChange}
                  className="text-center text-2xl font-mono tracking-widest h-14"
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
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
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Joining...' : 'Join Room'}
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
