import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useFlavorWords } from './FlavorWordsProvider'
import { COMMON_FLAVOR_WORDS, extractNewWordsFromSamples } from '@cuppingtraining/shared/flavor-words'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { colors } from '../../lib/colors'
import type { ScaCuppingScores, SimpleCuppingScores, CuppingFormType } from '@cuppingtraining/shared/types'

interface NewWordsReviewProps {
  sampleScores: Array<{ scores: ScaCuppingScores | SimpleCuppingScores }>
  formType: CuppingFormType
}

export function NewWordsReview({ sampleScores, formType }: NewWordsReviewProps) {
  const { words: customWords, addWord } = useFlavorWords()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const newWords = useMemo(
    () => extractNewWordsFromSamples(sampleScores, formType, COMMON_FLAVOR_WORDS, customWords),
    [sampleScores, formType, customWords]
  )

  if (newWords.length === 0 || saved) return null

  const toggleWord = (word: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(newWords))

  const handleSave = async () => {
    setSaving(true)
    for (const word of selected) {
      await addWord(word)
    }
    setSaving(false)
    setSaved(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 16 }}>New Words Used</CardTitle>
        <Text style={styles.subtitle}>
          Save new tasting notes to your vocabulary
        </Text>
      </CardHeader>
      <CardContent style={styles.content}>
        <View style={styles.pillsContainer}>
          {newWords.map((word) => {
            const isSelected = selected.has(word)
            return (
              <TouchableOpacity
                key={word}
                onPress={() => toggleWord(word)}
                style={[styles.pill, isSelected && styles.pillSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {word}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            onPress={selectAll}
            disabled={selected.size === newWords.length}
          >
            Select All
          </Button>
          <Button
            size="sm"
            onPress={handleSave}
            disabled={selected.size === 0 || saving}
          >
            {saving
              ? 'Saving...'
              : `Save ${selected.size} Word${selected.size === 1 ? '' : 's'}`}
          </Button>
        </View>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  content: {
    gap: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    color: colors.muted,
  },
  pillTextSelected: {
    color: colors.primaryForeground,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
})
