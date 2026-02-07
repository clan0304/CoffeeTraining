import '@clerk/nextjs'

declare module '@clerk/nextjs' {
  interface ClerkJWTClaims {
    metadata?: {
      onboardingComplete?: boolean
    }
  }
}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      onboardingComplete?: boolean
    }
  }
}
