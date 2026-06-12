## BuildVerse Community — Fixes & Features

Large scope across admin, challenges, profile, messaging, community. I'll group by file/area and ship in one batch of edits + one migration.

### 1. Preview / build stability
- Audit current runtime errors via dev-server logs and console.
- Fix any broken imports or missing route registrations.

### 2. Admin Panel
**`_authenticated.app.admin.challenges.tsx`** — full CRUD: create (title, description, cover, status, dates), edit inline, delete with confirm. Already partially exists; expand.

**`_authenticated.app.admin.requests.tsx`** (new route) — unified Requests page listing both `cofounder_requests` and `challenge_requests`. Admin can view, change status, and chat back via existing `challenge_request_messages` / new cofounder messaging.

Add link to it from main admin panel.

### 3. Challenge Participation
**`_authenticated.app.challenges.tsx`** — already has View + Enroll. Rename "Enroll" → "Participate" and add tabs: Active / Completed / My participated.

**`_authenticated.app.challenges.$id.tsx`** — already shows participants. Make each participant clickable → `/app/profile?u=<id>` (or a `/app/u/$id` route). Add description, dates, participant count, submissions list (use existing post type=`challenge` or add a `challenge_submissions` join — simpler: filter posts by `challenge_id`).

### 4. Profile (Instagram-style)
**`_authenticated.app.profile.tsx`** — currently only "me". Refactor to accept optional `?u=<userId>` search param OR add `_authenticated.app.u.$userId.tsx` route.
- Own profile: Connect + Edit Profile buttons.
- Other profile: Connect button only.
- Below info: posts by that user with ⋮ menu (Edit/Delete) for owner.
- Add `participated_challenges` section.

Make profile avatars/names clickable across feed, leaderboard, hall, cofounders, messages list, challenge participants.

### 5. Messaging
**`_authenticated.app.messages.tsx`** + `$userId.tsx` — already exists with realtime. Verify:
- Conversation list shows all users you've DM'd.
- Real-time INSERT subscription works (already wired).
- Add ability to start new chat (search users).

### 6. Community Chat
**`_authenticated.app.community.$groupId.tsx`** — already exists. Verify "Open Chat" button on community list routes here and that messages send/receive via `group_messages` with realtime subscription.

Fix the button on `_authenticated.app.community.tsx` to actually navigate.

### 7. Migration
- Add `challenge_id` to `posts` (nullable) for challenge submissions, OR add `challenge_submissions` table. Going with column on posts for simplicity.
- Add `cofounder_request_messages` table for admin replies if needed (or admin replies via DM — simpler).

### Approach
Implement in this order: migration → admin pages → challenge enhancements → profile refactor → cross-link clickable profiles → verify messaging/community chat realtime.
