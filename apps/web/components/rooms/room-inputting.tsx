'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AnswerSheet } from '@/components/training/answer-sheet'
import type { RoomWithDetails } from '@/types/room'

interface RoomInputtingProps {
  room: RoomWithDetails
  isHost: boolean
  answers: (number | null)[]
  correctAnswers: (number | null)[]
  myElapsedMs: number | null
  endRoundConfirm: boolean
  leaveConfirm: boolean
  leaveLoading: boolean
  onCorrectAnswerChange: (rowIndex: number, position: number) => void
  onEndRound: () => void
  setEndRoundConfirm: (confirm: boolean) => void
  setLeaveConfirm: (confirm: boolean) => void
  onLeaveRoom: () => void
}

export function RoomInputting({
  room,
  isHost,
  answers,
  correctAnswers,
  myElapsedMs,
  endRoundConfirm,
  leaveConfirm,
  leaveLoading,
  onCorrectAnswerChange,
  onEndRound,
  setEndRoundConfirm,
  setLeaveConfirm,
  onLeaveRoom
}: RoomInputtingProps) {
  const correctCount = correctAnswers.filter((a) => a !== null).length
  const allRevealed = correctCount === 8

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
          <h1 className="text-xl font-bold">Check Cups</h1>
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

        {/* Show finish time */}
        {myElapsedMs !== null && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <p className="text-center font-medium">
                Finished in <span className="text-primary font-bold">{formatElapsedMs(myElapsedMs)}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {!allRevealed && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-center text-muted-foreground">
                Tap the odd cup for each row to see if you were right
              </p>
            </CardContent>
          </Card>
        )}

        <AnswerSheet
          answers={answers}
          correctAnswers={correctAnswers}
          onSelect={onCorrectAnswerChange}
          mode="input"
        />

        {allRevealed && isHost && (
          <>
            <Button onClick={() => setEndRoundConfirm(true)} className="w-full">
              End Round
            </Button>
            {endRoundConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEndRoundConfirm(false)}>
                <Card className="w-[90%] max-w-sm relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEndRoundConfirm(false)}
                    className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <CardContent className="pt-6 pb-4">
                    <p className="font-medium mb-1">End this round?</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      All players will return to the lobby.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEndRoundConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setEndRoundConfirm(false)
                          onEndRound()
                        }}
                      >
                        End Round
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {allRevealed && !isHost && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Waiting for host to start next round...
          </p>
        )}
      </div>
    </div>
  )
}