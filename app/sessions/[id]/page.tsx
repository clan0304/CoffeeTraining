import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSessionSummary } from '@/actions/rooms'
import { SessionRoundCard } from './session-round-card'

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function SessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/auth')

  const { id: sessionId } = await params
  const result = await getSessionSummary(sessionId)

  if (result.error || !result.session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8 text-center">
          <h1 className="text-2xl font-bold">Session Not Found</h1>
          <p className="text-muted-foreground">{result.error || 'This session does not exist.'}</p>
          <Link href="/cup-tasters">
            <Button>Back to Cup Tasters</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { session } = result
  const totalRounds = session.rounds.length

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Session Summary</h1>
          <p className="text-sm text-muted-foreground">
            {session.room.name || `Room ${session.room.code}`}
          </p>
        </div>

        {/* Session Info */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(session.started_at)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Rounds</span>
              <span>{totalRounds}</span>
            </div>
            {session.ended_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span>
                  {formatElapsedMs(
                    new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rounds */}
        {session.rounds.map((round) => (
          <SessionRoundCard key={round.id} round={round} />
        ))}

        {totalRounds === 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground text-center">
                No rounds were played in this session.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/rooms/${session.room.id}`} className="flex-1">
            <Button variant="outline" className="w-full">Back to Room</Button>
          </Link>
          <Link href="/cup-tasters" className="flex-1">
            <Button className="w-full">Cup Tasters</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
