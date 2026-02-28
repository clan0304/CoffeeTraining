'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getUserFlavorWords, addFlavorWord } from '@/actions/flavor-words'

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

  useEffect(() => {
    getUserFlavorWords()
      .then((res) => setWords(res.words))
      .catch(() => {})
  }, [])

  const addWord = useCallback(async (word: string) => {
    const normalized = word.trim().toLowerCase()
    if (!normalized) return
    const result = await addFlavorWord(normalized)
    if (!result.error) {
      setWords((prev) =>
        prev.includes(normalized)
          ? prev
          : [...prev, normalized].sort()
      )
    }
  }, [])

  return (
    <FlavorWordsContext.Provider value={{ words, addWord }}>
      {children}
    </FlavorWordsContext.Provider>
  )
}
