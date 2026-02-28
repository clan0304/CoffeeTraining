import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useApiClient } from '../../lib/api'

interface FlavorWordsContextValue {
  words: string[]
  addWord: (word: string) => Promise<void>
}

const FlavorWordsContext = createContext<FlavorWordsContextValue>({
  words: [],
  addWord: async () => {},
})

export function useFlavorWords() {
  return useContext(FlavorWordsContext)
}

export function FlavorWordsProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<string[]>([])
  const { apiFetch } = useApiClient()

  useEffect(() => {
    apiFetch<{ words: string[] }>('/flavor-words')
      .then((res) => setWords(res.words))
      .catch(() => {})
  }, [apiFetch])

  const addWord = useCallback(
    async (word: string) => {
      const normalized = word.trim().toLowerCase()
      if (!normalized) return
      try {
        await apiFetch('/flavor-words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: normalized }),
        })
        setWords((prev) =>
          prev.includes(normalized)
            ? prev
            : [...prev, normalized].sort()
        )
      } catch {
        // ignore
      }
    },
    [apiFetch]
  )

  return (
    <FlavorWordsContext.Provider value={{ words, addWord }}>
      {children}
    </FlavorWordsContext.Provider>
  )
}
