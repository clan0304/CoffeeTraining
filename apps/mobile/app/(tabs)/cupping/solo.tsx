import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Crypto from 'expo-crypto'
import type {
  ScaCuppingScores,
  SimpleCuppingScores,
  CuppingFormType,
} from '@cuppingtraining/shared/types'
import {
  getDefaultScaScores,
  calculateScaTotalScore,
  getDefaultSimpleScores,
  calculateSimpleTotalScore,
} from '@cuppingtraining/shared/cupping'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { SimpleForm } from '../../../components/cupping/SimpleForm'
import { ScaForm } from '../../../components/cupping/ScaForm'
import { colors } from '../../../lib/colors'

interface SampleState {
  id: string
  label: string
  scores: ScaCuppingScores | SimpleCuppingScores
}

type PageState = 'setup' | 'scoring' | 'results'

export default function SoloCuppingScreen() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('setup')
  const [formType, setFormType] = useState<CuppingFormType>('simple')
  const [samples, setSamples] = useState<SampleState[]>([
    { id: Crypto.randomUUID(), label: '', scores: getDefaultSimpleScores() },
  ])
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const getDefaultScores = useCallback(
    () =>
      formType === 'simple' ? getDefaultSimpleScores() : getDefaultScaScores(),
    [formType]
  )

  const calcTotal = useCallback(
    (scores: ScaCuppingScores | SimpleCuppingScores) =>
      formType === 'simple'
        ? calculateSimpleTotalScore(scores as SimpleCuppingScores)
        : calculateScaTotalScore(scores as ScaCuppingScores),
    [formType]
  )

  const addSample = useCallback(() => {
    setSamples((prev) => [
      ...prev,
      { id: Crypto.randomUUID(), label: '', scores: getDefaultScores() },
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

  const updateScores = useCallback(
    (id: string, scores: ScaCuppingScores | SimpleCuppingScores) => {
      setSamples((prev) =>
        prev.map((s) => (s.id === id ? { ...s, scores } : s))
      )
    },
    []
  )

  const handleStart = useCallback(() => {
    if (samples.length === 0) return
    setActiveTabIndex(0)
    setPageState('scoring')
  }, [samples])

  const handleFinish = useCallback(() => {
    setPageState('results')
  }, [])

  const handleStartOver = useCallback(() => {
    setSamples([
      { id: Crypto.randomUUID(), label: '', scores: getDefaultScores() },
    ])
    setActiveTabIndex(0)
    setPageState('setup')
  }, [getDefaultScores])

  const activeSample = samples[activeTabIndex]

  // ── Setup ──
  if (pageState === 'setup') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerCenter}>
            <Text style={styles.pageTitle}>Solo Cupping</Text>
            <Text style={styles.pageSubtitle}>
              Score coffees using your preferred cupping form
            </Text>
          </View>

          {/* Form type */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 16 }}>Cupping Form</CardTitle>
            </CardHeader>
            <CardContent style={styles.formTypeContent}>
              {([
                {
                  value: 'simple' as const,
                  label: 'Simple Form',
                  desc: '5 attributes rated 1-5 stars',
                },
                {
                  value: 'sca' as const,
                  label: 'SCA Cupping Form',
                  desc: '11 attributes, 100-point scale',
                },
              ] as const).map((option) => {
                const isSelected = formType === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      if (isSelected) return
                      setFormType(option.value)
                      const newDefault =
                        option.value === 'simple'
                          ? getDefaultSimpleScores()
                          : getDefaultScaScores()
                      setSamples((prev) =>
                        prev.map((s) => ({ ...s, scores: newDefault }))
                      )
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.formOption,
                      isSelected && styles.formOptionSelected,
                    ]}
                  >
                    <View style={styles.formOptionText}>
                      <Text style={styles.formOptionLabel}>{option.label}</Text>
                      <Text style={styles.formOptionDesc}>{option.desc}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.radioOuter}>
                        <View style={styles.radioInner} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </CardContent>
          </Card>

          {/* Samples */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 16 }}>Samples</CardTitle>
            </CardHeader>
            <CardContent style={styles.samplesContent}>
              {samples.map((sample, i) => (
                <View key={sample.id} style={styles.sampleRow}>
                  <Text style={styles.sampleIndex}>{i + 1}</Text>
                  <TextInput
                    style={styles.sampleInput}
                    value={sample.label}
                    onChangeText={(v) => updateLabel(sample.id, v)}
                    placeholder={`Sample ${i + 1}`}
                    placeholderTextColor={colors.mutedLight}
                  />
                  {samples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => removeSample(sample.id)}
                      textStyle={{ color: colors.muted, fontSize: 12 }}
                    >
                      Remove
                    </Button>
                  )}
                </View>
              ))}
              <Button variant="outline" size="sm" onPress={addSample}>
                + Add Sample
              </Button>
            </CardContent>
          </Card>

          <Button onPress={handleStart} size="lg">
            Start Cupping
          </Button>

          <Button
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Scoring ──
  if (pageState === 'scoring') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.scoringHeader}>
          <Text style={styles.sectionTitle}>Score Samples</Text>
          <Button variant="ghost" size="sm" onPress={handleStartOver}>
            Exit
          </Button>
        </View>

        {/* Tab pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {samples.map((sample, i) => {
            const total = calcTotal(sample.scores)
            const isActive = i === activeTabIndex
            return (
              <TouchableOpacity
                key={sample.id}
                onPress={() => setActiveTabIndex(i)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    isActive && styles.tabPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {sample.label || `Sample ${i + 1}`}
                </Text>
                <Text style={[styles.tabScore, isActive && styles.tabScoreActive]}>
                  {total.toFixed(1)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.scoringContent}>
          {activeSample &&
            (formType === 'simple' ? (
              <SimpleForm
                scores={activeSample.scores as SimpleCuppingScores}
                onChange={(scores) => updateScores(activeSample.id, scores)}
              />
            ) : (
              <ScaForm
                scores={activeSample.scores as ScaCuppingScores}
                onChange={(scores) => updateScores(activeSample.id, scores)}
              />
            ))}

          <Button onPress={handleFinish} size="lg" style={styles.finishButton}>
            Finish Cupping
          </Button>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Results ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>Results</Text>
          <Text style={styles.pageSubtitle}>Your cupping scores</Text>
        </View>

        {/* Summary */}
        <Card>
          <CardContent style={styles.summaryContent}>
            {samples.map((sample, i) => {
              const total = calcTotal(sample.scores)
              return (
                <View key={sample.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {sample.label || `Sample ${i + 1}`}
                  </Text>
                  <Text style={styles.summaryScore}>{total.toFixed(2)}</Text>
                </View>
              )
            })}
          </CardContent>
        </Card>

        {/* Tab pills for results */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {samples.map((sample, i) => {
            const isActive = i === activeTabIndex
            return (
              <TouchableOpacity
                key={sample.id}
                onPress={() => setActiveTabIndex(i)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    isActive && styles.tabPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {sample.label || `Sample ${i + 1}`}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {activeSample &&
          (formType === 'simple' ? (
            <SimpleForm
              scores={activeSample.scores as SimpleCuppingScores}
              onChange={() => {}}
              readOnly
            />
          ) : (
            <ScaForm
              scores={activeSample.scores as ScaCuppingScores}
              onChange={() => {}}
              readOnly
            />
          ))}

        <View style={styles.bottomButtons}>
          <Button onPress={handleStartOver}>Start Over</Button>
          <Button variant="outline" onPress={() => router.back()}>
            Back to Cupping
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  headerCenter: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  scoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  formTypeContent: {
    gap: 8,
  },
  formOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  formOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#00000005',
  },
  formOptionText: {
    flex: 1,
  },
  formOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
  },
  formOptionDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  samplesContent: {
    gap: 10,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleIndex: {
    fontSize: 13,
    color: colors.muted,
    width: 16,
  },
  sampleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.foreground,
  },
  tabBar: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
    maxWidth: 100,
  },
  tabPillTextActive: {
    color: colors.primaryForeground,
  },
  tabScore: {
    fontSize: 12,
    color: colors.muted,
  },
  tabScoreActive: {
    color: colors.primaryForeground,
    opacity: 0.8,
  },
  scoringContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  finishButton: {
    marginTop: 8,
  },
  summaryContent: {
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
  },
  summaryScore: {
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: colors.foreground,
  },
  bottomButtons: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'center',
  },
})
