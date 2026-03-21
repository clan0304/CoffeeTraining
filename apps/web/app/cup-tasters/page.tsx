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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-size-[64px_64px] opacity-30"></div>
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 min-h-screen p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <header className="py-4 mb-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 font-ubuntu">
              <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Cup Tasters
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Triangulation training for coffee cupping - Perfect your sensory skills
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            <Link href="/solo" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/50 h-48 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors font-ubuntu">Solo Practice</h3>
                  <p className="text-gray-300 text-sm">Quick practice with timer and answer sheet</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                    Start
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/rooms/create" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/50 h-48 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors font-ubuntu">Create Room</h3>
                  <p className="text-gray-300 text-sm">Host a training session for your team</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                    Create
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/rooms/join" className="group">
              <div className="relative p-6 rounded-3xl bg-linear-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-indigo-500/50 h-48 flex flex-col justify-between">
                {/* Glowing Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-px rounded-3xl bg-linear-to-br from-gray-900/80 to-gray-800/50 group-hover:from-gray-900/60 group-hover:to-gray-800/30 transition-all duration-500"></div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors font-ubuntu">Join Room</h3>
                  <p className="text-gray-300 text-sm">Enter a room code to join a session</p>
                </div>
                
                <div className="relative z-10">
                  <div className="w-full py-2 px-4 bg-linear-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-300 font-semibold rounded-xl text-center transition-all duration-300 group-hover:scale-105">
                    Join
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Authenticated-only sections */}
          {userId && (
            <div className="relative z-10">
              <InvitationsList />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
