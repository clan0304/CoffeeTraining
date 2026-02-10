-- Migration: Add paused status and paused_at column to rooms
-- Created: 2026-02-09
-- Description: Support host-only pause/resume during multiplayer games

-- Add paused_at column
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ DEFAULT NULL;

-- Update status constraint to include 'paused'
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('waiting', 'countdown', 'playing', 'paused', 'finished'));
