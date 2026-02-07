-- Migration: Enable Realtime for room tables
-- Created: 2026-02-07
-- Description: Enable Supabase Realtime for real-time updates

-- Enable realtime for rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Enable realtime for room_players table
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- Enable realtime for room_invitations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invitations;
