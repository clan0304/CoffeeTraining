import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import { Timer } from '../../../components/training/Timer'
import { Countdown } from '../../../components/training/Countdown'
import { AnswerSheet } from '../../../components/training/AnswerSheet'
import { colors } from '../../../lib/colors'

type GameState = 'setup' | 'countdown' | 'playing' | 'inputting' | 'finished'

export default function SoloCupTastersScreen() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>('setup')
  const [timerMinutes, setTimerMinutes] = useState(8)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(8).fill(null))
  const [correctAnswers, setCorrectAnswers] = useState<(number | null)[]>(
    Array(8).fill(null)
  )
  const [isOvertime, setIsOvertime] = useState(false)
  const [overtimeRows, setOvertimeRows] = useState<Set<number>>(new Set())
  const [submitWarning, setSubmitWarning] = useState(false)

  const handleStart = useCallback(() => {
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setGameState('countdown')
  }, [])

  const handleCountdownComplete = useCallback(() => {
    setGameState('playing')
  }, [])

  const handleTimeUp = useCallback(() => {
    setIsOvertime(true)
  }, [])

  const handleSubmitAnswers = useCallback(() => {
    const unanswered = answers.filter((a) => a === null).length
    if (unanswered > 0) {
      setSubmitWarning(true)
      return
    }
    setSubmitWarning(false)
    setGameState('inputting')
  }, [answers])

  const handleAnswerChange = useCallback(
    (rowIndex: number, position: number) => {
      setSubmitWarning(false)
      setAnswers((prev) => {
        const newAnswers = [...prev]
        newAnswers[rowIndex] = prev[rowIndex] === position ? null : position
        return newAnswers
      })
      setIsOvertime((currentOvertime) => {
        if (currentOvertime) {
          setOvertimeRows((prev) => {
            const next = new Set(prev)
            next.add(rowIndex)
            return next
          })
        }
        return currentOvertime
      })
    },
    []
  )

  const handleCorrectAnswerChange = useCallback(
    (rowIndex: number, position: number) => {
      setCorrectAnswers((prev) => {
        const newCorrect = [...prev]
        newCorrect[rowIndex] = prev[rowIndex] === position ? null : position
        return newCorrect
      })
    },
    []
  )

  const handleReset = useCallback(() => {
    setGameState('setup')
    setAnswers(Array(8).fill(null))
    setCorrectAnswers(Array(8).fill(null))
    setIsOvertime(false)
    setOvertimeRows(new Set())
    setSubmitWarning(false)
  }, [])

  const answeredCount = answers.filter((a) => a !== null).length
  const correctCount = correctAnswers.filter((a) => a !== null).length
  const allRevealed = correctCount === 8

  // Setup
  if (gameState === 'setup') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerCenter}>
            <Text style={styles.pageTitle}>Solo Practice</Text>
            <Text style={styles.pageSubtitle}>
              Train your palate with triangulation tests
            </Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Timer Duration</CardTitle>
              <CardDescription>Standard cupping time is 8 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <View style={styles.timerOptions}>
                {[5, 8, 10, 12].map((mins) => (
                  <Button
                    key={mins}
                    variant={timerMinutes === mins ? 'default' : 'outline'}
                    onPress={() => setTimerMinutes(mins)}
                    style={styles.timerButton}
                  >
                    {mins}m
                  </Button>
                ))}
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent style={styles.instructions}>
              <Text style={styles.step}>
                <Text style={styles.stepBold}>1. Taste</Text> - Start timer and
                taste your samples
              </Text>
              <Text style={styles.step}>
                <Text style={styles.stepBold}>2. Mark</Text> - Select which cup
                you think is odd for each row
              </Text>
              <Text style={styles.step}>
                <Text style={styles.stepBold}>3. Submit</Text> - Lock your
                answers when ready
              </Text>
              <Text style={styles.step}>
                <Text style={styles.stepBold}>4. Check</Text> - Check each cup
                and see your result instantly
              </Text>
            </CardContent>
          </Card>

          <Button onPress={handleStart} size="lg">
            Start Practice
          </Button>

          <Button
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Countdown overlay
  if (gameState === 'countdown') {
    return <Countdown from={5} onComplete={handleCountdownComplete} />
  }

  // Playing
  if (gameState === 'playing') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Taste & Mark</Text>
            <Button variant="ghost" size="sm" onPress={handleReset}>
              Exit
            </Button>
          </View>

          <Timer initialMinutes={timerMinutes} onTimeUp={handleTimeUp} />

          <AnswerSheet
            answers={answers}
            onSelect={handleAnswerChange}
            mode="guess"
            overtimeRows={overtimeRows}
          />

          <Button
            onPress={handleSubmitAnswers}
            disabled={answeredCount === 0}
          >
            Submit Answers ({answeredCount}/8)
          </Button>

          {submitWarning && (
            <Card>
              <CardContent style={styles.warningCard}>
                <Text style={styles.warningText}>
                  You haven't answered all rows. Missing:
                </Text>
                <View style={styles.missingRows}>
                  {answers.map((a, i) =>
                    a === null ? (
                      <View key={i} style={styles.missingBadge}>
                        <Text style={styles.missingBadgeText}>{i + 1}</Text>
                      </View>
                    ) : null
                  )}
                </View>
                <Button
                  onPress={() => {
                    setSubmitWarning(false)
                    setGameState('inputting')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Submit Anyway
                </Button>
              </CardContent>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Inputting - checking cups
  if (gameState === 'inputting') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Check Cups</Text>
            {allRevealed && (
              <Button variant="ghost" size="sm" onPress={handleReset}>
                Done
              </Button>
            )}
          </View>

          {!allRevealed && (
            <Card>
              <CardContent style={styles.hintCard}>
                <Text style={styles.hintText}>
                  Tap the odd cup for each row to see if you were right
                </Text>
              </CardContent>
            </Card>
          )}

          <AnswerSheet
            answers={answers}
            correctAnswers={correctAnswers}
            onSelect={handleCorrectAnswerChange}
            mode="input"
          />

          {allRevealed && (
            <View style={styles.bottomButtons}>
              <Button onPress={handleReset}>Practice Again</Button>
              <Button variant="outline" onPress={() => router.back()}>
                Back to Hub
              </Button>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Finished (fallback)
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <AnswerSheet
          answers={answers}
          correctAnswers={correctAnswers}
          onSelect={() => {}}
          disabled
          showResults
          mode="result"
        />
        <View style={styles.bottomButtons}>
          <Button onPress={handleReset}>Practice Again</Button>
          <Button variant="outline" onPress={() => router.back()}>
            Back to Hub
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  headerCenter: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  timerOptions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  timerButton: {
    minWidth: 56,
  },
  instructions: {
    gap: 8,
  },
  step: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  stepBold: {
    fontWeight: '600',
    color: colors.foreground,
  },
  backButton: {
    alignSelf: 'center',
  },
  hintCard: {
    padding: 12,
  },
  hintText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  bottomButtons: {
    gap: 8,
  },
  warningCard: {
    padding: 12,
    gap: 10,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.orange,
  },
  missingRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  missingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
})
