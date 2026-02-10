-- Migration: Create round_results table for per-round finish time tracking
-- Created: 2026-02-09
-- Description: Tracks when each player finishes a round (clicks Finish button)

CREATE TABLE public.round_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  timer_started_at TIMESTAMPTZ NOT NULL,  -- Identifies which round (each game start = new timer_started_at)
  finished_at TIMESTAMPTZ NOT NULL,
  elapsed_ms INTEGER NOT NULL,  -- Milliseconds from timer start to finish (pause-adjusted)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, timer_started_at)
);

-- Indexes
CREATE INDEX idx_round_results_room_id ON public.round_results(room_id);
CREATE INDEX idx_round_results_user_id ON public.round_results(user_id);

-- Enable RLS
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
