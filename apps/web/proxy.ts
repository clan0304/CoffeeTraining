import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/solo(.*)',
  '/cup-tasters',
  '/cupping',
  '/cupping/solo(.*)',
  '/api/webhooks(.*)',
  '/api/mobile(.*)',
])

// Routes that should only be accessible during onboarding
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

// Create Supabase admin client for middleware
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Simple cache for onboarding status to reduce DB calls
const onboardingCache = new Map<string, { status: boolean; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // If not authenticated, redirect to auth page
  if (!userId) {
    const authUrl = new URL('/auth', req.url)
    return NextResponse.redirect(authUrl)
  }

  // Check cache first
  const cached = onboardingCache.get(userId)
  const now = Date.now()
  let onboardingComplete = false

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    onboardingComplete = cached.status
  } else {
    // Check onboarding status from Supabase only if not cached or expired
    try {
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('clerk_id', userId)
        .single()

      onboardingComplete = profile?.onboarding_completed === true
      
      // Update cache
      onboardingCache.set(userId, { status: onboardingComplete, timestamp: now })
    } catch (error) {
      console.error('Onboarding check error:', error)
      // If there's an error, allow the request to continue
      return NextResponse.next()
    }
  }

  // If user is on onboarding page but already completed, redirect to home
  if (isOnboardingRoute(req) && onboardingComplete) {
    const homeUrl = new URL('/', req.url)
    return NextResponse.redirect(homeUrl)
  }

  // If user hasn't completed onboarding and not on onboarding page, redirect there
  if (!onboardingComplete && !isOnboardingRoute(req)) {
    const onboardingUrl = new URL('/onboarding', req.url)
    return NextResponse.redirect(onboardingUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
