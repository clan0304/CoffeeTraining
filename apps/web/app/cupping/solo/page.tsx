'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScaForm } from '@/components/cupping/sca-form'
import { SimpleForm } from '@/components/cupping/simple-form'
import { DomsForm } from '@/components/cupping/doms-form'
import { SaveWordModal } from '@/components/cupping/save-word-modal'
import { getDefaultScaScores, calculateScaTotalScore, getDefaultSimpleScores, calculateSimpleTotalScore, getDefaultDomsScores, calculateDomsTotalScore } from '@cuppingtraining/shared/cupping'
import type { ScaCuppingScores, SimpleCuppingScores, DomsCuppingScores, CuppingFormType } from '@cuppingtraining/shared/types'

interface SampleState {
  id: string
  label: string
  scores: ScaCuppingScores | SimpleCuppingScores
}

type PageState = 'setup' | 'scoring' | 'results'

export default function SoloCuppingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [pageState, setPageState] = useState<PageState>('setup')
  const [formType, setFormType] = useState<CuppingFormType>('simple')
  const [samples, setSamples] = useState<SampleState[]>(() => [
    { id: Math.random().toString(36).substr(2, 9), label: '', scores: getDefaultSimpleScores() },
  ])
  const [activeTab, setActiveTab] = useState<string>('')
  const [showSaveWordModal, setShowSaveWordModal] = useState(false)

  // Initialize page state from URL params on client side
  useEffect(() => {
    const state = searchParams.get('state') as PageState
    if (['setup', 'scoring', 'results'].includes(state)) {
      setPageState(state)
    }
  }, [searchParams])

  // Update URL when page state changes
  const updatePageState = useCallback((newState: PageState) => {
    setPageState(newState)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (newState === 'setup') {
        url.searchParams.delete('state')
      } else {
        url.searchParams.set('state', newState)
      }
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [router])

  const getDefaultScores = useCallback(() => {
    if (formType === 'simple') return getDefaultSimpleScores()
    if (formType === 'doms') return getDefaultDomsScores()
    return getDefaultScaScores()
  }, [formType])

  const calcTotal = useCallback(
    (scores: ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores) => {
      if (formType === 'simple') return calculateSimpleTotalScore(scores as SimpleCuppingScores)
      if (formType === 'doms') return calculateDomsTotalScore(scores as DomsCuppingScores)
      return calculateScaTotalScore(scores as ScaCuppingScores)
    },
    [formType]
  )

  const addSample = useCallback(() => {
    setSamples((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        label: '',
        scores: getDefaultScores(),
      },
    ])
  }, [getDefaultScores])

  const removeSample = useCallback((id: string) => {
    setSamples((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  const updateLabel = useCallback((id: string, label: string) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))
  }, [])

  const updateScores = useCallback((id: string, scores: ScaCuppingScores | SimpleCuppingScores) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, scores } : s)))
  }, [])

  const handleStart = useCallback(() => {
    if (samples.length === 0) return
    setActiveTab(samples[0].id)
    updatePageState('scoring')
  }, [samples, updatePageState])

  const handleFinish = useCallback(() => {
    updatePageState('results')
  }, [updatePageState])

  const handleStartOver = useCallback(() => {
    setSamples([
      { id: Math.random().toString(36).substr(2, 9), label: '', scores: getDefaultScores() },
    ])
    setActiveTab('')
    updatePageState('setup')
  }, [getDefaultScores, updatePageState])

  // Setup
  if (pageState === 'setup') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Solo Cupping</h1>
            <p className="text-muted-foreground">
              Score coffees using your preferred cupping form
            </p>
          </div>

          {/* Form Type Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cupping Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {([
                { value: 'simple' as const, label: 'Simple Form', description: '5 attributes rated 1-5 stars' },
                { value: 'sca' as const, label: 'SCA Cupping Form', description: '11 attributes, 100-point scale' },
                { value: 'doms' as const, label: "Dom's Form", description: 'SCA + Sweetness, Complexity, Freshness' },
              ]).map((option) => {
                const isSelected = formType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) return
                      setFormType(option.value)
                      const newDefault = option.value === 'simple'
                        ? getDefaultSimpleScores()
                        : option.value === 'doms'
                          ? getDefaultDomsScores()
                          : getDefaultScaScores()
                      setSamples((prev) => prev.map((s) => ({ ...s, scores: newDefault })))
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    } cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

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
            <div className="overflow-x-auto">
              <TabsList className="w-max min-w-full">
                {samples.map((sample) => (
                  <TabsTrigger key={sample.id} value={sample.id} className="flex-none min-w-fit px-4">
                    <span className="truncate max-w-[6rem]">{sample.label || `Sample ${samples.indexOf(sample) + 1}`}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {samples.map((sample) => (
              <TabsContent key={sample.id} value={sample.id}>
                {formType === 'simple' ? (
                  <SimpleForm
                    scores={sample.scores as SimpleCuppingScores}
                    onChange={(scores) => updateScores(sample.id, scores)}
                  />
                ) : formType === 'doms' ? (
                  <DomsForm
                    scores={sample.scores as DomsCuppingScores}
                    onChange={(scores) => updateScores(sample.id, scores)}
                  />
                ) : (
                  <ScaForm
                    scores={sample.scores as ScaCuppingScores}
                    onChange={(scores) => updateScores(sample.id, scores)}
                  />
                )}
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
                const total = calcTotal(sample.scores)
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
          <div className="overflow-x-auto">
            <TabsList className="w-max min-w-full">
              {samples.map((sample) => (
                <TabsTrigger key={sample.id} value={sample.id} className="flex-none min-w-fit px-4 truncate">
                  {sample.label || `Sample ${samples.indexOf(sample) + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {samples.map((sample) => (
            <TabsContent key={sample.id} value={sample.id}>
              {formType === 'simple' ? (
                <SimpleForm
                  scores={sample.scores as SimpleCuppingScores}
                  onChange={() => {}}
                  readOnly
                />
              ) : formType === 'doms' ? (
                <DomsForm
                  scores={sample.scores as DomsCuppingScores}
                  onChange={() => {}}
                  readOnly
                />
              ) : (
                <ScaForm
                  scores={sample.scores as ScaCuppingScores}
                  onChange={() => {}}
                  readOnly
                />
              )}
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
        
        {/* Floating Save Word Button - only show in results */}
        {pageState === 'results' && (
          <button
            onClick={() => setShowSaveWordModal(true)}
            className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Save New Word
          </button>
        )}

        <SaveWordModal 
          isOpen={showSaveWordModal} 
          onClose={() => setShowSaveWordModal(false)} 
        />
      </div>
    </div>
  )
}
