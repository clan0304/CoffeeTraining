-- Migration: Create user_profiles table
-- Created: 2026-02-07
-- Description: Initial user profiles table for Clerk authentication

-- =============================================
-- USER PROFILES TABLE
-- =============================================

CREATE TABLE public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- Clerk user ID
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  bio TEXT,
  photo_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
