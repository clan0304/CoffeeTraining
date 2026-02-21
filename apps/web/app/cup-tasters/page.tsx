import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InvitationsList } from '@/components/rooms/invitations-list'
import { getMySessionHistory } from '@/actions/rooms'
import { LocalDate } from '@/app/sessions/[id]/local-date'

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function SessionHistory() {
  const result = await getMySessionHistory()
  const sessions = result.sessions || []

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your History</CardTitle>
          <CardDescription>
            View your past training sessions and scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No training sessions yet. Start practicing!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent transition-colors border">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.room_name || `Room ${session.room_code}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <LocalDate
                          dateStr={session.started_at}
                          options={{ month: 'short', day: 'numeric', year: 'numeric' }}
                        />
                        {' \u00B7 '}
                        {session.round_count} round{session.round_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    {session.best_time_ms !== null && (
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium">
                          {formatElapsedMs(session.best_time_ms)}
                        </p>
                        <p className="text-xs text-muted-foreground">best</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default async function CupTastersPage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="py-4 mb-8">
          <h1 className="text-2xl font-bold">Cup Tasters</h1>
          <p className="text-muted-foreground">
            Triangulation training for coffee cupping
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/solo">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Solo Practice</CardTitle>
                <CardDescription>
                  Quick practice with timer and answer sheet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Start</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rooms/create">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Create Room</CardTitle>
                <CardDescription>
                  Host a training session for your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Create</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rooms/join">
            <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg">Join Room</CardTitle>
                <CardDescription>
                  Enter a room code to join a session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">Join</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Authenticated-only sections */}
        {userId && (
          <>
            <InvitationsList />
            <SessionHistory />
          </>
        )}
      </div>
    </div>
  )
}
