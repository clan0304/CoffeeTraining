import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { tokenCache, clerkPublishableKey } from '../lib/clerk'
import { Slot } from 'expo-router'

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <Slot />
      </ClerkLoaded>
    </ClerkProvider>
  )
}
