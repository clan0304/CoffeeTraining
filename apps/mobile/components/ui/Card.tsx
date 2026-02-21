import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { colors } from '../../lib/colors'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function CardHeader({ children, style }: CardProps) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function CardTitle({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle & { fontSize?: number }
}) {
  return (
    <Text style={[styles.title, style]}>{children}</Text>
  )
}

export function CardDescription({
  children,
}: {
  children: React.ReactNode
}) {
  return <Text style={styles.description}>{children}</Text>
}

export function CardContent({ children, style }: CardProps) {
  return <View style={[styles.content, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
})
