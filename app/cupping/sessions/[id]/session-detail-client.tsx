'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScaForm } from '@/components/cupping/sca-form'
import type { CuppingSessionDetailData } from '@/types/database'

export function SessionDetailClient({ data }: { data: CuppingSessionDetailData }) {
  const { samples, scores } = data

  return (
    <div className="space-y-6">
      {/* Summary card: each coffee with avg score across all players */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coffee Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {samples.map((sample) => {
              const sampleScores = scores.filter(
                (s) => s.sampleNumber === sample.sample_number
              )
              const avgScore =
                sampleScores.length > 0
                  ? sampleScores.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                    sampleScores.length
                  : 0

              return (
                <div key={sample.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary mr-2">{sample.coffeeLabel}</span>
                    <span className="font-medium">{sample.coffeeName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{avgScore.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-sample tabs with all players' SCA forms */}
      <Tabs defaultValue={samples[0]?.sample_number.toString()}>
        <TabsList className="w-full">
          {samples.map((sample) => (
            <TabsTrigger
              key={sample.id}
              value={sample.sample_number.toString()}
              className="flex-1"
            >
              <span className="font-bold mr-1">{sample.coffeeLabel}</span>
              <span className="truncate text-xs">{sample.coffeeName}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {samples.map((sample) => {
          const samplePlayerScores = scores.filter(
            (s) => s.sampleNumber === sample.sample_number
          )
          return (
            <TabsContent key={sample.id} value={sample.sample_number.toString()}>
              <div className="space-y-3">
                {samplePlayerScores.map((score) => (
                  <Card key={score.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>@{score.username}</span>
                        <span className="text-primary">
                          {(score.total_score || 0).toFixed(2)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScaForm
                        scores={score.scores}
                        onChange={() => {}}
                        readOnly
                      />
                    </CardContent>
                  </Card>
                ))}
                {samplePlayerScores.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No scores submitted for this sample
                  </p>
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
