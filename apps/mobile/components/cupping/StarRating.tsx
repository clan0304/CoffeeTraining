import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors } from '../../lib/colors'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  readOnly?: boolean
}

export function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readOnly && onChange(star)}
          disabled={readOnly}
          activeOpacity={readOnly ? 1 : 0.6}
        >
          <Text
            style={[
              styles.star,
              { color: star <= value ? colors.star : '#ddd' },
            ]}
          >
            {star <= value ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 28,
  },
})
