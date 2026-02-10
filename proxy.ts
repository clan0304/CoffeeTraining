import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/solo(.*)',
  '/api/webhooks(.*)',
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

  // Check onboarding status from Supabase
  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('clerk_id', userId)
    .single()

  const onboardingComplete = profile?.onboarding_completed === true

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
