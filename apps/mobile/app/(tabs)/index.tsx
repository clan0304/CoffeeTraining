import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, CardContent } from '../../components/ui/Card'
import { colors } from '../../lib/colors'

export default function HomeTab() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cupping Training</Text>
          <Text style={styles.subtitle}>Choose a game mode</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cup-tasters')}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <CardContent style={styles.cardInner}>
              <Text style={styles.cardIcon}>☕</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Cup Tasters</Text>
                <Text style={styles.cardDesc}>
                  Triangulation test — find the odd cup in each set of three
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </CardContent>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cupping')}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <CardContent style={styles.cardInner}>
              <Text style={styles.cardIcon}>📋</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Cupping</Text>
                <Text style={styles.cardDesc}>
                  Score coffee samples using Simple or SCA cupping forms
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </CardContent>
          </Card>
        </TouchableOpacity>
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
    padding: 20,
    gap: 16,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    marginBottom: 0,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    minHeight: 80,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: colors.muted,
  },
})
