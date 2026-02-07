-- Migration: Create room_coffees table
-- Created: 2026-02-07
-- Description: Coffee library for each room (A, B, C, D, E...)

-- =============================================
-- ROOM COFFEES TABLE
-- =============================================

CREATE TABLE public.room_coffees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  label CHAR(1) NOT NULL,  -- A, B, C, D, E...
  name TEXT NOT NULL,  -- e.g., "Ethiopia Yirgacheffe"
  description TEXT,  -- Optional notes about the coffee
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique label per room
  UNIQUE(room_id, label)
);

-- Index
CREATE INDEX idx_room_coffees_room_id ON public.room_coffees(room_id);

-- Enable RLS
ALTER TABLE public.room_coffees ENABLE ROW LEVEL SECURITY;
