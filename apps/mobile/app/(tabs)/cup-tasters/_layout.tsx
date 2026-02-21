import { Stack } from 'expo-router'

export default function CupTastersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="solo" />
    </Stack>
  )
}
