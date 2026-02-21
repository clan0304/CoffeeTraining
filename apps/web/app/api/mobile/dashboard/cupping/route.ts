import { NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/api/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { CuppingDashboardData } from '@cuppingtraining/shared/types'

export async function GET(request: Request) {
  try {
    const { profileId } = await getAuthenticatedProfile(request)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = createAdminSupabaseClient()

    // Get all cupping scores for this user
    const { data: userScores } = await supabase
      .from('cupping_scores')
      .select('id, sample_id, total_score')
      .eq('user_id', profileId)

    if (!userScores || userScores.length === 0) {
      return NextResponse.json({
        overallStats: {
          totalSessions: 0,
          totalSamplesScored: 0,
          avgTotalScore: null,
          highestScore: null,
          lowestScore: null,
        },
        sessionHistory: [],
      } satisfies CuppingDashboardData)
    }

    // Get sample IDs to find sessions
    const sampleIds = userScores.map((s) => s.sample_id)

    const { data: samples } = await supabase
      .from('cupping_samples')
      .select('id, session_id, sample_number, sample_label')
      .in('id', sampleIds)

    if (!samples) {
      return NextResponse.json({ error: 'Failed to load samples' }, { status: 500 })
    }

    // Get unique session IDs
    const sessionIds = [...new Set(samples.map((s) => s.session_id))]

    const { data: sessions } = await supabase
      .from('cupping_sessions')
      .select('id, room_id, created_at')
      .in('id', sessionIds)
      .order('created_at', { ascending: false })

    if (!sessions) {
      return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
    }

    // Get room info
    const roomIds = sessions.map((s) => s.room_id).filter(Boolean) as string[]
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, code')
      .in('id', roomIds.length > 0 ? roomIds : ['_none_'])

    const roomMap = new Map(rooms?.map((r) => [r.id, r]) || [])

    // Get all scores for the samples (to count distinct players per session)
    const { data: allScores } = await supabase
      .from('cupping_scores')
      .select('id, sample_id, user_id, total_score')
      .in('sample_id', sampleIds)

    // Build per-session sample map
    const sessionSampleMap = new Map<string, string[]>()
    for (const sample of samples) {
      const existing = sessionSampleMap.get(sample.session_id) || []
      existing.push(sample.id)
      sessionSampleMap.set(sample.session_id, existing)
    }

    // Overall stats
    const totalScores = userScores
      .map((s) => s.total_score)
      .filter((s): s is number => s !== null)

    const overallStats = {
      totalSessions: sessionIds.length,
      totalSamplesScored: userScores.length,
      avgTotalScore:
        totalScores.length > 0
          ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100
          : null,
      highestScore: totalScores.length > 0 ? Math.max(...totalScores) : null,
      lowestScore: totalScores.length > 0 ? Math.min(...totalScores) : null,
    }

    // Build session history
    const sessionHistory = sessions.map((session) => {
      const sessionSampleIds = sessionSampleMap.get(session.id) || []
      const room = session.room_id ? roomMap.get(session.room_id) : null

      const sessionUserScores = userScores.filter((s) =>
        sessionSampleIds.includes(s.sample_id)
      )
      const sessionTotalScores = sessionUserScores
        .map((s) => s.total_score)
        .filter((s): s is number => s !== null)

      const playerIds = new Set(
        (allScores || [])
          .filter((s) => sessionSampleIds.includes(s.sample_id))
          .map((s) => s.user_id)
      )

      return {
        id: session.id,
        room_name: room?.name || null,
        room_code: room?.code || null,
        created_at: session.created_at,
        sample_count: sessionSampleIds.length,
        avg_score:
          sessionTotalScores.length > 0
            ? Math.round(
                (sessionTotalScores.reduce((a, b) => a + b, 0) / sessionTotalScores.length) * 100
              ) / 100
            : null,
        player_count: playerIds.size,
      }
    })

    return NextResponse.json({
      overallStats,
      sessionHistory,
    } satisfies CuppingDashboardData)
  } catch (res) {
    if (res instanceof Response) return res
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
