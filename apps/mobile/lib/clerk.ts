import { tokenCache } from '@clerk/clerk-expo/token-cache'

export { tokenCache }

// Clerk publishable key from environment
export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!
