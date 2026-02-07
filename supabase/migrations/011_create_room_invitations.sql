-- Migration: Create room_invitations table
-- Created: 2026-02-07
-- Description: Invitations to join rooms by username

-- =============================================
-- ROOM INVITATIONS TABLE
-- =============================================

CREATE TABLE public.room_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  invited_user_id TEXT NOT NULL,  -- Clerk user ID of invited person
  invited_by TEXT NOT NULL,  -- Clerk user ID of person who invited
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One invitation per user per room
  UNIQUE(room_id, invited_user_id)
);

-- Indexes
CREATE INDEX idx_room_invitations_room_id ON public.room_invitations(room_id);
CREATE INDEX idx_room_invitations_invited_user_id ON public.room_invitations(invited_user_id);
CREATE INDEX idx_room_invitations_status ON public.room_invitations(status);

-- Enable RLS
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users can view invitations they sent or received
CREATE POLICY "Users can view own invitations"
  ON public.room_invitations FOR SELECT
  USING (
    invited_user_id = auth.jwt()->>'sub'
    OR invited_by = auth.jwt()->>'sub'
  );

-- Host can create invitations for their rooms
CREATE POLICY "Host can invite to room"
  ON public.room_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.jwt()->>'sub'
    AND EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND host_id = auth.jwt()->>'sub'
    )
  );

-- Invited user can update (accept/decline) their invitation
CREATE POLICY "Invited user can respond"
  ON public.room_invitations FOR UPDATE
  USING (invited_user_id = auth.jwt()->>'sub');

-- Host can delete invitations
CREATE POLICY "Host can delete invitation"
  ON public.room_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND host_id = auth.jwt()->>'sub'
    )
  );

-- Service role full access
CREATE POLICY "Service role invitations access"
  ON public.room_invitations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
