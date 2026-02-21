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
              const aScore = getPlayerScore(a.user_id)
              const bScore = getPlayerScore(b.user_id)
              const aCorrect = aScore?.correct ?? -1
              const bCorrect = bScore?.correct ?? -1
              // More correct answers first
              if (aCorrect !== bCorrect) return bCorrect - aCorrect
              // Same score: faster time first
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

                  {/* Expanded answer details — visual cup layout */}
                  {isExpanded && playerAnswers.length > 0 && (
                    <div className="ml-9 mr-1 mb-2 mt-1 space-y-1">
                      {round.setRows.map((row) => {
                        const answer = playerAnswers.find((a) => a.row_number === row.row_number)
                        const picked = answer?.selected_position ?? null
                        const correctPos = row.odd_position

                        // Build the 3 cups: positions 1, 2, 3
                        const cups = [1, 2, 3].map((pos) => {
                          const isOdd = pos === correctPos
                          const label = isOdd ? row.odd_coffee_label : row.pair_coffee_label
                          const isPicked = pos === picked
                          return { pos, label, isOdd, isPicked }
                        })

                        const isCorrect = answer?.is_correct === true
                        const isWrong = answer?.is_correct === false
                        const noAnswer = picked === null

                        return (
                          <div key={row.row_number} className="flex items-center gap-2 py-1">
                            <span className="w-5 text-xs text-muted-foreground text-right shrink-0">
                              {row.row_number}
                            </span>
                            <div className="flex gap-1 flex-1">
                              {cups.map((cup) => {
                                // Determine cup style
                                let style = 'bg-muted text-muted-foreground border-transparent'
                                if (cup.isPicked && cup.isOdd) {
                                  // Picked correctly
                                  style = 'bg-green-500 text-white border-green-600'
                                } else if (cup.isPicked && !cup.isOdd) {
                                  // Picked wrong
                                  style = 'bg-red-500 text-white border-red-600'
                                } else if (cup.isOdd) {
                                  // Correct answer not picked (show where it was)
                                  style = 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700'
                                }

                                return (
                                  <div
                                    key={cup.pos}
                                    className={`flex-1 h-8 rounded border flex items-center justify-center text-xs font-bold ${style}`}
                                  >
                                    {cup.label}
                                  </div>
                                )
                              })}
                            </div>
                            <span className="w-5 text-center shrink-0">
                              {noAnswer ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : isCorrect ? (
                                <span className="text-xs text-green-600 dark:text-green-400">&#10003;</span>
                              ) : isWrong ? (
                                <span className="text-xs text-red-500 dark:text-red-400">&#10007;</span>
                              ) : null}
                            </span>
                          </div>
                        )
                      })}
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

        {/* Per-row accuracy report */}
        {hasSetRows && hasAnswerData && round.participants.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Row Breakdown</p>
            {round.setRows.map((row) => {
              const answersForRow = round.playerAnswers.filter((a) => a.row_number === row.row_number)
              const correctPlayers = answersForRow.filter((a) => a.is_correct === true)
              const wrongPlayers = answersForRow.filter((a) => a.is_correct === false)
              const totalAnswered = answersForRow.length
              const totalParticipants = round.participants.length
              const correctCount = correctPlayers.length

              const getUsername = (userId: string) =>
                round.participants.find((p) => p.user_id === userId)?.username || 'Unknown'

              const ratio = totalParticipants > 0 ? correctCount / totalParticipants : 0

              return (
                <div key={row.row_number} className="flex items-start gap-2 text-xs">
                  {/* Row number */}
                  <span className="w-5 text-right text-muted-foreground shrink-0 pt-0.5">
                    {row.row_number}
                  </span>

                  {/* Cups preview */}
                  <div className="flex gap-0.5 shrink-0 pt-0.5">
                    {[1, 2, 3].map((pos) => {
                      const isOdd = pos === row.odd_position
                      return (
                        <div
                          key={pos}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                            isOdd
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isOdd ? row.odd_coffee_label : row.pair_coffee_label}
                        </div>
                      )
                    })}
                  </div>

                  {/* Score bar + names */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        ratio === 1 ? 'text-green-600 dark:text-green-400'
                          : ratio >= 0.5 ? 'text-foreground'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {correctCount}/{totalParticipants}
                      </span>
                      {/* Mini bar */}
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ratio === 1 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-orange-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Who got it right */}
                    {correctPlayers.length > 0 && correctPlayers.length < totalParticipants && (
                      <p className="text-muted-foreground mt-0.5 truncate">
                        <span className="text-green-600 dark:text-green-400">&#10003;</span>{' '}
                        {correctPlayers.map((a) => `@${getUsername(a.user_id)}`).join(', ')}
                      </p>
                    )}
                    {/* Who got it wrong — only show when fewer wrong than right */}
                    {wrongPlayers.length > 0 && wrongPlayers.length <= correctPlayers.length && correctPlayers.length < totalParticipants && (
                      <p className="text-muted-foreground mt-0.5 truncate">
                        <span className="text-red-500 dark:text-red-400">&#10007;</span>{' '}
                        {wrongPlayers.map((a) => `@${getUsername(a.user_id)}`).join(', ')}
                      </p>
                    )}
                    {/* Everyone got it right */}
                    {correctCount === totalParticipants && totalParticipants > 1 && (
                      <p className="text-green-600 dark:text-green-400 mt-0.5">Everyone correct</p>
                    )}
                    {/* Nobody got it right */}
                    {correctCount === 0 && totalAnswered > 0 && (
                      <p className="text-red-500 dark:text-red-400 mt-0.5">Nobody correct</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
