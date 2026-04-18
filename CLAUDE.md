# Cupping Training App

Coffee cupping/triangulation training app with multiplayer rooms.

## Tech Stack
- **Monorepo**: Turborepo with npm workspaces
- **Web**: Next.js 16 (App Router, React 19), Tailwind CSS 4, shadcn/ui (Radix)
- **Mobile**: Expo SDK 52, Expo Router 4, React Native 0.76
- **Auth**: Clerk (`@clerk/nextjs` for web, `@clerk/clerk-expo` for mobile)
- **Database**: Supabase (Postgres + Realtime)
- **Language**: TypeScript
- **Deployment**: Vercel (web)

## Architecture

### Auth: Clerk + Supabase Native Integration
- Clerk is the auth provider. Supabase uses Clerk as a **third-party auth provider** (not JWT templates).
- Client-side: `useSupabaseClient()` hook in `apps/web/lib/supabase/client.ts` creates a Supabase client with `accessToken: () => session.getToken()` (no template param).
- Server-side (with RLS): `createServerSupabaseClient()` in `apps/web/lib/supabase/server.ts` uses `accessToken: () => auth().getToken()`.
- Server-side (admin/bypass RLS): `createAdminSupabaseClient()` in `apps/web/lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY`. All server actions use this.
- **Never** use `session.getToken({ template: 'supabase' })` — that's the deprecated JWT template approach.

### Realtime: Broadcast Channels (not postgres_changes)
- Supabase `postgres_changes` requires RLS-authenticated sessions which don't work reliably with Clerk's third-party auth.
- All realtime features use **Broadcast** channels instead — pure pub/sub, no RLS dependency.
- Channel names and event constants live in `@cuppingtraining/shared/constants` (`packages/shared/src/constants/broadcast.ts`).
- Room sync channel: `getRoomSyncChannel(roomId)` with `{ self: true }` — handles all game events.
- Invitation notifications: `getUserInvitationsChannel(clerkId)` — host broadcasts `INVITATION_EVENTS.NEW_INVITATION` when inviting.
- Friend request notifications: `getUserFriendRequestsChannel(clerkId)` — broadcasts `FRIEND_REQUEST_EVENTS.NEW_REQUEST` and `REQUEST_ACCEPTED`.

### Broadcast Events
- Constants are defined in `packages/shared/src/constants/broadcast.ts`.
- Cup Tasters events use `CUP_TASTERS_EVENTS.*`, Cupping events use `CUPPING_EVENTS.*`, Invitation events use `INVITATION_EVENTS.*`, Friend request events use `FRIEND_REQUEST_EVENTS.*`.

| Constant | Event String | Payload | Description |
|----------|-------------|---------|-------------|
| `CUP_TASTERS_EVENTS.GAME_START` | `game_start` | `{ startedAt }` | Host starts countdown, all players sync |
| `CUP_TASTERS_EVENTS.GAME_PLAYING` | `game_playing` | `{ timerStartedAt }` | Countdown done, timer begins with exact timestamp |
| `CUP_TASTERS_EVENTS.GAME_PAUSE` | `game_pause` | `{}` | Host paused the game |
| `CUP_TASTERS_EVENTS.GAME_RESUME` | `game_resume` | `{ newTimerStartedAt }` | Host resumed, timer_started_at shifted forward |
| `CUP_TASTERS_EVENTS.PLAYER_FINISHED` | `player_finished` | `{ userId, username, elapsedMs }` | A player clicked Finish |
| `CUP_TASTERS_EVENTS.ROUND_ENDED` | `round_ended` | `{}` | Host ended the round, all players return to lobby |
| `CUP_TASTERS_EVENTS.SESSION_ENDED` | `session_ended` | `{ sessionId }` | Host ended the session |
| `CUP_TASTERS_EVENTS.ROOM_UPDATED` | `room_updated` | `{}` | Generic refresh trigger (invites, coffees, sets) |
| `CUPPING_EVENTS.CUPPING_STARTED` | `cupping_started` | `{ coffeeCount }` | Host started cupping session |
| `CUPPING_EVENTS.PLAYER_SUBMITTED` | `player_submitted` | `{ userId, username }` | A player submitted scores |
| `CUPPING_EVENTS.CUPPING_ENDED` | `cupping_ended` | `{ sessionId }` | Host ended cupping session |
| `CUPPING_EVENTS.ROOM_UPDATED` | `room_updated` | `{}` | Generic refresh trigger |
| `INVITATION_EVENTS.NEW_INVITATION` | `new_invitation` | `{}` | Notifies invited user |
| `FRIEND_REQUEST_EVENTS.NEW_REQUEST` | `new_friend_request` | `{}` | Notifies recipient of new friend request |
| `FRIEND_REQUEST_EVENTS.REQUEST_ACCEPTED` | `friend_request_accepted` | `{}` | Notifies sender that request was accepted |

