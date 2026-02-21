'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface RoundData {
  id: string
  round_number: number
  participants: Array<{ user_id: string; username: string | null; photo_url: string | null }>
  results: Array<{ user_id: string; elapsed_ms: number }>
  coffees: Array<{ label: string; name: string }>
  setRows: Array<{
    row_number: number
    pair_coffee_label: string
    pair_coffee_name: string
    odd_coffee_label: string
    odd_coffee_name: string
    odd_position: number
  }>
  playerAnswers: Array<{
    user_id: string
    row_number: number
    selected_position: number
    is_correct: boolean | null
  }>
}

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SessionRoundCard({ round }: { round: RoundData }) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  const hasAnswerData = round.playerAnswers.length > 0
  const hasCoffees = round.coffees.length > 0
  const hasSetRows = round.setRows.length > 0

  // Calculate score for a player
  const getPlayerScore = (userId: string) => {
    const playerAnswers = round.playerAnswers.filter((a) => a.user_id === userId)
    if (playerAnswers.length === 0) return null
    const correct = playerAnswers.filter((a) => a.is_correct === true).length
    return { correct, total: round.setRows.length || playerAnswers.length }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Round {round.round_number}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coffees used */}
        {hasCoffees && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coffees</p>
            <div className="flex flex-wrap gap-2">
              {round.coffees.map((coffee) => (
                <span
                  key={coffee.label}
                  className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded"
                >
                  <span className="font-bold text-primary">{coffee.label}</span>
                  <span>{coffee.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Participants and their times */}
        <div className="space-y-1">
          {round.participants
            .sort((a, b) => {
              const aResult = round.results.find((r) => r.user_id === a.user_id)
              const bResult = round.results.find((r) => r.user_id === b.user_id)
              if (aResult && bResult) return aResult.elapsed_ms - bResult.elapsed_ms
              if (aResult) return -1
              if (bResult) return 1
              return 0
            })
            .map((participant, idx) => {
              const result = round.results.find((r) => r.user_id === participant.user_id)
              const score = getPlayerScore(participant.user_id)
              const isExpanded = expandedPlayer === participant.user_id
              const playerAnswers = round.playerAnswers
                .filter((a) => a.user_id === participant.user_id)
                .sort((a, b) => a.row_number - b.row_number)

              return (
                <div key={participant.user_id}>
                  <div
                    className={`flex items-center justify-between py-2 border-b last:border-0 ${
                      hasAnswerData && playerAnswers.length > 0 ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1' : ''
                    }`}
                    onClick={() => {
                      if (hasAnswerData && playerAnswers.length > 0) {
                        setExpandedPlayer(isExpanded ? null : participant.user_id)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">
                        {idx + 1}.
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={participant.photo_url || undefined}
                          alt={participant.username || 'User'}
                        />
                        <AvatarFallback>
                          {participant.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        @{participant.username || 'Unknown'}
                      </span>
                      {score && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          score.correct === score.total
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {score.correct}/{score.total}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono ${result ? 'font-medium' : 'text-muted-foreground'}`}>
                        {result ? formatElapsedMs(result.elapsed_ms) : 'DNF'}
                      </span>
                      {hasAnswerData && playerAnswers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {isExpanded ? '\u25B2' : '\u25BC'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded answer details */}
                  {isExpanded && playerAnswers.length > 0 && (
                    <div className="ml-9 mr-1 mb-2 mt-1 rounded bg-muted/30 border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-1.5 px-2 text-left font-medium">Row</th>
                            <th className="py-1.5 px-2 text-left font-medium">Pair</th>
                            <th className="py-1.5 px-2 text-left font-medium">Odd</th>
                            <th className="py-1.5 px-2 text-center font-medium">Pick</th>
                            <th className="py-1.5 px-2 text-center font-medium">Ans</th>
                            <th className="py-1.5 px-2 text-center font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {round.setRows.map((row) => {
                            const answer = playerAnswers.find((a) => a.row_number === row.row_number)
                            return (
                              <tr key={row.row_number} className="border-b last:border-0">
                                <td className="py-1.5 px-2 text-muted-foreground">{row.row_number}</td>
                                <td className="py-1.5 px-2">{row.pair_coffee_label}</td>
                                <td className="py-1.5 px-2 font-medium text-primary">{row.odd_coffee_label}</td>
                                <td className="py-1.5 px-2 text-center font-mono">
                                  {answer ? answer.selected_position : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono">
                                  {row.odd_position}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  {answer ? (
                                    answer.is_correct ? (
                                      <span className="text-green-600 dark:text-green-400">&#10003;</span>
                                    ) : (
                                      <span className="text-red-500 dark:text-red-400">&#10007;</span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {round.participants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No participants recorded
          </p>
        )}
      </CardContent>
    </Card>
  )
}
