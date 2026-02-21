-- Migration: Create room_set_rows table
-- Created: 2026-02-07
-- Description: 8 triangulation rows per set

-- =============================================
-- ROOM SET ROWS TABLE
-- =============================================

CREATE TABLE public.room_set_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.room_sets(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number >= 1 AND row_number <= 8),

  -- The coffee that appears twice (pair)
  pair_coffee_id UUID NOT NULL REFERENCES public.room_coffees(id) ON DELETE CASCADE,

  -- The coffee that appears once (odd one out)
  odd_coffee_id UUID NOT NULL REFERENCES public.room_coffees(id) ON DELETE CASCADE,

  -- Position of the odd cup (1, 2, or 3)
  odd_position INTEGER NOT NULL CHECK (odd_position >= 1 AND odd_position <= 3),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique row number per set
  UNIQUE(set_id, row_number)
);

-- Index
CREATE INDEX idx_room_set_rows_set_id ON public.room_set_rows(set_id);

-- Enable RLS
ALTER TABLE public.room_set_rows ENABLE ROW LEVEL SECURITY;
