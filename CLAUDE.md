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
- Room sync channel: `room_sync_${roomId}` with `{ self: true }` — handles `game_start`, `game_playing`, `room_updated` events.
- Invitation notifications: `user_invitations_${userId}` — host broadcasts `new_invitation` when inviting.

### Multiplayer Game Sync
- **Countdown sync**: Host broadcasts `game_start` with `{ startedAt: Date.now() }`. Non-host calculates elapsed time and starts countdown from the synced number.
- **Timer sync**: Host calls `beginPlaying()` server action which returns `timerStartedAt`. Host broadcasts `game_playing` with this exact timestamp. Non-host receives it and passes to Timer component. No DB polling — eliminates race condition.
- **Waiting states**: Non-host players see a "Starting..." screen between countdown end and `game_playing` broadcast arrival, so the timer doesn't mount with null `startTime`.

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
supabase/migrations/  # SQL migrations
types/            # TypeScript types (database.ts)
proxy.ts          # Next.js 16 proxy (renamed from middleware.ts)
```

## Key Conventions
- `proxy.ts` is the Next.js 16 replacement for `middleware.ts`. Uses `clerkMiddleware()`.
- Server actions in `actions/` use `createAdminSupabaseClient()` (service role) to bypass RLS.
- Client components use `useSupabaseClient()` hook for Supabase access.
- Timer component accepts `hideControls` prop to suppress Pause/Reset in multiplayer mode.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
