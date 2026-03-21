'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScaForm } from '@/components/cupping/sca-form'
import { SimpleForm } from '@/components/cupping/simple-form'
import { DomsForm } from '@/components/cupping/doms-form'
import { SessionReportCard } from '@/components/cupping/session-report-card'
import type { CuppingSessionDetailData, ScaCuppingScores, SimpleCuppingScores, DomsCuppingScores, OthersNotes } from '@cuppingtraining/shared/types'

export function SessionDetailClient({ data }: { data: CuppingSessionDetailData }) {
  const { samples, scores, currentUserProfileId } = data
  
  // Coffee name reveal state - track which coffee names are revealed
  const [revealedCoffees, setRevealedCoffees] = useState<Set<string>>(new Set())
  const [animatingCoffees, setAnimatingCoffees] = useState<Set<string>>(new Set())

  return (
    <div className="space-y-6">

      {/* Coffee containers with player tabs for each coffee */}
      <div className="space-y-6">
        {samples.map((sample) => {
          const sampleScores = scores.filter((s) => s.sampleNumber === sample.sample_number)
          const players = Array.from(
            new Map(sampleScores.map((score) => [score.user_id, { userId: score.user_id, username: score.username }]))
            .values()
          )

          return (
            <Card key={sample.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{sample.coffeeLabel}</span>
                    <div className="relative min-w-[160px] h-12 flex items-center justify-center">
                      {revealedCoffees.has(sample.id) ? (
                        <span 
                          key={`revealed-${sample.id}`}
                          className="text-lg font-medium animate-in fade-in slide-in-from-bottom-2 duration-1000 fill-mode-both"
                        >
                          {sample.coffeeName}
                        </span>
                      ) : animatingCoffees.has(sample.id) ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Scattered particle animation */}
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 bg-primary rounded-full animate-ping"
                              style={{
                                left: `${25 + (i % 4) * 15}%`,
                                top: `${25 + Math.floor(i / 4) * 25}%`,
                                animationDelay: `${i * 100}ms`,
                                animationDuration: '1200ms'
                              }}
                            />
                          ))}
                          {/* Central sparkle */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 text-primary animate-spin">
                              ✨
                            </div>
                          </div>
                          {/* Coffee name fading in */}
                          <span 
                            className="absolute inset-0 flex items-center justify-center text-lg font-medium opacity-0 animate-in fade-in duration-1000 delay-800 fill-mode-forwards"
                            style={{ animationFillMode: 'forwards' }}
                          >
                            {sample.coffeeName}
                          </span>
                        </div>
                      ) : (
                        <button
                          key={`button-${sample.id}`}
                          onClick={() => {
                            setAnimatingCoffees(prev => new Set([...prev, sample.id]))
                            setTimeout(() => {
                              setRevealedCoffees(prev => new Set([...prev, sample.id]))
                              setAnimatingCoffees(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(sample.id)
                                return newSet
                              })
                            }, 1800)
                          }}
                          className="group relative px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                        >
                          <span className="relative z-10 font-medium">✨ Reveal</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      )}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No scores submitted for this coffee.</p>
                  </div>
                ) : (
                  <Tabs defaultValue={players[0]?.userId}>
                    <div className="overflow-x-auto mb-4">
                      <TabsList className="w-max min-w-full">
                        {players.map((player) => {
                          const playerScore = sampleScores.find((s) => s.user_id === player.userId)
                          return (
                            <TabsTrigger
                              key={player.userId}
                              value={player.userId}
                              className="flex-none min-w-fit px-4"
                            >
                              <span>@{player.username}</span>
                              {playerScore && (
                                <span className="ml-2 text-xs text-primary font-bold">
                                  {(playerScore.total_score || 0).toFixed(2)}
                                </span>
                              )}
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>
                    </div>

                    {players.map((player) => {
                      const score = sampleScores.find((s) => s.user_id === player.userId)
                      return (
                        <TabsContent key={player.userId} value={player.userId}>
                          {score ? (
                            score.form_type === 'simple' ? (
                              <SimpleForm
                                scores={score.scores as SimpleCuppingScores}
                                onChange={() => {}}
                                othersNotes={score.user_id === currentUserProfileId ? (score.notes as OthersNotes | null) : null}
                                readOnly
                              />
                            ) : score.form_type === 'doms' ? (
                              <DomsForm
                                scores={score.scores as DomsCuppingScores}
                                onChange={() => {}}
                                othersNotes={score.user_id === currentUserProfileId ? (score.notes as OthersNotes | null) : null}
                                readOnly
                              />
                            ) : (
                              <ScaForm
                                scores={score.scores as ScaCuppingScores}
                                onChange={() => {}}
                                othersNotes={score.user_id === currentUserProfileId ? (score.notes as OthersNotes | null) : null}
                                readOnly
                              />
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No score submitted by this player
                            </p>
                          )}
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Statistics section - shown after individual reviews */}
      <div className="text-center py-4">
        <p className="text-muted-foreground text-lg font-medium">Coffee names revealed</p>
      </div>
      
      {/* Summary card with average scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coffee Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {samples.map((sample) => {
              const sampleScores = scores.filter(
                (s) => s.sampleNumber === sample.sample_number
              )
              const avgScore =
                sampleScores.length > 0
                  ? sampleScores.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                    sampleScores.length
                  : 0

              return (
                <div key={sample.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary mr-2">{sample.coffeeLabel}</span>
                    <span className="font-medium">{sample.coffeeName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{avgScore.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <SessionReportCard samples={samples} scores={scores} />
    </div>
  )
}
