import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, CardContent } from '../../../components/ui/Card'
import { colors } from '../../../lib/colors'

export default function CuppingHub() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cupping</Text>
          <Text style={styles.subtitle}>
            Score coffees using cupping forms
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cupping/solo')}
          activeOpacity={0.7}
        >
          <Card>
            <CardContent style={styles.cardInner}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Solo Practice</Text>
                <Text style={styles.cardDesc}>
                  Score samples with Simple (1-5 stars) or SCA (100-point) forms
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </CardContent>
          </Card>
        </TouchableOpacity>

        <Card style={styles.comingSoonCard}>
          <CardContent style={styles.cardInner}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Create Room</Text>
              <Text style={styles.cardDesc}>Coming soon</Text>
            </View>
          </CardContent>
        </Card>

        <Card style={styles.comingSoonCard}>
          <CardContent style={styles.cardInner}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Join Room</Text>
              <Text style={styles.cardDesc}>Coming soon</Text>
            </View>
          </CardContent>
        </Card>
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
    gap: 12,
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
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
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
  comingSoonCard: {
    opacity: 0.5,
  },
})
