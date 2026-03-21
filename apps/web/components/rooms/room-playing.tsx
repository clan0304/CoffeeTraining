'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Timer } from '@/components/training/timer'
import { AnswerSheet } from '@/components/training/answer-sheet'
import type { RoomWithDetails } from '@/types/room'

interface RoomPlayingProps {
  room: RoomWithDetails
  isHost: boolean
  answers: (number | null)[]
  finishedPlayers: Array<{ userId: string; username: string; elapsedMs: number }>
  overtimeRows: Set<number>
  isPaused: boolean
  pauseLoading: boolean
  finishLoading: boolean
  finishWarning: boolean
  leaveConfirm: boolean
  leaveLoading: boolean
  onAnswerChange: (rowIndex: number, position: number) => void
  onFinish: (force?: boolean) => void
  onPauseGame: () => void
  onResumeGame: () => void
  onTimeUp: () => void
  setFinishWarning: (warning: boolean) => void
  setLeaveConfirm: (confirm: boolean) => void
  onLeaveRoom: () => void
}

export function RoomPlaying({
  room,
  isHost,
  answers,
  finishedPlayers,
  overtimeRows,
  isPaused,
  pauseLoading,
  finishLoading,
  finishWarning,
  leaveConfirm,
  leaveLoading,
  onAnswerChange,
  onFinish,
  onPauseGame,
  onResumeGame,
  onTimeUp,
  setFinishWarning,
  setLeaveConfirm,
  onLeaveRoom
}: RoomPlayingProps) {
  const answeredCount = answers.filter((a) => a !== null).length

  // Format milliseconds to mm:ss
  const formatElapsedMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{room.name || 'Training Room'}</h1>
          {!isHost && (
            <Button variant="ghost" size="sm" onClick={() => setLeaveConfirm(true)}>
              Exit
            </Button>
          )}
        </div>

        {leaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setLeaveConfirm(false)}>
            <Card className="w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLeaveConfirm(false)}
                className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <CardContent className="pt-6 pb-4">
                <p className="font-medium mb-1">Leave game?</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You can rejoin by navigating back to this room.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setLeaveConfirm(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={() => { setLeaveConfirm(false); onLeaveRoom() }} disabled={leaveLoading}>
                    {leaveLoading ? 'Leaving...' : 'Leave'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Timer
          initialMinutes={room.timer_minutes}
          onTimeUp={onTimeUp}
          startTime={room.timer_started_at || undefined}
          hideControls
          isPaused={isPaused}
        />

        {isHost && (
          <div className="flex justify-center">
            {isPaused ? (
              <Button
                onClick={onResumeGame}
                disabled={pauseLoading}
                size="sm"
              >
                {pauseLoading ? 'Resuming...' : 'Resume'}
              </Button>
            ) : (
              <Button
                onClick={onPauseGame}
                disabled={pauseLoading}
                variant="secondary"
                size="sm"
              >
                {pauseLoading ? 'Pausing...' : 'Pause'}
              </Button>
            )}
          </div>
        )}

        {/* Finished players */}
        {finishedPlayers.length > 0 && (
          <div className="space-y-1">
            {finishedPlayers.map((p) => (
              <p key={p.userId} className="text-sm text-muted-foreground text-center">
                @{p.username} finished in {formatElapsedMs(p.elapsedMs)}
              </p>
            ))}
          </div>
        )}

        <AnswerSheet
          answers={answers}
          onSelect={onAnswerChange}
          mode="guess"
          overtimeRows={overtimeRows}
        />

        <Button
          onClick={() => onFinish()}
          className="w-full"
          disabled={finishLoading}
        >
          {finishLoading ? 'Finishing...' : `Finish (${answeredCount}/8)`}
        </Button>

        {finishWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setFinishWarning(false)}>
            <Card className="border-orange-400 bg-orange-50 w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setFinishWarning(false)}
                className="absolute top-3 right-3 p-1 rounded-md hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <CardContent className="pt-6 pb-4">
                <p className="text-sm font-medium text-orange-700 mb-3">
                  You haven&apos;t answered all rows. Missing:
                </p>
                <div className="flex flex-wrap gap-2">
                  {answers.map((a, i) =>
                    a === null ? (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-800 text-sm font-semibold"
                      >
                        {i + 1}
                      </span>
                    ) : null
                  )}
                </div>
                <Button
                  onClick={() => onFinish(true)}
                  variant="outline"
                  className="w-full mt-4 border-orange-400 text-orange-700 hover:bg-orange-100"
                  size="sm"
                  disabled={finishLoading}
                >
                  {finishLoading ? 'Finishing...' : 'Finish Anyway'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}