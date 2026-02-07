-- Migration: Create profile-photos storage bucket
-- Created: 2026-02-07
-- Description: Storage bucket for user profile photos with RLS

-- =============================================
-- STORAGE BUCKET FOR PROFILE PHOTOS
-- =============================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);

-- Public read access for profile photos
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- Users can upload their own photos (folder = user_id)
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = auth.jwt()->>'sub'
  );

-- Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = auth.jwt()->>'sub'
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos' AND
    (storage.foldername(name))[1] = auth.jwt()->>'sub'
  );
