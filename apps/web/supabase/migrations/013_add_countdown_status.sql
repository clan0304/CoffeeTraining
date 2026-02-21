-- Migration: Add countdown status to rooms
-- Created: 2026-02-07
-- Description: Add 'countdown' status for game start countdown

-- Drop and recreate the status check constraint
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('waiting', 'countdown', 'playing', 'finished'));
