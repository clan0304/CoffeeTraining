'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateSessionReport } from '@cuppingtraining/shared/cupping'
import type { CuppingSample, CuppingScore, ScaCuppingScores, SimpleCuppingScores } from '@cuppingtraining/shared/types'

interface SessionReportCardProps {
  samples: Array<CuppingSample & { coffeeName: string; coffeeLabel: string }>
  scores: Array<CuppingScore & { username: string; sampleNumber: number }>
}

export function SessionReportCard({ samples, scores }: SessionReportCardProps) {
  const report = useMemo(
    () => generateSessionReport(samples, scores),
    [samples, scores]
  )

  if (scores.length === 0) return null

  const isSimple = report.formType === 'simple'
  const maxAttrScore = isSimple ? 5 : 10

  return (
    <div className="space-y-4">
      {/* Session Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{report.totalCoffees}</p>
              <p className="text-xs text-muted-foreground">Coffees</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{report.playerCount}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{report.overallScoreDistribution.avg.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{report.overallScoreDistribution.max.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Highest</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Comparison */}
      {report.coffeeSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.coffeeSummaries.map((coffee) => (
              <div key={coffee.coffeeLabel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary mr-2">{coffee.coffeeLabel}</span>
                    <span className="font-medium">{coffee.coffeeName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    avg {coffee.avgScore.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Low: {coffee.lowestScore.toFixed(1)}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-muted relative overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                      style={{ width: `${(coffee.avgScore / (isSimple ? 5 : 100)) * 100}%` }}
                    />
                  </span>
                  <span>High: {coffee.highestScore.toFixed(1)}</span>
                </div>
                {report.playerCount > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coffee.playerScores.map((ps) => (
                      <span
                        key={ps.username}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                      >
                        <span className="text-muted-foreground">@{ps.username}</span>
                        <span className="font-medium">{ps.totalScore.toFixed(1)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Attribute Averages */}
      {report.attributeAverages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attribute Averages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.attributeAverages.map((attr) => (
              <div key={attr.attribute} className="flex items-center gap-3">
                <span className="w-28 text-sm text-muted-foreground shrink-0">
                  {attr.attribute}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(attr.average / maxAttrScore) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium tabular-nums">
                  {attr.average.toFixed(1)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
