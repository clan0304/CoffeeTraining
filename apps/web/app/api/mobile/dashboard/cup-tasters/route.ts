import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type {
  DashboardOverallStats,
  DashboardAccuracyPoint,
  DashboardCoffeeStat,
  DashboardSessionHistory,
  PlayerDashboardData,
} from '@cuppingtraining/shared/types'

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = createAdminSupabaseClient()

    // Step 1: Fetch user's answers, results, and participations in parallel
    const [answersRes, resultsRes, participationsRes] = await Promise.all([
      supabase
        .from('player_answers')
        .select('id, set_id, row_number, selected_position, is_correct, session_round_id')
        .eq('user_id', profileId),
      supabase
        .from('round_results')
        .select('id, room_id, elapsed_ms, session_round_id')
        .eq('user_id', profileId),
      supabase
        .from('round_participants')
        .select('round_id')
        .eq('user_id', profileId),
    ])

    const answers = answersRes.data || []
    const results = resultsRes.data || []
    const participations = participationsRes.data || []

    // If no data at all, return empty dashboard
    if (answers.length === 0 && results.length === 0 && participations.length === 0) {
      return NextResponse.json({
        overallStats: {
          totalSessions: 0, totalRounds: 0, totalAnswers: 0,
          correctAnswers: 0, overallAccuracy: 0,
          bestTimeMs: null, avgTimeMs: null,
        },
        accuracyTrend: [],
        coffeeStats: [],
        sessionHistory: [],
      } satisfies PlayerDashboardData)
    }

    // Step 2: Fetch session_rounds and room_set_rows in parallel
    const roundIds = [...new Set(participations.map((p) => p.round_id))]
    const setIds = [...new Set(answers.map((a) => a.set_id))]

    const [roundsRes, setRowsRes] = await Promise.all([
      roundIds.length > 0
        ? supabase
            .from('session_rounds')
            .select('id, session_id, round_number, set_id, started_at')
            .in('id', roundIds)
        : Promise.resolve({ data: [] as Array<{ id: string; session_id: string; round_number: number; set_id: string | null; started_at: string | null }> }),
      setIds.length > 0
        ? supabase
            .from('room_set_rows')
            .select('id, set_id, row_number, pair_coffee_id, odd_coffee_id')
            .in('set_id', setIds)
        : Promise.resolve({ data: [] as Array<{ id: string; set_id: string; row_number: number; pair_coffee_id: string; odd_coffee_id: string }> }),
    ])

    const sessionRounds = (roundsRes.data || []) as Array<{ id: string; session_id: string; round_number: number; set_id: string | null; started_at: string | null }>
    const setRows = (setRowsRes.data || []) as Array<{ id: string; set_id: string; row_number: number; pair_coffee_id: string; odd_coffee_id: string }>

    // Step 3: Fetch game_sessions and room_coffees in parallel
    const sessionIds = [...new Set(sessionRounds.map((r) => r.session_id))]
    const coffeeIds = new Set<string>()
    for (const row of setRows) {
      coffeeIds.add(row.pair_coffee_id)
      coffeeIds.add(row.odd_coffee_id)
    }
    const coffeeIdArray = [...coffeeIds]

    const [sessionsRes, coffeesRes] = await Promise.all([
      sessionIds.length > 0
        ? supabase
            .from('game_sessions')
            .select('id, room_id, started_at, ended_at')
            .in('id', sessionIds)
        : Promise.resolve({ data: [] as Array<{ id: string; room_id: string; started_at: string; ended_at: string | null }> }),
      coffeeIdArray.length > 0
        ? supabase
            .from('room_coffees')
            .select('id, label, name')
            .in('id', coffeeIdArray)
        : Promise.resolve({ data: [] as Array<{ id: string; label: string; name: string }> }),
    ])

    const sessions = (sessionsRes.data || []) as Array<{ id: string; room_id: string; started_at: string; ended_at: string | null }>
    const coffees = (coffeesRes.data || []) as Array<{ id: string; label: string; name: string }>

    // Step 4: Fetch rooms
    const roomIds = [...new Set(sessions.map((s) => s.room_id))]
    let rooms: Array<{ id: string; name: string | null; code: string }> = []
    if (roomIds.length > 0) {
      const roomsRes = await supabase
        .from('rooms')
        .select('id, name, code')
        .in('id', roomIds)
      rooms = (roomsRes.data || []) as Array<{ id: string; name: string | null; code: string }>
    }

    // Build lookup maps
    const coffeeMap = new Map(coffees.map((c) => [c.id, c]))
    const sessionMap = new Map(sessions.map((s) => [s.id, s]))
    const roomMap = new Map(rooms.map((r) => [r.id, r]))
    const roundMap = new Map(sessionRounds.map((r) => [r.id, r]))

    // ---- Compute Overall Stats ----
    const totalAnswers = answers.length
    const correctAnswers = answers.filter((a) => a.is_correct === true).length
    const overallAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
    const completedSessions = sessions.filter((s) => s.ended_at !== null)
    const bestTimeMs = results.length > 0 ? Math.min(...results.map((r) => r.elapsed_ms)) : null
    const avgTimeMs = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.elapsed_ms, 0) / results.length)
      : null

    const overallStats: DashboardOverallStats = {
      totalSessions: completedSessions.length,
      totalRounds: roundIds.length,
      totalAnswers,
      correctAnswers,
      overallAccuracy,
      bestTimeMs,
      avgTimeMs,
    }

    // ---- Compute Accuracy Trend (last 20 rounds) ----
    const answersByRound = new Map<string, typeof answers>()
    for (const a of answers) {
      if (!a.session_round_id) continue
      const arr = answersByRound.get(a.session_round_id) || []
      arr.push(a)
      answersByRound.set(a.session_round_id, arr)
    }

    const accuracyPoints: DashboardAccuracyPoint[] = []
    for (const [roundId, roundAnswers] of answersByRound) {
      const round = roundMap.get(roundId)
      if (!round) continue
      const session = sessionMap.get(round.session_id)
      if (!session) continue

      const total = roundAnswers.length
      const correct = roundAnswers.filter((a) => a.is_correct === true).length
      accuracyPoints.push({
        roundId,
        roundNumber: round.round_number,
        sessionStartedAt: session.started_at,
        correct,
        total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      })
    }

    accuracyPoints.sort((a, b) => a.sessionStartedAt.localeCompare(b.sessionStartedAt))
    const accuracyTrend = accuracyPoints.slice(-20)

    // ---- Compute Per-Coffee Stats ----
    const setRowsBySetAndRow = new Map<string, (typeof setRows)[0]>()
    for (const row of setRows) {
      setRowsBySetAndRow.set(`${row.set_id}:${row.row_number}`, row)
    }

    const coffeeStatsMap = new Map<string, {
      coffeeId: string; coffeeName: string; coffeeLabel: string
      timesSeenAsOdd: number; correctWhenOdd: number; timesSeenAsPair: number
    }>()

    for (const a of answers) {
      const setRow = setRowsBySetAndRow.get(`${a.set_id}:${a.row_number}`)
      if (!setRow) continue

      const oddCoffee = coffeeMap.get(setRow.odd_coffee_id)
      const pairCoffee = coffeeMap.get(setRow.pair_coffee_id)

      if (oddCoffee) {
        const existing = coffeeStatsMap.get(oddCoffee.id) || {
          coffeeId: oddCoffee.id, coffeeName: oddCoffee.name, coffeeLabel: oddCoffee.label,
          timesSeenAsOdd: 0, correctWhenOdd: 0, timesSeenAsPair: 0,
        }
        existing.timesSeenAsOdd++
        if (a.is_correct === true) existing.correctWhenOdd++
        coffeeStatsMap.set(oddCoffee.id, existing)
      }

      if (pairCoffee) {
        const existing = coffeeStatsMap.get(pairCoffee.id) || {
          coffeeId: pairCoffee.id, coffeeName: pairCoffee.name, coffeeLabel: pairCoffee.label,
          timesSeenAsOdd: 0, correctWhenOdd: 0, timesSeenAsPair: 0,
        }
        existing.timesSeenAsPair++
        coffeeStatsMap.set(pairCoffee.id, existing)
      }
    }

    const coffeeStats: DashboardCoffeeStat[] = [...coffeeStatsMap.values()].map((c) => ({
      ...c,
      accuracyWhenOdd: c.timesSeenAsOdd > 0 ? Math.round((c.correctWhenOdd / c.timesSeenAsOdd) * 100) : 0,
    }))

    // ---- Compute Session History ----
    const roundsBySession = new Map<string, typeof sessionRounds>()
    for (const r of sessionRounds) {
      const arr = roundsBySession.get(r.session_id) || []
      arr.push(r)
      roundsBySession.set(r.session_id, arr)
    }

    const resultsByRound = new Map<string, typeof results>()
    for (const r of results) {
      if (!r.session_round_id) continue
      const arr = resultsByRound.get(r.session_round_id) || []
      arr.push(r)
      resultsByRound.set(r.session_round_id, arr)
    }

    const sessionHistory: DashboardSessionHistory[] = completedSessions.map((session) => {
      const room = roomMap.get(session.room_id)
      const rounds = roundsBySession.get(session.id) || []
      const roundIdsInSession = rounds.map((r) => r.id)

      let sessionCorrect = 0
      let sessionTotal = 0
      for (const rId of roundIdsInSession) {
        const roundAnswers = answersByRound.get(rId) || []
        sessionTotal += roundAnswers.length
        sessionCorrect += roundAnswers.filter((a) => a.is_correct === true).length
      }

      const sessionResults = roundIdsInSession.flatMap((rId) => resultsByRound.get(rId) || [])
      const bestTime = sessionResults.length > 0
        ? Math.min(...sessionResults.map((r) => r.elapsed_ms))
        : null

      return {
        id: session.id,
        room_name: room?.name || null,
        room_code: room?.code || '',
        started_at: session.started_at,
        ended_at: session.ended_at!,
        round_count: rounds.length,
        best_time_ms: bestTime,
        accuracy: sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null,
      }
    }).sort((a, b) => b.started_at.localeCompare(a.started_at))

    return NextResponse.json({
      overallStats,
      accuracyTrend,
      coffeeStats,
      sessionHistory,
    } satisfies PlayerDashboardData)
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
