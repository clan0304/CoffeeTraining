import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../lib/colors'

interface ExpandableTextProps {
  text: string
  maxLines?: number
  style?: any
  textStyle?: any
}

export function ExpandableText({
  text,
  maxLines = 4,
  style,
  textStyle
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [textHeight, setTextHeight] = useState(0)
  const [maxHeight, setMaxHeight] = useState(0)

  const handleTextLayout = (event: any) => {
    const { height } = event.nativeEvent.layout
    setTextHeight(height)
  }

  const handleMaxLinesLayout = (event: any) => {
    const { height } = event.nativeEvent.layout
    setMaxHeight(height)
    setIsOverflowing(textHeight > height)
  }

  useEffect(() => {
    if (textHeight > 0 && maxHeight > 0) {
      setIsOverflowing(textHeight > maxHeight)
    }
  }, [textHeight, maxHeight])

  if (!text) return null

  return (
    <View style={style}>
      {/* Hidden text to measure full height */}
      <Text
        style={[styles.hiddenText, textStyle]}
        onLayout={handleTextLayout}
      >
        {text}
      </Text>
      
      {/* Hidden text with maxLines to measure constrained height */}
      <Text
        style={[styles.hiddenText, textStyle]}
        numberOfLines={maxLines}
        onLayout={handleMaxLinesLayout}
      >
        {text}
      </Text>

      {/* Visible text */}
      <Text
        style={[styles.visibleText, textStyle]}
        numberOfLines={!isExpanded && isOverflowing ? maxLines : undefined}
      >
        {text}
      </Text>

      {/* Show more/less button */}
      {isOverflowing && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.button}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {isExpanded ? 'Show less ▲' : 'Show more ▼'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  hiddenText: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },
  visibleText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.foreground,
    flexShrink: 1,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
})