'use client'

import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlayerDashboardData, CuppingDashboardData } from '@cuppingtraining/shared/types'

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function DashboardTabs({
  cupTastersData,
  cuppingData,
}: {
  cupTastersData: PlayerDashboardData | null
  cuppingData: CuppingDashboardData | null
}) {
  return (
    <Tabs defaultValue="cup-tasters">
      <TabsList className="w-full">
        <TabsTrigger value="cup-tasters" className="flex-1">Cup Tasters</TabsTrigger>
        <TabsTrigger value="cupping" className="flex-1">Cupping</TabsTrigger>
      </TabsList>

      {/* ── Cup Tasters Tab ── */}
      <TabsContent value="cup-tasters">
        {!cupTastersData ? (
          <p className="text-muted-foreground py-4">No cup tasters data yet.</p>
        ) : (
          <CupTastersContent data={cupTastersData} />
        )}
      </TabsContent>

      {/* ── Cupping Tab ── */}
      <TabsContent value="cupping">
        {!cuppingData ? (
          <p className="text-muted-foreground py-4">No cupping data yet.</p>
        ) : (
          <CuppingContent data={cuppingData} />
        )}
      </TabsContent>
    </Tabs>
  )
}

function CupTastersContent({ data }: { data: PlayerDashboardData }) {
  const { sessionHistory } = data

  return (
    <div className="space-y-8 mt-4">
      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent transition-colors border">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.room_name || `Room ${session.room_code}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' \u00B7 '}
                        {session.round_count} round{session.round_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.accuracy !== null && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            session.accuracy >= 80
                              ? 'bg-green-500/10 text-green-600'
                              : session.accuracy >= 50
                              ? 'bg-yellow-500/10 text-yellow-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {session.accuracy}%
                        </span>
                      )}
                      {session.best_time_ms !== null && (
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium">
                            {formatElapsedMs(session.best_time_ms)}
                          </p>
                          <p className="text-xs text-muted-foreground">best</p>
                        </div>
                      )}
                    </div>
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

function CuppingContent({ data }: { data: CuppingDashboardData }) {
  const { overallStats, sessionHistory } = data

  return (
    <div className="space-y-8 mt-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-3xl font-bold">{overallStats.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Coffees Scored</p>
            <p className="text-3xl font-bold">{overallStats.totalSamplesScored}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-3xl font-bold">
              {overallStats.avgTotalScore !== null
                ? overallStats.avgTotalScore.toFixed(2)
                : '--'}
            </p>
            {overallStats.avgTotalScore !== null && overallStats.lowestScore !== null && (
              <p className="text-xs text-muted-foreground">
                Low: {overallStats.lowestScore.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Highest Score</p>
            <p className="text-3xl font-bold">
              {overallStats.highestScore !== null
                ? overallStats.highestScore.toFixed(2)
                : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cupping sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session) => (
                <Link key={session.id} href={`/cupping/sessions/${session.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent transition-colors border">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.room_name || (session.room_code ? `Room ${session.room_code}` : 'Solo Session')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' \u00B7 '}
                        {session.sample_count} coffee{session.sample_count === 1 ? '' : 's'}
                        {' \u00B7 '}
                        {session.player_count} player{session.player_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.avg_score !== null && (
                        <div className="text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              session.avg_score >= 85
                                ? 'bg-green-500/10 text-green-600'
                                : session.avg_score >= 75
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {session.avg_score.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            avg
                          </p>
                        </div>
                      )}
                    </div>
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
