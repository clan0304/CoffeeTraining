-- Migration: Add active_set_id to rooms for multi-round play
-- Created: 2026-02-09
-- Description: Track which triangulation set is being played in the current round

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS active_set_id UUID REFERENCES public.room_sets(id) ON DELETE SET NULL;
