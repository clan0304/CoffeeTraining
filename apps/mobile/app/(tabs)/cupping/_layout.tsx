import { Stack } from 'expo-router'
import { FlavorWordsProvider } from '../../../components/cupping/FlavorWordsProvider'

export default function CuppingLayout() {
  return (
    <FlavorWordsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="solo" />
      </Stack>
    </FlavorWordsProvider>
  )
}
