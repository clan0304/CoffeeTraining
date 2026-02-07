-- Migration: RLS policies for rooms system
-- Created: 2026-02-07
-- Description: Row Level Security for all room-related tables

-- =============================================
-- HELPER FUNCTION: Check if user is room member
-- =============================================

CREATE OR REPLACE FUNCTION is_room_member(room_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_id = room_uuid
    AND user_id = auth.jwt()->>'sub'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_room_host(room_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = room_uuid
    AND host_id = auth.jwt()->>'sub'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROOMS POLICIES
-- =============================================

-- Users can view rooms they are a member of (joined or host)
CREATE POLICY "Users can view joined rooms"
  ON public.rooms FOR SELECT
  USING (
    host_id = auth.jwt()->>'sub'
    OR is_room_member(id)
  );

-- Users can create rooms (they become host)
CREATE POLICY "Users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (host_id = auth.jwt()->>'sub');

-- Only host can update room
CREATE POLICY "Host can update room"
  ON public.rooms FOR UPDATE
  USING (host_id = auth.jwt()->>'sub');

-- Only host can delete room
CREATE POLICY "Host can delete room"
  ON public.rooms FOR DELETE
  USING (host_id = auth.jwt()->>'sub');

-- Service role full access
CREATE POLICY "Service role rooms access"
  ON public.rooms FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- ROOM PLAYERS POLICIES
-- =============================================

-- Room members can view players in their rooms
CREATE POLICY "Members can view room players"
  ON public.room_players FOR SELECT
  USING (is_room_member(room_id) OR is_room_host(room_id));

-- Users can join rooms (insert themselves)
CREATE POLICY "Users can join rooms"
  ON public.room_players FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

-- Host can remove players, users can leave
CREATE POLICY "Host or self can remove player"
  ON public.room_players FOR DELETE
  USING (
    user_id = auth.jwt()->>'sub'
    OR is_room_host(room_id)
  );

-- Service role full access
CREATE POLICY "Service role room_players access"
  ON public.room_players FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- ROOM COFFEES POLICIES
-- =============================================

-- Room members can view coffees
CREATE POLICY "Members can view room coffees"
  ON public.room_coffees FOR SELECT
  USING (is_room_member(room_id) OR is_room_host(room_id));

-- Only host can add coffees
CREATE POLICY "Host can add coffees"
  ON public.room_coffees FOR INSERT
  WITH CHECK (is_room_host(room_id));

-- Only host can update coffees
CREATE POLICY "Host can update coffees"
  ON public.room_coffees FOR UPDATE
  USING (is_room_host(room_id));

-- Only host can delete coffees
CREATE POLICY "Host can delete coffees"
  ON public.room_coffees FOR DELETE
  USING (is_room_host(room_id));

-- Service role full access
CREATE POLICY "Service role room_coffees access"
  ON public.room_coffees FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- ROOM SETS POLICIES
-- =============================================

-- Room members can view sets
CREATE POLICY "Members can view room sets"
  ON public.room_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND (host_id = auth.jwt()->>'sub' OR is_room_member(id))
    )
  );

-- Only host can create sets
CREATE POLICY "Host can create sets"
  ON public.room_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND host_id = auth.jwt()->>'sub'
    )
  );

-- Only host can update sets
CREATE POLICY "Host can update sets"
  ON public.room_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND host_id = auth.jwt()->>'sub'
    )
  );

-- Only host can delete sets
CREATE POLICY "Host can delete sets"
  ON public.room_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id
      AND host_id = auth.jwt()->>'sub'
    )
  );

-- Service role full access
CREATE POLICY "Service role room_sets access"
  ON public.room_sets FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- ROOM SET ROWS POLICIES
-- =============================================

-- Room members can view rows
CREATE POLICY "Members can view set rows"
  ON public.room_set_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND (r.host_id = auth.jwt()->>'sub' OR is_room_member(r.id))
    )
  );

-- Only host can create rows
CREATE POLICY "Host can create set rows"
  ON public.room_set_rows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND r.host_id = auth.jwt()->>'sub'
    )
  );

-- Only host can update rows
CREATE POLICY "Host can update set rows"
  ON public.room_set_rows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND r.host_id = auth.jwt()->>'sub'
    )
  );

-- Only host can delete rows
CREATE POLICY "Host can delete set rows"
  ON public.room_set_rows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND r.host_id = auth.jwt()->>'sub'
    )
  );

-- Service role full access
CREATE POLICY "Service role room_set_rows access"
  ON public.room_set_rows FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- PLAYER ANSWERS POLICIES
-- =============================================

-- Room members can view all answers in their rooms
CREATE POLICY "Members can view answers"
  ON public.player_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND (r.host_id = auth.jwt()->>'sub' OR is_room_member(r.id))
    )
  );

-- Users can submit their own answers
CREATE POLICY "Users can submit own answers"
  ON public.player_answers FOR INSERT
  WITH CHECK (
    user_id = auth.jwt()->>'sub'
    AND EXISTS (
      SELECT 1 FROM public.room_sets rs
      JOIN public.rooms r ON r.id = rs.room_id
      WHERE rs.id = set_id
      AND is_room_member(r.id)
    )
  );

-- Users can update their own answers
CREATE POLICY "Users can update own answers"
  ON public.player_answers FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

-- Users can delete their own answers
CREATE POLICY "Users can delete own answers"
  ON public.player_answers FOR DELETE
  USING (user_id = auth.jwt()->>'sub');

-- Service role full access
CREATE POLICY "Service role player_answers access"
  ON public.player_answers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
