-- Migration: Create room_sets table
-- Created: 2026-02-07
-- Description: Multiple rounds/sets per training session

-- =============================================
-- ROOM SETS TABLE
-- =============================================

CREATE TABLE public.room_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,  -- 1, 2, 3...
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique set number per room
  UNIQUE(room_id, set_number)
);

-- Index
CREATE INDEX idx_room_sets_room_id ON public.room_sets(room_id);

-- Enable RLS
ALTER TABLE public.room_sets ENABLE ROW LEVEL SECURITY;
