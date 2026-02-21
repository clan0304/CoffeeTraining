'use client'

import type { DashboardAccuracyPoint } from '@cuppingtraining/shared/types'

export function AccuracyTrend({ points }: { points: DashboardAccuracyPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No round data yet. Play some rounds to see your accuracy trend.
      </p>
    )
  }

  const maxHeight = 128 // px

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height: maxHeight }}>
        {points.map((point) => {
          const height = Math.max(4, (point.accuracy / 100) * maxHeight)
          const isPerfect = point.correct === point.total
          return (
            <div
              key={point.roundId}
              className="group relative flex-1 flex items-end justify-center"
              style={{ height: maxHeight }}
            >
              <div
                className={`w-full rounded-t-sm transition-colors ${
                  isPerfect
                    ? 'bg-green-500'
                    : 'bg-primary'
                }`}
                style={{ height }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs font-mono whitespace-nowrap shadow-md z-10">
                {point.correct}/{point.total}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {points.map((point, i) => (
          <div
            key={point.roundId}
            className="flex-1 text-center text-[10px] text-muted-foreground truncate"
          >
            R{i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
