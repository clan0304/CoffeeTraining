-- Migration: Create room_players table
-- Created: 2026-02-07
-- Description: Players who joined each room

-- =============================================
-- ROOM PLAYERS TABLE
-- =============================================

CREATE TABLE public.room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- Clerk user ID
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique player per room
  UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX idx_room_players_user_id ON public.room_players(user_id);

-- Enable RLS
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
