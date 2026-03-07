'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getUserFlavorWords, addFlavorWord, removeFlavorWord } from '@/actions/flavor-words'
import { FLAVOR_CATEGORIES } from '@cuppingtraining/shared/flavor-words'
import type { PlayerDashboardData, CuppingDashboardData } from '@cuppingtraining/shared/types'

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function DashboardTabs({
  cupTastersData,
  cuppingData,
}: {
  cupTastersData: PlayerDashboardData | null
  cuppingData: CuppingDashboardData | null
}) {
  return (
    <Tabs defaultValue="cup-tasters">
      <TabsList className="w-full">
        <TabsTrigger value="cup-tasters" className="flex-1">Cup Tasters</TabsTrigger>
        <TabsTrigger value="cupping" className="flex-1">Cupping</TabsTrigger>
      </TabsList>

      {/* ── Cup Tasters Tab ── */}
      <TabsContent value="cup-tasters">
        {!cupTastersData ? (
          <p className="text-muted-foreground py-4">No cup tasters data yet.</p>
        ) : (
          <CupTastersContent data={cupTastersData} />
        )}
      </TabsContent>

      {/* ── Cupping Tab ── */}
      <TabsContent value="cupping" className="space-y-8">
        {!cuppingData ? (
          <p className="text-muted-foreground py-4">No cupping data yet.</p>
        ) : (
          <>
            <CuppingContent data={cuppingData} />
            <ScoredCoffees data={cuppingData} />
          </>
        )}
        <FlavorVocabulary />
      </TabsContent>
    </Tabs>
  )
}

function CupTastersContent({ data }: { data: PlayerDashboardData }) {
  const { sessionHistory } = data

  return (
    <div className="space-y-8 mt-4">
      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent transition-colors border">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.room_name || `Room ${session.room_code}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' \u00B7 '}
                        {session.round_count} round{session.round_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.accuracy !== null && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            session.accuracy >= 80
                              ? 'bg-green-500/10 text-green-600'
                              : session.accuracy >= 50
                              ? 'bg-yellow-500/10 text-yellow-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {session.accuracy}%
                        </span>
                      )}
                      {session.best_time_ms !== null && (
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium">
                            {formatElapsedMs(session.best_time_ms)}
                          </p>
                          <p className="text-xs text-muted-foreground">best</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FlavorVocabulary() {
  const [words, setWords] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getUserFlavorWords()
      .then((res) => setWords(res.words))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = useCallback(async () => {
    const word = draft.trim().toLowerCase()
    if (!word) return
    setAdding(true)
    const result = await addFlavorWord(word)
    if (!result.error) {
      setWords((prev) => (prev.includes(word) ? prev : [...prev, word].sort()))
      setDraft('')
    }
    setAdding(false)
  }, [draft])

  const handleRemove = useCallback(async (word: string) => {
    const result = await removeFlavorWord(word)
    if (!result.error) {
      setWords((prev) => prev.filter((w) => w !== word))
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd]
  )

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Flavor Vocabulary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Words available in autocomplete when taking cupping notes.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="common">
          <TabsList className="w-full">
            <TabsTrigger value="common" className="flex-1">Common</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="common" className="space-y-4 mt-4">
            {Object.entries(FLAVOR_CATEGORIES).map(([category, categoryWords]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {categoryWords.map((word) => (
                    <span
                      key={word}
                      className="rounded-full border bg-muted/30 px-2.5 py-0.5 text-xs"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a flavor word..."
                className="flex-1"
                maxLength={100}
              />
              <Button onClick={handleAdd} disabled={adding || !draft.trim()}>
                {adding ? 'Adding...' : 'Add'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : words.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom words yet. Add your own flavor descriptors here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-sm"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => handleRemove(word)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${word}`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

type SortOption = 'score-high' | 'score-low' | 'date-new' | 'date-old'

const SORT_LABELS: Record<SortOption, string> = {
  'score-high': 'Score: High',
  'score-low': 'Score: Low',
  'date-new': 'Date: New',
  'date-old': 'Date: Old',
}

function ScoredCoffees({ data }: { data: CuppingDashboardData }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('score-high')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const { allScoresByRank } = data

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    if (sortOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sortOpen])

  const filtered = search.trim()
    ? allScoresByRank.filter(
        (s) =>
          s.sampleLabel.toLowerCase().includes(search.toLowerCase()) ||
          (s.roomName && s.roomName.toLowerCase().includes(search.toLowerCase()))
      )
    : allScoresByRank

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'score-high': return b.totalScore - a.totalScore
      case 'score-low': return a.totalScore - b.totalScore
      case 'date-new': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'date-old': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">All Scored Coffees</CardTitle>
      </CardHeader>
      <CardContent>
        {allScoresByRank.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scored coffees yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by coffee or session name..."
                className="flex-1"
              />
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="h-9 w-9 flex items-center justify-center rounded-md border hover:bg-accent transition-colors"
                  aria-label="Sort options"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6M3 12h10M3 17h14" />
                  </svg>
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-10 z-10 w-40 rounded-md border bg-popover shadow-md py-1">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setSort(option); setSortOpen(false) }}
                        className={`w-full text-left text-sm px-3 py-1.5 transition-colors ${
                          sort === option
                            ? 'bg-accent font-medium'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        {SORT_LABELS[option]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No results.</p>
            ) : (
              <div className="space-y-2">
                {sorted.map((entry, i) => (
                  <Link key={`${entry.sessionId}-${entry.sampleLabel}-${i}`} href={`/cupping/sessions/${entry.sessionId}`}>
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent transition-colors border">
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{entry.sampleLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.roomName || 'Solo Session'}
                          {entry.createdAt && (
                            <>
                              {' \u00B7 '}
                              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold">
                        {entry.totalScore.toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CuppingContent({ data }: { data: CuppingDashboardData }) {
  const { sessionHistory } = data

  return (
    <div className="space-y-8 mt-4">
      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cupping sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session) => (
                <Link key={session.id} href={`/cupping/sessions/${session.id}`}>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-accent transition-colors border">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.room_name || (session.room_code ? `Room ${session.room_code}` : 'Solo Session')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' \u00B7 '}
                        {session.sample_count} coffee{session.sample_count === 1 ? '' : 's'}
                        {' \u00B7 '}
                        {session.player_count} player{session.player_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.avg_score !== null && (
                        <div className="text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              session.avg_score >= 85
                                ? 'bg-green-500/10 text-green-600'
                                : session.avg_score >= 75
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {session.avg_score.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            avg
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
