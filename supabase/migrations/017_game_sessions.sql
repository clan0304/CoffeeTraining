-- Migration: Create game sessions, session rounds, and round participants
-- Created: 2026-02-12
-- Description: Groups rounds into sessions, tracks per-round participation, links round_results

-- game_sessions: groups rounds into a play session
CREATE TABLE public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,  -- null = active
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_room_id ON public.game_sessions(room_id);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- session_rounds: each round within a session
CREATE TABLE public.session_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  set_id UUID REFERENCES public.room_sets(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,  -- timer_started_at (set when beginPlaying is called)
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_rounds_session_id ON public.session_rounds(session_id);

ALTER TABLE public.session_rounds ENABLE ROW LEVEL SECURITY;

-- round_participants: snapshot of who was present when round started
CREATE TABLE public.round_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.session_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  UNIQUE(round_id, user_id)
);

CREATE INDEX idx_round_participants_round_id ON public.round_participants(round_id);
CREATE INDEX idx_round_participants_user_id ON public.round_participants(user_id);

ALTER TABLE public.round_participants ENABLE ROW LEVEL SECURITY;

-- Link round_results to session_rounds
ALTER TABLE public.round_results ADD COLUMN session_round_id UUID REFERENCES public.session_rounds(id) ON DELETE SET NULL;
