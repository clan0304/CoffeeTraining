-- Migration: RLS policies for user_profiles
-- Created: 2026-02-07
-- Description: Row Level Security policies using Clerk JWT

-- =============================================
-- RLS POLICIES (using Clerk JWT)
-- =============================================

-- Users can only view their own profile directly
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.jwt()->>'sub' = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.jwt()->>'sub' = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.jwt()->>'sub' = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE
  USING (auth.jwt()->>'sub' = user_id);

-- Service role has full access (for webhooks)
CREATE POLICY "Service role full access"
  ON public.user_profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- PUBLIC VIEW (hides email for other users)
-- =============================================

-- Create a view for public profile access (email & onboarding_completed hidden for non-owners)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  CASE
    WHEN auth.jwt()->>'sub' = user_id THEN email
    ELSE NULL
  END AS email,
  username,
  bio,
  photo_url,
  CASE
    WHEN auth.jwt()->>'sub' = user_id THEN onboarding_completed
    ELSE NULL
  END AS onboarding_completed,
  created_at,
  updated_at
FROM public.user_profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