### Multiplayer Game Sync
- **Countdown sync**: Host broadcasts `CUP_TASTERS_EVENTS.GAME_START` with `{ startedAt: Date.now() }`. Non-host calculates elapsed time and starts countdown from the synced number.
- **Timer sync**: Host calls `beginPlaying()` server action which returns `timerStartedAt`. Host broadcasts `CUP_TASTERS_EVENTS.GAME_PLAYING` with this exact timestamp. Non-host receives it and passes to Timer component. No DB polling — eliminates race condition.
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

### Cupping Forms
- Three cupping form types: **Simple** (`'simple'`), **SCA** (`'sca'`), and **Dom's** (`'doms'`), controlled by `CuppingFormType` union.
- **Simple Form**: Web (`apps/web/components/cupping/simple-form.tsx`), Mobile (`apps/mobile/components/cupping/SimpleForm.tsx`). 5 attributes (Aroma, Acidity, Sweetness, Body, Aftertaste) each rated 1-5 stars with notes, plus overall notes. Total score is the average (1.0-5.0).
- **SCA Form**: Web (`apps/web/components/cupping/sca-form.tsx`), Mobile (`apps/mobile/components/cupping/ScaForm.tsx`). Standard SCA protocol with 11 attributes and 100-point scale. Mobile uses stepper buttons instead of range sliders.
- **Dom's Form**: Web (`apps/web/components/cupping/doms-form.tsx`), Mobile (`apps/mobile/components/cupping/DomsForm.tsx`). Extends SCA form with 3 extra scored attributes (Sweetness, Complexity, Freshness on 1-10 scale, displayed separately from SCA total), Roast Level (Agtron number), and general notes (F/A). `DomsCuppingScores extends ScaCuppingScores`. Total score is the same SCA 100-point calculation.
- Utilities: `@cuppingtraining/shared/cupping` (`getDefaultSimpleScores`, `calculateSimpleTotalScore`, `getDefaultScaScores`, `calculateScaTotalScore`, `getDefaultDomsScores`, `calculateDomsTotalScore`).
- Solo flow: user selects form type in setup phase (default: Simple). Scores use `ScaCuppingScores | SimpleCuppingScores | DomsCuppingScores` union. Available on both web and mobile.
- Room flow: host selects form type in lobby. Stored in `rooms.settings` as `{ form_type: 'simple' | 'sca' | 'doms' }`. All players use the same form.
- Results/session detail views check `score.form_type` to render the correct form component.

### Flavor Words & Autocomplete
- `user_flavor_words` table stores per-user custom vocabulary (word + user_id, unique constraint).
- **Common words**: `COMMON_FLAVOR_WORDS` from `@cuppingtraining/shared/flavor-words` — SCA Flavor Wheel descriptors organized by `FLAVOR_CATEGORIES`.
- **Autocomplete**: `AutocompleteNotesInput` component (web + mobile) provides suggestions from common + custom words while typing in notes fields. Comma-separated input, suggestions appear after 1+ chars.
- **FlavorWordsProvider**: Context provider wrapping cupping layouts. Exposes `{ words: string[], addWord: (word) => Promise<void> }`. Web uses `getUserFlavorWords()` / `addFlavorWord()` server actions. Mobile uses `/api/mobile/flavor-words` GET/POST.
- **Save New Word Modal**: Replaces `NewWordsReview`. Simple modal with text input for single word entry. Prevents duplicates and enforces single-word vocabulary entries. Accessible via floating "Save New Word" button in results views.
- **Expandable Text**: `ExpandableText` component (web + mobile) handles long notes display with 4-line truncation. Shows expand/collapse with arrow icons (▼/▲) instead of "Show more/less" text. Prevents UI clutter while preserving full content access. Uses CSS line-clamp for web and numberOfLines for React Native.
- Utilities: `@cuppingtraining/shared/flavor-words` (`extractWordsFromScores`, `extractNewWords`, `extractNewWordsFromSamples`).
- Server actions: `apps/web/actions/flavor-words.ts` (`getUserFlavorWords`, `addFlavorWord`, `removeFlavorWord`).
- Mobile API: `apps/web/app/api/mobile/flavor-words/route.ts` (GET list, POST add word).
- Flavor Vocabulary is managed in the Dashboard Cupping tab (Common tab: read-only SCA Flavor Wheel words by category; Custom tab: add/remove user words).

