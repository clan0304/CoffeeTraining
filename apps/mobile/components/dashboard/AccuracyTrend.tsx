import { View, Text, StyleSheet } from 'react-native'
import type { DashboardAccuracyPoint } from '@cuppingtraining/shared/types'
import { colors } from '../../lib/colors'

const BAR_MAX_HEIGHT = 120

export function AccuracyTrend({ points }: { points: DashboardAccuracyPoint[] }) {
  if (points.length === 0) {
    return (
      <Text style={styles.empty}>
        No round data yet. Play some rounds to see your accuracy trend.
      </Text>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {points.map((point, i) => {
          const height = Math.max(4, (point.accuracy / 100) * BAR_MAX_HEIGHT)
          const isPerfect = point.correct === point.total
          return (
            <View key={point.roundId} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isPerfect ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>R{i + 1}</Text>
            </View>
          )
        })}
      </View>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Perfect</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 20,
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minWidth: 4,
  },
  barLabel: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 4,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.muted,
  },
})
