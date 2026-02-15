'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScaForm } from '@/components/cupping/sca-form'
import { getDefaultScaScores, calculateScaTotalScore } from '@/lib/cupping/sca-utils'
import type { ScaCuppingScores } from '@/types/database'

interface SampleState {
  id: string
  label: string
  scores: ScaCuppingScores
}

type PageState = 'setup' | 'scoring' | 'results'

export default function SoloCuppingPage() {
  const [pageState, setPageState] = useState<PageState>('setup')
  const [samples, setSamples] = useState<SampleState[]>([
    { id: crypto.randomUUID(), label: '', scores: getDefaultScaScores() },
  ])
  const [activeTab, setActiveTab] = useState<string>('')

  const addSample = useCallback(() => {
    setSamples((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        scores: getDefaultScaScores(),
      },
    ])
  }, [])

  const removeSample = useCallback((id: string) => {
    setSamples((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  const updateLabel = useCallback((id: string, label: string) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
  }, [])

  const updateScores = useCallback((id: string, scores: ScaCuppingScores) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, scores } : s)))
  }, [])

  const handleStart = useCallback(() => {
    if (samples.length === 0) return
    setActiveTab(samples[0].id)
    setPageState('scoring')
  }, [samples])

  const handleFinish = useCallback(() => {
    setPageState('results')
  }, [])

  const handleStartOver = useCallback(() => {
    setSamples([
      { id: crypto.randomUUID(), label: '', scores: getDefaultScaScores() },
    ])
    setActiveTab('')
    setPageState('setup')
  }, [])

  // Setup
  if (pageState === 'setup') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Solo Cupping</h1>
            <p className="text-muted-foreground">
              Score coffees using the SCA cupping form
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Samples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {samples.map((sample, i) => (
                <div key={sample.id} className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground w-4">{i + 1}</Label>
                  <Input
                    value={sample.label}
                    onChange={(e) => updateLabel(sample.id, e.target.value)}
                    placeholder={`Sample ${i + 1}`}
                    className="flex-1"
                  />
                  {samples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeSample(sample.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSample} className="w-full">
                + Add Sample
              </Button>
            </CardContent>
          </Card>

          <Button onClick={handleStart} className="w-full" size="lg">
            Start Cupping
          </Button>

          <div className="text-center">
            <Link href="/cupping" className="text-sm text-muted-foreground hover:underline">
              Back to Cupping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Scoring
  if (pageState === 'scoring') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Score Samples</h1>
            <Button variant="ghost" size="sm" onClick={handleStartOver}>
              Exit
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              {samples.map((sample) => {
                const total = calculateScaTotalScore(sample.scores)
                return (
                  <TabsTrigger key={sample.id} value={sample.id} className="flex-1">
                    <span className="truncate max-w-[6rem]">{sample.label || `Sample ${samples.indexOf(sample) + 1}`}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{total.toFixed(1)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {samples.map((sample) => (
              <TabsContent key={sample.id} value={sample.id}>
                <ScaForm
                  scores={sample.scores}
                  onChange={(scores) => updateScores(sample.id, scores)}
                />
              </TabsContent>
            ))}
          </Tabs>

          <Button onClick={handleFinish} className="w-full" size="lg">
            Finish Cupping
          </Button>
        </div>
      </div>
    )
  }

  // Results
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4 pt-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">Your cupping scores</p>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              {samples.map((sample) => {
                const total = calculateScaTotalScore(sample.scores)
                return (
                  <div key={sample.id} className="flex items-center justify-between">
                    <span className="font-medium">{sample.label || `Sample ${samples.indexOf(sample) + 1}`}</span>
                    <div className="text-right">
                      <span className="font-bold">{total.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed scores per sample */}
        <Tabs defaultValue={samples[0]?.id}>
          <TabsList className="w-full">
            {samples.map((sample) => (
              <TabsTrigger key={sample.id} value={sample.id} className="flex-1 truncate">
                {sample.label || `Sample ${samples.indexOf(sample) + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {samples.map((sample) => (
            <TabsContent key={sample.id} value={sample.id}>
              <ScaForm scores={sample.scores} onChange={() => {}} readOnly />
            </TabsContent>
          ))}
        </Tabs>

        <div className="space-y-2">
          <Button onClick={handleStartOver} className="w-full">
            Start Over
          </Button>
          <Link href="/cupping" className="block">
            <Button variant="outline" className="w-full">
              Back to Cupping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
