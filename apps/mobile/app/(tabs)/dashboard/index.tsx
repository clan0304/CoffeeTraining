import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { AccuracyTrend } from '../../../components/dashboard/AccuracyTrend'
import { CoffeeStats } from '../../../components/dashboard/CoffeeStats'
import { useApiClient } from '../../../lib/api'
import { colors } from '../../../lib/colors'
import type { PlayerDashboardData, CuppingDashboardData } from '@cuppingtraining/shared/types'

type Tab = 'cup-tasters' | 'cupping'

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function DashboardTab() {
  const { apiFetch } = useApiClient()
  const [tab, setTab] = useState<Tab>('cup-tasters')
  const [cupTastersData, setCupTastersData] = useState<PlayerDashboardData | null>(null)
  const [cuppingData, setCuppingData] = useState<CuppingDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const [ct, cu] = await Promise.all([
          apiFetch<PlayerDashboardData>('/dashboard/cup-tasters'),
          apiFetch<CuppingDashboardData>('/dashboard/cupping'),
        ])
        setCupTastersData(ct)
        setCuppingData(cu)
      } catch {
        // silently fail — UI will show empty state
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiFetch]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData(true)
  }, [fetchData])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Dashboard</Text>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'cup-tasters' && styles.tabBtnActive]}
            onPress={() => setTab('cup-tasters')}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === 'cup-tasters' && styles.tabBtnTextActive,
              ]}
            >
              Cup Tasters
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'cupping' && styles.tabBtnActive]}
            onPress={() => setTab('cupping')}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === 'cupping' && styles.tabBtnTextActive,
              ]}
            >
              Cupping
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'cup-tasters' ? (
          <CupTastersContent data={cupTastersData} />
        ) : (
          <CuppingContent data={cuppingData} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Cup Tasters Tab Content ──

function CupTastersContent({ data }: { data: PlayerDashboardData | null }) {
  if (!data || data.overallStats.totalSessions === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Cup Tasters Data</Text>
        <Text style={styles.emptyDesc}>
          Complete some cup tasters sessions to see your stats here.
        </Text>
      </View>
    )
  }

  const { overallStats, accuracyTrend, coffeeStats, sessionHistory } = data

  return (
    <View style={styles.content}>
      {/* Overall Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Sessions" value={String(overallStats.totalSessions)} />
        <StatCard label="Rounds" value={String(overallStats.totalRounds)} />
        <StatCard
          label="Accuracy"
          value={`${overallStats.overallAccuracy}%`}
          sub={`${overallStats.correctAnswers}/${overallStats.totalAnswers}`}
        />
        <StatCard
          label="Best Time"
          value={
            overallStats.bestTimeMs !== null
              ? formatElapsedMs(overallStats.bestTimeMs)
              : '--'
          }
          mono
        />
      </View>

      {overallStats.avgTimeMs !== null && (
        <Card>
          <CardContent style={styles.avgTimeContent}>
            <Text style={styles.avgTimeLabel}>Average Time</Text>
            <Text style={styles.avgTimeValue}>
              {formatElapsedMs(overallStats.avgTimeMs)}
            </Text>
          </CardContent>
        </Card>
      )}

      {/* Accuracy Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <AccuracyTrend points={accuracyTrend} />
        </CardContent>
      </Card>

      {/* Coffee Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Coffee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <CoffeeStats stats={coffeeStats} />
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <Text style={styles.emptyDesc}>No completed sessions yet.</Text>
          ) : (
            <View style={styles.sessionList}>
              {sessionHistory.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {session.room_name || `Room ${session.room_code}`}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' \u00B7 '}
                      {session.round_count} round
                      {session.round_count === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.sessionStats}>
                    {session.accuracy !== null && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              session.accuracy >= 80
                                ? '#dcfce7'
                                : session.accuracy >= 50
                                ? '#fef9c3'
                                : '#fecaca',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                session.accuracy >= 80
                                  ? '#16a34a'
                                  : session.accuracy >= 50
                                  ? '#ca8a04'
                                  : '#dc2626',
                            },
                          ]}
                        >
                          {session.accuracy}%
                        </Text>
                      </View>
                    )}
                    {session.best_time_ms !== null && (
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeValue}>
                          {formatElapsedMs(session.best_time_ms)}
                        </Text>
                        <Text style={styles.timeSub}>best</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  )
}

// ── Cupping Tab Content ──

function CuppingContent({ data }: { data: CuppingDashboardData | null }) {
  if (!data || data.overallStats.totalSessions === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Cupping Data</Text>
        <Text style={styles.emptyDesc}>
          Complete some cupping sessions to see your stats here.
        </Text>
      </View>
    )
  }

  const { overallStats, sessionHistory } = data

  return (
    <View style={styles.content}>
      {/* Overall Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Sessions" value={String(overallStats.totalSessions)} />
        <StatCard
          label="Coffees Scored"
          value={String(overallStats.totalSamplesScored)}
        />
        <StatCard
          label="Avg Score"
          value={
            overallStats.avgTotalScore !== null
              ? overallStats.avgTotalScore.toFixed(2)
              : '--'
          }
          sub={
            overallStats.lowestScore !== null
              ? `Low: ${overallStats.lowestScore.toFixed(2)}`
              : undefined
          }
        />
        <StatCard
          label="Highest"
          value={
            overallStats.highestScore !== null
              ? overallStats.highestScore.toFixed(2)
              : '--'
          }
        />
      </View>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <Text style={styles.emptyDesc}>No cupping sessions yet.</Text>
          ) : (
            <View style={styles.sessionList}>
              {sessionHistory.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {session.room_name ||
                        (session.room_code
                          ? `Room ${session.room_code}`
                          : 'Solo Session')}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' \u00B7 '}
                      {session.sample_count} coffee
                      {session.sample_count === 1 ? '' : 's'}
                      {' \u00B7 '}
                      {session.player_count} player
                      {session.player_count === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {session.avg_score !== null && (
                    <View style={styles.sessionStats}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              session.avg_score >= 85
                                ? '#dcfce7'
                                : session.avg_score >= 75
                                ? '#fef9c3'
                                : '#fecaca',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                session.avg_score >= 85
                                  ? '#16a34a'
                                  : session.avg_score >= 75
                                  ? '#ca8a04'
                                  : '#dc2626',
                            },
                          ]}
                        >
                          {session.avg_score.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.timeSub}>avg</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  )
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  sub,
  mono,
}: {
  label: string
  value: string
  sub?: string
  mono?: boolean
}) {
  return (
    <View style={styles.statCardWrapper}>
      <Card style={{ flex: 1 }}>
        <CardContent style={styles.statContent}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={[styles.statValue, mono && styles.mono]}>{value}</Text>
          {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
        </CardContent>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.foreground,
    paddingTop: 12,
    marginBottom: 16,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  tabBtnTextActive: {
    color: colors.foreground,
    fontWeight: '600',
  },
  // Content
  content: {
    gap: 16,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCardWrapper: {
    width: '47%',
    flexGrow: 1,
  },
  statContent: {
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  statSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  mono: {
    fontFamily: 'Courier',
  },
  // Avg time row
  avgTimeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  avgTimeLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  avgTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    color: colors.foreground,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Session history
  sessionList: {
    gap: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeBlock: {
    alignItems: 'flex-end',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Courier',
    color: colors.foreground,
  },
  timeSub: {
    fontSize: 10,
    color: colors.muted,
  },
})
