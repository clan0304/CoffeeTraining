import { useState, useCallback, useMemo } from 'react'
import {
  View,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { useFlavorWords } from './FlavorWordsProvider'
import {
  COMMON_FLAVOR_WORDS,
  getCurrentFragment,
  getEnteredWords,
  getSuggestions,
  applySelection,
  type Suggestion,
} from '@cuppingtraining/shared/flavor-words'
import { colors } from '../../lib/colors'

interface AutocompleteNotesInputProps {
  value: string
  onChangeText: (value: string) => void
  editable?: boolean
  placeholder?: string
  style?: ViewStyle
}

export function AutocompleteNotesInput({
  value,
  onChangeText,
  editable = true,
  placeholder,
  style,
}: AutocompleteNotesInputProps) {
  const { words: customWords } = useFlavorWords()
  const [focused, setFocused] = useState(false)

  const suggestions = useMemo(() => {
    if (!focused || !editable) return []
    const fragment = getCurrentFragment(value)
    if (fragment.length < 1) return []
    const entered = getEnteredWords(value)
    return getSuggestions(fragment, COMMON_FLAVOR_WORDS, customWords, entered)
  }, [value, focused, editable, customWords])

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      const newValue = applySelection(value, suggestion.word)
      onChangeText(newValue)
    },
    [value, onChangeText]
  )

  return (
    <View>
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        autoCorrect={false}
      />
      {suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.word}
              onPress={() => handleSelect(s)}
              style={[styles.chip, s.isCustom && styles.chipCustom]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, s.isCustom && styles.chipTextCustom]}>
                {s.word}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.foreground,
  },
  chipsRow: {
    marginTop: 6,
    maxHeight: 34,
  },
  chipsContent: {
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
  },
  chipCustom: {
    backgroundColor: '#e8e0f4',
  },
  chipText: {
    fontSize: 12,
    color: colors.foreground,
  },
  chipTextCustom: {
    color: '#6b21a8',
  },
})
