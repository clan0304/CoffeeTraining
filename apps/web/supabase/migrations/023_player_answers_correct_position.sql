-- Add correct_position column to player_answers
-- Each player independently records what they discovered as the odd cup position
-- This prevents players from overwriting each other's correct answers
ALTER TABLE public.player_answers
  ADD COLUMN correct_position INTEGER CHECK (correct_position >= 1 AND correct_position <= 3);