### Session Report
- `SessionReportCard` component (`apps/web/components/cupping/session-report-card.tsx`) — shown in multiplayer results view and session detail page.
- Uses `generateSessionReport()` from `@cuppingtraining/shared/cupping` to compute all data.
- 3 sections: **Session Summary** (stat cards), **Score Comparison** (per-coffee avg/high/low + player score pills), **Attribute Averages** (progress bars).
- Community Notes section was removed to reduce UI clutter and focus on scoring data.
- Utility: `packages/shared/src/cupping/session-report.ts` — exports `generateSessionReport()` and types (`SessionReport`, `CoffeeSummary`, `AttributeAverage`, etc.).

### Others' Notes Feature
- **Purpose**: Allow users to record notes about what other participants said during cupping sessions
- **Data Structure**: `cupping_scores.notes` JSONB field stores attribute-specific others' notes
  ```typescript
  interface OthersNotes {
    aroma_others?: string      // "John: citrus, bright\nSarah: chocolate notes"
    acidity_others?: string    // "Mike: bright acidity\nAlex: mild"
    sweetness_others?: string
    body_others?: string
    aftertaste_others?: string
    overall_others?: string
  }
  ```
- **UI Implementation**:
  - Each cupping form attribute has two note sections: "My Notes" (for personal evaluation) and "Others' Notes" (for recording what others said)
  - "My Notes": stored in `scores` JSONB (e.g., `aroma_notes`, `acidity_notes`)
  - "Others' Notes": stored in `notes` JSONB (e.g., `aroma_others`, `acidity_others`)
- **Privacy**: Others' notes are only visible to the note author in results views (not shared with other participants)
- **Forms Updated**: Simple Form, SCA Form, Dom's Form all include others' notes functionality
- **Database Migration**: 
  ```sql
  ALTER TABLE cupping_scores 
  ALTER COLUMN notes TYPE JSONB 
  USING CASE 
    WHEN notes IS NULL OR notes = '' THEN NULL
    ELSE json_build_object('legacy_notes', notes)
  END;
  ```

### Mobile API Layer
- Mobile app communicates with the web app's Next.js API routes (not server actions directly).
- API routes live in `apps/web/app/api/mobile/` and wrap existing server action logic.
- Auth: mobile sends Clerk JWT as `Authorization: Bearer <token>` header.
- `apps/web/lib/api/auth.ts` — `getAuthenticatedProfile(request)` verifies token via `@clerk/backend`'s `verifyToken()`, resolves Clerk ID → `user_profiles.id` UUID.
- `useApiClient()` hook in `apps/mobile/lib/api.ts` — auto-attaches Clerk Bearer token, base URL from `EXPO_PUBLIC_API_URL` env var.

### Mobile API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/mobile/profile` | GET | Returns user profile (username, bio, photo_url, onboarding status) |
| `/api/mobile/profile/update-username` | POST | JSON `{ username }` — updates username (uniqueness check) |
| `/api/mobile/onboarding/check-username` | GET | `?username=xyz` — checks username availability |
| `/api/mobile/onboarding/upload-photo` | POST | Multipart form data — uploads photo to Supabase storage |
| `/api/mobile/onboarding/complete` | POST | JSON `{ username, bio, photoUrl }` — completes onboarding |
| `/api/mobile/dashboard/cup-tasters` | GET | Returns `PlayerDashboardData` (stats, accuracy trend, coffee stats, session history) |
| `/api/mobile/dashboard/cupping` | GET | Returns `CuppingDashboardData` (session history, all scored coffees) |
| `/api/mobile/flavor-words` | GET | Returns user's custom flavor words |
| `/api/mobile/flavor-words` | POST | JSON `{ word }` — adds word to user's vocabulary |
| `/api/mobile/friends` | GET | Returns user's friends list |
| `/api/mobile/friends/[friendId]` | DELETE | Removes a friend (bidirectional) |
| `/api/mobile/friend-requests` | GET | Received pending friend requests |
| `/api/mobile/friend-requests` | POST | JSON `{ username }` — sends friend request |
| `/api/mobile/friend-requests/sent` | GET | Sent pending friend requests |
| `/api/mobile/friend-requests/[id]/respond` | POST | JSON `{ accept: boolean }` — accept/decline |
| `/api/mobile/friend-requests/[id]` | DELETE | Cancel a sent pending request |
| `/api/mobile/users/search` | GET | `?q=xyz` — searches users by username prefix |

