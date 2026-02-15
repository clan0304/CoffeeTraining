import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCuppingSessionDetail } from '@/actions/cupping'
import { SessionDetailClient } from './session-detail-client'

export default async function CuppingSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/auth')

  const { id } = await params
  const { data, error } = await getCuppingSessionDetail(id)

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <header className="py-4 mb-8">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">Session Details</h1>
          </header>
          <p className="text-muted-foreground">{error || 'Failed to load session'}</p>
        </div>
      </div>
    )
  }

  const { session, samples, playerCount } = data

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4 pt-4">
        <header>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Session Details</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
            <span>
              {new Date(session.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {(session.room_name || session.room_code) && (
              <span>
                {session.room_name || `Room ${session.room_code}`}
              </span>
            )}
            <span>
              {samples.length} coffee{samples.length === 1 ? '' : 's'}
            </span>
            <span>
              {playerCount} player{playerCount === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        <SessionDetailClient data={data} />

        <Link
          href="/dashboard"
          className="block text-center text-sm text-muted-foreground hover:underline py-4"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
