-- Migration: Add session_round_id to player_answers
-- Created: 2026-02-13
-- Description: Link player answers to specific session rounds so the same set
--   can be replayed across multiple rounds without unique constraint violations.

-- Add session_round_id column
ALTER TABLE public.player_answers
  ADD COLUMN session_round_id UUID REFERENCES public.session_rounds(id) ON DELETE CASCADE;

-- Drop old unique constraint (set_id, user_id, row_number) — breaks if same set is replayed
ALTER TABLE public.player_answers
  DROP CONSTRAINT IF EXISTS player_answers_set_id_user_id_row_number_key;

-- Add new unique constraint scoped to session round
ALTER TABLE public.player_answers
  ADD CONSTRAINT player_answers_session_round_user_row_key
  UNIQUE(session_round_id, user_id, row_number);

-- Index for efficient lookups by session_round_id
CREATE INDEX idx_player_answers_session_round_id ON public.player_answers(session_round_id);
