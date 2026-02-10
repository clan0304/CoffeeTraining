# Cupping Training App

Coffee cupping/triangulation training app with multiplayer rooms.

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: Supabase (Postgres + Realtime)
- **Styling**: Tailwind CSS 4, shadcn/ui (Radix)
- **Language**: TypeScript
- **Deployment**: Vercel

## Architecture

### Auth: Clerk + Supabase Native Integration
- Clerk is the auth provider. Supabase uses Clerk as a **third-party auth provider** (not JWT templates).
- Client-side: `useSupabaseClient()` hook in `lib/supabase/client.ts` creates a Supabase client with `accessToken: () => session.getToken()` (no template param).
- Server-side (with RLS): `createServerSupabaseClient()` in `lib/supabase/server.ts` uses `accessToken: () => auth().getToken()`.
- Server-side (admin/bypass RLS): `createAdminSupabaseClient()` in `lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY`. All server actions in `actions/rooms.ts` use this.
- **Never** use `session.getToken({ template: 'supabase' })` — that's the deprecated JWT template approach.

### Realtime: Broadcast Channels (not postgres_changes)
- Supabase `postgres_changes` requires RLS-authenticated sessions which don't work reliably with Clerk's third-party auth.
- All realtime features use **Broadcast** channels instead — pure pub/sub, no RLS dependency.
- Room sync channel: `room_sync_${roomId}` with `{ self: true }` — handles all game events.
- Invitation notifications: `user_invitations_${userId}` — host broadcasts `new_invitation` when inviting.

### Broadcast Events
| Event | Payload | Description |
|-------|---------|-------------|
| `game_start` | `{ startedAt }` | Host starts countdown, all players sync |
| `game_playing` | `{ timerStartedAt }` | Countdown done, timer begins with exact timestamp |
| `game_pause` | `{}` | Host paused the game |
| `game_resume` | `{ newTimerStartedAt }` | Host resumed, timer_started_at shifted forward |
| `player_finished` | `{ userId, username, elapsedMs }` | A player clicked Finish |
| `round_ended` | `{}` | Host ended the round, all players return to lobby |
| `room_updated` | `{}` | Generic refresh trigger (invites, coffees, sets) |

### Multiplayer Game Sync
- **Countdown sync**: Host broadcasts `game_start` with `{ startedAt: Date.now() }`. Non-host calculates elapsed time and starts countdown from the synced number.
- **Timer sync**: Host calls `beginPlaying()` server action which returns `timerStartedAt`. Host broadcasts `game_playing` with this exact timestamp. Non-host receives it and passes to Timer component. No DB polling — eliminates race condition.
- **Pause/Resume**: Host-only. `pauseGame()` records `paused_at`, `resumeGame()` shifts `timer_started_at` forward by pause duration. All via broadcast.
- **Waiting states**: Non-host players see a "Starting..." screen between countdown end and `game_playing` broadcast arrival, so the timer doesn't mount with null `startTime`.

### Multi-Round Game Flow
```
Lobby (waiting) → Select Set → Start Round → Countdown → Playing → Finish → Check Answers → End Round → Lobby
```
- Room status cycle: `waiting` → `countdown` → `playing` ↔ `paused` → `waiting` (repeat)
- **Coffees persist** between rounds and are editable in the lobby.
- **Sets persist** between rounds. Host can add/delete sets and select which one to play.
- `active_set_id` on rooms tracks which set is being played in the current round.
- **Finish button**: Any player can click Finish to record their elapsed time (saved to `round_results` table). Broadcast notifies all players.
- **End Round**: Host clicks "End Round" after checking answers → `endRound()` resets room to `waiting` → broadcasts `round_ended` → all players return to lobby.
- Non-host players see "Waiting for host to start next round..." after checking their answers.

## Database Schema (key tables)
- `user_profiles` — id (UUID PK), clerk_id (TEXT, Clerk user ID for auth lookup), username, bio, photo_url
- `rooms` — host_id (UUID FK → user_profiles.id), code, status, timer_minutes, timer_started_at, paused_at, active_set_id
- `room_players` — room_id, user_id (UUID FK → user_profiles.id)
- `room_coffees` — room_id, label (A/B/C...), name
- `room_sets` — room_id, set_number
- `room_set_rows` — set_id, row_number, pair_coffee_id, odd_coffee_id, odd_position
- `round_results` — room_id, user_id (UUID FK → user_profiles.id), timer_started_at (round key), finished_at, elapsed_ms
- `room_invitations` — room_id, invited_user_id (UUID FK → user_profiles.id), invited_by (UUID FK → user_profiles.id), status
- **Note**: All user references are UUID FKs to `user_profiles.id`. Clerk IDs are only stored in `user_profiles.clerk_id`.

## Project Structure
```
actions/          # Server actions (rooms.ts, onboarding.ts)
app/              # Next.js App Router pages
  (auth)/         # Auth pages (Clerk)
  rooms/[id]/     # Multiplayer room page
  solo/           # Solo training mode
  onboarding/     # User onboarding
components/
  training/       # Timer, Countdown, AnswerSheet, TriangulationRow
  rooms/          # InvitationsList
  onboarding/     # OnboardingForm
  ui/             # shadcn/ui components
lib/supabase/     # Supabase client helpers (client.ts, server.ts, admin.ts)
supabase/migrations/  # SQL migrations (001-016)
types/            # TypeScript types (database.ts)
proxy.ts          # Next.js 16 proxy (renamed from middleware.ts)
```

## Key Server Actions (`actions/rooms.ts`)
- `createRoom`, `deleteRoom`, `joinRoomByCode` — room lifecycle
- `inviteUserByUsername`, `respondToInvitation`, `cancelInvitation` — invitations
- `addCoffee`, `removeCoffee` — coffee management (waiting status only)
- `generateTriangulationSet`, `createEmptySet`, `updateSetRow`, `deleteSet` — set management
- `startGame(roomId, setId)` — initiates countdown with selected set
- `beginPlaying` — transitions to playing, returns `timerStartedAt`
- `pauseGame`, `resumeGame` — host-only pause/resume
- `finishRound` — any player records finish time (pause-aware elapsed calculation)
- `endRound` — host resets room to waiting for next round

## Key Conventions
- `proxy.ts` is the Next.js 16 replacement for `middleware.ts`. Uses `clerkMiddleware()`.
- Server actions in `actions/` use `createAdminSupabaseClient()` (service role) to bypass RLS.
- Server actions use `getProfileId()` helper to resolve Clerk auth to `user_profiles.id` UUID. All DB operations use UUID profile IDs, not Clerk IDs.
- `inviteUserByUsername` returns `{ invitation, invitedClerkId }` — the Clerk ID is needed for broadcast channel naming (`user_invitations_${clerkId}`).
- `getRoomDetails` returns `{ room, currentUserProfileId }` — the client uses `currentUserProfileId` for `isHost` checks and `player_finished` broadcasts.
- RLS helper function `auth_profile_id()` resolves `auth.jwt()->>'sub'` (Clerk ID) to `user_profiles.id` UUID. Used by `is_room_member()`, `is_room_host()`, and all RLS policies.
- Client components use `useSupabaseClient()` hook for Supabase access.
- Timer component accepts `hideControls` and `isPaused` props for multiplayer mode.
- Host is source of truth for all game state transitions (start, pause, resume, end round).
- All players sync via Broadcast — no DB polling during gameplay.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
