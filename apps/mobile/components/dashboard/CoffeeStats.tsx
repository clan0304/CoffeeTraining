import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { DashboardCoffeeStat } from '@cuppingtraining/shared/types'
import { colors } from '../../lib/colors'

type SortKey = 'coffee' | 'seen' | 'accuracy'
type SortDir = 'asc' | 'desc'

export function CoffeeStats({ stats }: { stats: DashboardCoffeeStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = stats.filter((c) => c.timesSeenAsOdd > 0)

  if (filtered.length === 0) {
    return (
      <Text style={styles.empty}>
        No coffee data yet. Play some rounds to see per-coffee stats.
      </Text>
    )
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'accuracy' ? 'asc' : 'desc')
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'coffee':
        cmp = a.coffeeLabel.localeCompare(b.coffeeLabel)
        break
      case 'seen':
        cmp = a.timesSeenAsOdd - b.timesSeenAsOdd
        break
      case 'accuracy':
        cmp = a.accuracyWhenOdd - b.accuracyWhenOdd
        break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const arrow = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.coffeeCol}
          onPress={() => toggleSort('coffee')}
        >
          <Text style={styles.headerText}>Coffee{arrow('coffee')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.seenCol}
          onPress={() => toggleSort('seen')}
        >
          <Text style={[styles.headerText, { textAlign: 'center' }]}>
            Seen{arrow('seen')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.accuracyCol}
          onPress={() => toggleSort('accuracy')}
        >
          <Text style={styles.headerText}>Accuracy{arrow('accuracy')}</Text>
        </TouchableOpacity>
      </View>

      {/* Rows */}
      {sorted.map((coffee, i) => {
        const pct = coffee.accuracyWhenOdd
        const barColor =
          pct >= 80
            ? colors.success
            : pct >= 50
            ? colors.warning
            : colors.error

        return (
          <View
            key={coffee.coffeeId}
            style={[
              styles.row,
              i < sorted.length - 1 && styles.rowBorder,
            ]}
          >
            <View style={styles.coffeeCol}>
              <Text style={styles.coffeeLabel}>{coffee.coffeeLabel}</Text>
              <Text style={styles.coffeeName} numberOfLines={1}>
                {coffee.coffeeName}
              </Text>
            </View>
            <View style={styles.seenCol}>
              <Text style={styles.seenText}>{coffee.timesSeenAsOdd}</Text>
            </View>
            <View style={styles.accuracyCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              <Text style={styles.fractionText}>
                {coffee.correctWhenOdd}/{coffee.timesSeenAsOdd}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  coffeeCol: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  seenCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyCol: {
    flex: 3,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  coffeeLabel: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: colors.muted,
    marginRight: 4,
  },
  coffeeName: {
    fontSize: 13,
    color: colors.foreground,
    flex: 1,
  },
  seenText: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: colors.foreground,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  fractionText: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: colors.muted,
    textAlign: 'right',
  },
})
