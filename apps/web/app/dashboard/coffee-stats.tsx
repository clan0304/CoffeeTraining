'use client'

import { useState } from 'react'
import type { DashboardCoffeeStat } from '@cuppingtraining/shared/types'

type SortKey = 'coffee' | 'seen' | 'accuracy'
type SortDir = 'asc' | 'desc'

export function CoffeeStats({ stats }: { stats: DashboardCoffeeStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = stats.filter((c) => c.timesSeenAsOdd > 0)

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No coffee data yet. Play some rounds to see per-coffee stats.
      </p>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th
              className="py-2 pr-4 font-medium cursor-pointer select-none hover:text-foreground text-muted-foreground"
              onClick={() => toggleSort('coffee')}
            >
              Coffee{arrow('coffee')}
            </th>
            <th
              className="py-2 pr-4 font-medium cursor-pointer select-none hover:text-foreground text-muted-foreground text-center"
              onClick={() => toggleSort('seen')}
            >
              Seen{arrow('seen')}
            </th>
            <th
              className="py-2 font-medium cursor-pointer select-none hover:text-foreground text-muted-foreground"
              onClick={() => toggleSort('accuracy')}
            >
              Accuracy{arrow('accuracy')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((coffee) => {
            const pct = coffee.accuracyWhenOdd
            const barColor =
              pct >= 80
                ? 'bg-green-500'
                : pct >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'

            return (
              <tr key={coffee.coffeeId} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">
                    {coffee.coffeeLabel}
                  </span>
                  <span>{coffee.coffeeName}</span>
                </td>
                <td className="py-2 pr-4 text-center font-mono text-xs">
                  {coffee.timesSeenAsOdd}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs w-16 text-right">
                      {coffee.correctWhenOdd}/{coffee.timesSeenAsOdd}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