## Database Schema (key tables)
- `user_profiles` — id (UUID PK), clerk_id (TEXT, Clerk user ID for auth lookup), username, bio, photo_url
- `rooms` — host_id (UUID FK → user_profiles.id), code, status, settings (JSONB, includes form_type), timer_minutes, timer_started_at, paused_at, active_set_id
- `room_players` — room_id, user_id (UUID FK → user_profiles.id)
- `room_coffees` — room_id, label (A/B/C...), name
- `room_sets` — room_id, set_number
- `room_set_rows` — set_id, row_number, pair_coffee_id, odd_coffee_id, odd_position
- `round_results` — room_id, user_id (UUID FK → user_profiles.id), timer_started_at (round key), finished_at, elapsed_ms
- `room_invitations` — room_id, invited_user_id (UUID FK → user_profiles.id), invited_by (UUID FK → user_profiles.id), status
- `cupping_sessions` — user_id, room_id
- `cupping_samples` — session_id, sample_number, sample_label
- `cupping_scores` — sample_id, user_id, form_type ('sca' | 'simple' | 'doms'), scores (JSONB), total_score, notes (JSONB for others' notes)
- `user_flavor_words` — user_id (UUID FK → user_profiles.id), word (TEXT), unique on (user_id, word)
- `user_friends` — user_id (UUID FK → user_profiles.id), friend_id (UUID FK → user_profiles.id), unique on (user_id, friend_id), check user_id != friend_id. Bidirectional rows (both A→B and B→A) created on request acceptance.
- `user_friend_requests` — sender_id, recipient_id (UUID FKs → user_profiles.id), status ('pending'|'accepted'|'declined'), unique on (sender_id, recipient_id). Acceptance creates bidirectional `user_friends` rows.
- **Note**: All user references are UUID FKs to `user_profiles.id`. Clerk IDs are only stored in `user_profiles.clerk_id`.

## Project Structure (Turborepo Monorepo)
```
apps/
  web/                  # Next.js web app (@cuppingtraining/web)
    actions/            # Server actions (rooms.ts, cupping.ts, onboarding.ts, flavor-words.ts, friends.ts)
    app/                # Next.js App Router pages
      (auth)/           # Auth pages (Clerk)
      api/mobile/       # REST API routes for mobile app
        profile/        # GET user profile, POST update-username
        onboarding/     # check-username, upload-photo, complete
        dashboard/      # cup-tasters, cupping (GET dashboard data)
        flavor-words/   # GET list, POST add word
        friends/        # GET list, DELETE /[friendId] remove friend (bidirectional)
        friend-requests/ # GET received, POST send, /sent GET sent, /[id]/respond POST accept/decline, /[id] DELETE cancel
        users/search/   # GET search users by username prefix
      rooms/[id]/       # Multiplayer room page (cup tasters)
      cupping/          # Cupping mode
        solo/           # Solo cupping (form type selection + scoring)
        [id]/           # Cupping room (multiplayer cupping sessions)
        sessions/[id]/  # Session detail/results view
      friends/          # Friends page (send/accept requests, manage friends)
      solo/             # Solo training mode (cup tasters)
      onboarding/       # User onboarding
    components/
      training/         # Timer, Countdown, AnswerSheet, TriangulationRow
      cupping/          # ScaForm, SimpleForm, AutocompleteNotesInput, FlavorWordsProvider, NewWordsReview, SessionReportCard
      rooms/            # InvitationsList, FriendInvitePicker
      onboarding/       # OnboardingForm
      ui/               # shadcn/ui components (includes ExpandableText)
    lib/
      api/auth.ts       # Mobile API auth helper (Bearer token → profile UUID)
      supabase/         # Supabase client helpers (client.ts, server.ts, admin.ts)
    supabase/migrations/ # SQL migrations (001-024)
    proxy.ts            # Next.js 16 proxy (renamed from middleware.ts)
  mobile/               # Expo/React Native app (@cuppingtraining/mobile)
    app/
      _layout.tsx       # Root layout (ClerkProvider)
      index.tsx         # Auth + onboarding check → redirect
      onboarding.tsx    # Onboarding screen (username, bio, photo)
      (auth)/           # Sign-in / sign-up screens (Clerk)
      (tabs)/           # Bottom tab navigator (5 tabs)
        _layout.tsx     # Tab bar config
        index.tsx       # Home tab (game mode selection)
        cup-tasters/    # Cup Tasters tab
          index.tsx     # Hub (Solo / Create / Join)
          solo.tsx      # Solo cup tasters flow
        cupping/        # Cupping tab
          index.tsx     # Hub (Solo / Create / Join)
          solo.tsx      # Solo cupping flow
        dashboard/      # Dashboard tab (session history, scored coffees, flavor vocabulary)
        profile/        # Profile tab (user info, edit username, sign out)
    components/
      training/         # Timer, Countdown, AnswerSheet, TriangulationRow
      cupping/          # StarRating, SimpleForm, ScaForm, AutocompleteNotesInput, FlavorWordsProvider, NewWordsReview
      dashboard/        # AccuracyTrend, CoffeeStats
      ui/               # Button, Card, ExpandableText
    lib/
      api.ts            # useApiClient() hook (auto-attaches Clerk Bearer token)
      clerk.ts          # Clerk token cache + publishable key
      colors.ts         # Color constants
      supabase.ts       # Supabase client hooks
packages/
  shared/               # @cuppingtraining/shared (raw TypeScript, no build step)
    src/
      types/database.ts       # All TypeScript types
      cupping/                # sca-utils.ts, simple-utils.ts, session-report.ts, index.ts
      flavor-words/           # common.ts, autocomplete.ts, notes-extraction.ts, index.ts
      constants/broadcast.ts  # Channel builders + event name constants
turbo.json              # Turborepo config
package.json            # Workspace root
```

## Shared Package (`@cuppingtraining/shared`)
- **No build step** — consumers (Next.js, Expo) transpile raw TypeScript directly.
- Import paths: `@cuppingtraining/shared/types`, `@cuppingtraining/shared/cupping`, `@cuppingtraining/shared/constants`, `@cuppingtraining/shared/flavor-words`.
- Web app includes `transpilePackages: ['@cuppingtraining/shared']` in `apps/web/next.config.ts`.
- Mobile app resolves via `paths` in `tsconfig.json` + Metro `watchFolders` in `metro.config.js`.
- Types, cupping utils, flavor word utils, and broadcast constants are the single source of truth shared across apps.

## Key Server Actions (`apps/web/actions/rooms.ts`)
- `createRoom`, `deleteRoom`, `joinRoomByCode` — room lifecycle
- `inviteUserByUsername`, `respondToInvitation`, `cancelInvitation` — invitations
- `addCoffee`, `removeCoffee` — coffee management (waiting status only)
- `generateTriangulationSet`, `createEmptySet`, `updateSetRow`, `deleteSet` — set management
- `startGame(roomId, setId)` — initiates countdown with selected set
- `beginPlaying` — transitions to playing, returns `timerStartedAt`
- `pauseGame`, `resumeGame` — host-only pause/resume
- `finishRound` — any player records finish time (pause-aware elapsed calculation)
- `endRound` — host resets room to waiting for next round

## Key Server Actions (`apps/web/actions/cupping.ts`)
- `createCuppingRoom` — creates a cupping room with `type: 'cupping'` and `settings: { form_type }`
- `updateCuppingFormType` — host changes form type in lobby (waiting status only)
- `getCuppingRoomDetails` — returns room with players, invitations, coffees, and `currentUserProfileId`
- `startCuppingSession` — host starts session, creates `cupping_sessions` + `cupping_samples` rows
- `submitCuppingScores` — any player submits scores (accepts `ScaCuppingScores | SimpleCuppingScores`)
- `endCuppingSession` — host ends session, resets room to waiting
- `getCuppingResults` — returns session results with coffee names revealed
- `getCuppingDashboard` — dashboard data including `allScoresByRank` (all user's scored coffees sorted by score)
- `getCuppingSessionDetail` — session detail view

## Key Server Actions (`apps/web/actions/friends.ts`)
- `getFriends` — returns current user's friends list (joined with user_profiles for username/photo)
- `removeFriend(friendId)` — bidirectional delete (A→B + B→A) + deletes related friend_request
- `sendFriendRequest(username)` — sends friend request. Checks already-friends and pending. Returns `recipientClerkId` for broadcast
- `getMyFriendRequests()` — received pending requests (with sender profile joined)
- `getSentFriendRequests()` — sent pending requests (with recipient profile joined)
- `respondToFriendRequest(requestId, accept)` — accept/decline. Accept creates bidirectional user_friends rows. Returns `senderClerkId`
- `cancelFriendRequest(requestId)` — cancels a sent pending request
- `searchUsers(query)` — username prefix search, excludes self, limit 10

### Friends Feature
- **Model**: Request/accept flow. Sending a request creates a `user_friend_requests` row. Acceptance creates bidirectional `user_friends` rows (A→B + B→A).
- **Broadcast**: `getUserFriendRequestsChannel(clerkId)` — `FRIEND_REQUEST_EVENTS.NEW_REQUEST` notifies recipient, `REQUEST_ACCEPTED` notifies sender.
- **Web Friends** (`/friends`): Dedicated page with 3-part structure — Send Request input, Incoming Requests (Accept/Decline), Sent Requests (cancel), My Friends pills (remove). Has its own navbar link.
- **Room Invite Quick-Pick**: `FriendInvitePicker` component — uses `getFriends()` which reads `user_friends`, so only accepted friends appear.
- **Mobile Profile**: Friends section in profile tab with same 3-part structure.

### Web Dashboard
- Dashboard has two tabs: **Cup Tasters** and **Cupping**.
- **Cup Tasters tab**: Session History list.
- **Cupping tab**: Session History, **All Scored Coffees** (searchable + sortable by score high/low, date new/old via dropdown), and **Flavor Vocabulary** (Common/Custom sub-tabs).
- `CuppingDashboardData` includes `allScoresByRank: CuppingScoreEntry[]` — all user's cupping scores sorted by total_score descending.
- Web navbar links (signed in): Cup Tasters, Cupping, Dashboard, Friends. No Settings page.

## UI/UX Improvements

### Cupping Results Layout Redesign
- **Coffee-Focused Organization**: Results pages reorganized from player-focused tabs to coffee-focused containers. Each coffee gets its own card with player tabs inside for comparing different players' evaluations of the same coffee.
- **Progressive Coffee Name Reveal**: Individual reveal buttons for each coffee name with animated effects. Prevents bias during scoring by keeping coffee identities hidden until deliberately revealed.
- **Animated Reveal Effects**: Coffee name reveal features scattered particle animation (8 animated dots) plus central sparkle emoji (✨) with spin animation, followed by fade-in text animation lasting 1.8 seconds total.
- **Session Data Persistence**: Proper "End Session" functionality added to cupping multiplayer rooms. Host can save session data to database and navigate to detailed results view instead of just returning to lobby.

### Expandable Text System
- **Cross-Platform Implementation**: `ExpandableText` components for both web (`apps/web/components/ui/expandable-text.tsx`) and mobile (`apps/mobile/components/ui/ExpandableText.tsx`).
- **4-Line Truncation**: Default maxLines of 4 with automatic overflow detection using CSS line-clamp (web) or React Native numberOfLines.
- **Smart Show More/Less**: Only appears when text actually overflows. Uses arrow icons (▼/▲) for cleaner visual design.
- **Word Breaking**: Proper CSS word-break and overflow-wrap to handle long words without container overflow.
- **Measurement Strategy**: Web uses hidden duplicate element for height measurement, mobile uses onLayout events.

### Cupping Form Enhancements
- **Bias-Free Scoring**: Removed total score displays from coffee sample tabs during scoring phase to prevent confirmation bias and encourage independent evaluation.
- **Improved Notes UI**: All notes inputs updated to use expandable text areas with minimum height of 64px (min-h-16) for better visual consistency.
- **Mobile Text Areas**: Increased height and improved styling for notes inputs on mobile to provide more comfortable writing experience.

### Results Page Flow Optimization
- **Individual Review First**: Results layout encourages reviewing each coffee individually before seeing comparative statistics.
- **Statistics At Bottom**: Session summary, score comparison, and attribute averages moved to bottom of results page to promote thorough individual evaluation first.
- **Host Session Management**: Clear distinction between "End Session & Save Results" (primary action) and "Back to Lobby" (secondary action) for better user flow.

### Animation System
- **Tailwind CSS Animations**: Uses Tailwind's animate-in, fade-in, slide-in-from-bottom, animate-ping, and animate-spin utilities.
- **Coordinated Timing**: Multi-stage animations with precise timing (scattered particles → sparkle → text fade-in) for polished user experience.
- **State Management**: React state manages animation phases (waiting → animating → revealed) to prevent conflicts and ensure smooth transitions.

### Code Quality Improvements
- **Unused Code Cleanup**: Removed unused score calculations and variables after removing bias-inducing score displays.
- **Cross-Platform Consistency**: Ensured both web and mobile apps have feature parity for expandable text and cupping form improvements.
- **Component Reusability**: Created shared expandable text components that can be used throughout the application for consistent long text handling.

## Key Conventions
- `apps/web/proxy.ts` is the Next.js 16 replacement for `middleware.ts`. Uses `clerkMiddleware()`. `/api/mobile(.*)` is in the public routes list — mobile API routes handle their own auth via Bearer tokens.
- Server actions in `apps/web/actions/` use `createAdminSupabaseClient()` (service role) to bypass RLS.
- Server actions use `getProfileId()` helper to resolve Clerk auth to `user_profiles.id` UUID. All DB operations use UUID profile IDs, not Clerk IDs.
- `inviteUserByUsername` returns `{ invitation, invitedClerkId }` — the Clerk ID is needed for broadcast channel naming (`getUserInvitationsChannel(clerkId)`).
- `getRoomDetails` returns `{ room, currentUserProfileId }` — the client uses `currentUserProfileId` for `isHost` checks and `player_finished` broadcasts.
- RLS helper function `auth_profile_id()` resolves `auth.jwt()->>'sub'` (Clerk ID) to `user_profiles.id` UUID. Used by `is_room_member()`, `is_room_host()`, and all RLS policies.
- Web client components use `useSupabaseClient()` hook for Supabase access.
- Timer component accepts `hideControls` and `isPaused` props for multiplayer mode.
- Host is source of truth for all game state transitions (start, pause, resume, end round).
- All players sync via Broadcast — no DB polling during gameplay.
- All shared types, cupping utils, and broadcast constants are imported from `@cuppingtraining/shared/*` — never use local `@/types/database` or `@/lib/cupping/`.
- Mobile API routes in `apps/web/app/api/mobile/` use `getAuthenticatedProfile()` from `apps/web/lib/api/auth.ts` — verifies Bearer token via `@clerk/backend`'s `verifyToken()`.
- Mobile app uses `useApiClient()` hook — all API calls go through `EXPO_PUBLIC_API_URL/api/mobile/*`.
- Mobile styling uses React Native `StyleSheet` with color constants from `apps/mobile/lib/colors.ts` — no UI library.
- Mobile navigation uses Expo Router `(tabs)` group with 5 bottom tabs: Home, Cup Tasters, Cupping, Dashboard, Profile.
- Solo flows (Cup Tasters + Cupping) are entirely client-side on mobile — no API calls needed during gameplay.
- Mobile root `index.tsx` checks profile via API on launch — shows "Could not connect to server" with Retry on network failure instead of false-redirecting to onboarding.
- `EXPO_PUBLIC_API_URL` should be `http://localhost:3000` for iOS simulator, or the Mac's local IP (e.g. `http://172.20.10.2:3000`) for physical devices.

## Code Organization & File Size Guidelines

### File Size Limits
- **Maximum 1000 lines per file** — files exceeding this should be refactored into smaller, focused modules
- **Prefer 500-800 lines** as the sweet spot for readability and maintainability
- **Break down large components** into hooks, UI components, and utilities

### Refactoring Strategy
When files exceed 1000 lines, follow this pattern:

1. **Extract Custom Hooks**: Move state management and effects to separate hooks
   - Example: `useRoomGameState()`, `useRoomRealtime()`
   - Location: `/hooks/` directory

2. **Extract UI Components**: Split large render functions into focused components
   - Example: `RoomLobby`, `RoomPlaying`, `RoomInputting` 
   - Location: `/components/` directory with appropriate sub-folders

3. **Extract Types**: Move type definitions to shared type files
   - Example: `RoomWithDetails` in `/types/room.ts`
   - Import from `@/types/` for consistency

4. **Keep Main File as Orchestrator**: Main page/component should focus on:
   - Data loading and error handling
   - Event handler coordination  
   - Conditional rendering logic
   - Props passing between components

### Examples of Good Refactoring
- **Before**: `rooms/[id]/page.tsx` (1708 lines)
- **After**: 
  - `rooms/[id]/page.tsx` (731 lines) - main orchestrator
  - `hooks/use-room-game-state.ts` (160 lines) - game state management
  - `hooks/use-room-realtime.ts` (170 lines) - realtime communication
  - `components/rooms/room-lobby.tsx` (400+ lines) - lobby UI
  - `components/rooms/room-playing.tsx` (200+ lines) - playing UI
  - `components/rooms/room-inputting.tsx` (200+ lines) - inputting UI
  - `types/room.ts` (5 lines) - type definitions

This results in better code organization, easier testing, and improved maintainability.

## Commands
- `npm run dev` — start all apps via Turborepo
- `npm run dev:web` — start only the web app
- `cd apps/mobile && npx expo start --clear` — start mobile app (Expo dev server)
- `npm run build` — production build (all packages)
- `npm run lint` — run ESLint (all packages)

## Mobile App Development Phases
- **Phase 1** (done): Onboarding, bottom tab navigation, Solo Cup Tasters, Solo Cupping, Profile (with username editing)
- **Phase 2** (done): Dashboard with stats, accuracy trend, coffee performance, session history (Cup Tasters + Cupping tabs)
- **Phase 3** (future): Multiplayer rooms with real-time Broadcast sync (requires ~25 API routes)

## Session Management & Authentication

### SessionKeeper Component
- **Location**: `apps/web/components/session-keeper.tsx` — global session keep-alive component mounted in root layout
- **Purpose**: Maintains Clerk session persistence during long gaming sessions (1+ hours) without user logout
- **Implementation**: 
  - **30-minute automatic refresh**: Background `session.touch()` every 30 minutes to prevent token expiration
  - **Page focus refresh**: Session refresh when user returns to tab from other apps/tabs
  - **No activity tracking**: Activity-based refresh removed to prevent UX issues and complexity
- **Session Strategy**: 
  - Supports multi-tab usage during games (users can check other tabs/apps without losing session)
  - Eliminates logout issues during extended gameplay sessions
  - Simple dual-mechanism approach: periodic + focus-based refresh
- **Error Handling**: Session refresh failures logged but don't interrupt user experience
- **Usage**: Automatically active for all authenticated users, no configuration needed

### Authentication Architecture
- **Clerk Integration**: Uses `@clerk/nextjs` with third-party provider setup for Supabase
- **Token Management**: Short-lived JWTs (60-second default) with automatic background refresh
- **Session Persistence**: Hybrid approach with long-lived cookies on Clerk's domain + short-lived session tokens
- **Security**: Automatic CSRF protection, session fixation prevention, XSS mitigation through short token lifetimes

### Session Management Optimizations (2024-04-14)
- **Problem**: Auth persistence issues in game rooms — users getting logged out during long sessions
- **Root Causes**: 
  - Conflicting session management between global SessionKeeper and room-specific refresh logic
  - Realtime channel recreating on every game state change (timer_started_at dependency)
  - Multiple visibilitychange listeners causing session conflicts
- **Solutions Applied**:
  - **Removed duplicate session refresh**: Eliminated room-specific `session.touch()` calls (every 5 min), rely on global SessionKeeper (30 min)
  - **Fixed Realtime dependencies**: Removed `room.timer_started_at` from useRoomRealtime dependencies — channels only recreate on `roomId` change
  - **Unified event listeners**: Single visibilitychange listener in SessionKeeper, removed duplicate room-level listeners
  - **Simplified auth flow**: Room pages focus on game logic only, delegate all session management to global components
- **Result**: Stable authentication during 1+ hour gaming sessions, no conflicts between Clerk + Supabase realtime
