-- Migration: Create player_answers table
-- Created: 2026-02-07
-- Description: Player selections for each row

-- =============================================
-- PLAYER ANSWERS TABLE
-- =============================================

CREATE TABLE public.player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.room_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number >= 1 AND row_number <= 8),

  -- Player's selected position (1, 2, or 3)
  selected_position INTEGER NOT NULL CHECK (selected_position >= 1 AND selected_position <= 3),

  -- Whether the answer was correct (calculated on submit or reveal)
  is_correct BOOLEAN,

  answered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one answer per row per user per set
  UNIQUE(set_id, user_id, row_number)
);

-- Indexes
CREATE INDEX idx_player_answers_set_id ON public.player_answers(set_id);
CREATE INDEX idx_player_answers_user_id ON public.player_answers(user_id);

-- Enable RLS
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
