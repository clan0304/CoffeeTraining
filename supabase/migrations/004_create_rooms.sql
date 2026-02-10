-- Migration: Create rooms table
-- Created: 2026-02-07
-- Description: Training session rooms with 6-char codes

-- =============================================
-- ROOMS TABLE
-- =============================================

CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  code CHAR(6) UNIQUE NOT NULL,  -- 6-char room code (e.g., "ABC123")
  name TEXT,  -- Optional room name
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  timer_minutes INTEGER DEFAULT 8,  -- Timer duration
  timer_started_at TIMESTAMPTZ,  -- When timer was started
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookup
CREATE INDEX idx_rooms_code ON public.rooms(code);
CREATE INDEX idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX idx_rooms_status ON public.rooms(status);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCTION: Generate unique 6-char code
-- =============================================

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS CHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Excluded I, O, 0, 1 for clarity
  code CHAR(6);
  exists_count INTEGER;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    SELECT COUNT(*) INTO exists_count FROM public.rooms WHERE rooms.code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;
