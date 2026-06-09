
# FounderForge — Member Panel

A full authenticated app at `/app/*` with a collapsible left sidebar, profile onboarding, and 9 feature modules. First signup becomes admin. Stays on the existing blue glassmorphism dark theme.

## 1. Database (one migration)

Extend `profiles` and add new tables. All public tables get GRANTs + RLS + policies. `app_role` enum + `user_roles` + `has_role()` security-definer function (per project rules — roles never live on profiles).

**Profiles — add columns:**
`date_of_birth date`, `bio text`, `roles text[]` (multi: entrepreneur / creator / student / builder / investor), `skills text[]`, `interests text[]`, `looking_for text[]` (cofounder / collab / mentor / hire), `location text`, `links jsonb` (twitter, github, linkedin, website, youtube), `creator_enabled boolean`, `creator_platforms jsonb`, `onboarded boolean default false`.

**New tables:**
- `user_roles (user_id, role app_role)` — `admin` | `member`. Trigger: first row in `auth.users` → admin, all others → member.
- `posts` — type enum (`showcase` | `idea` | `streak` | `creator`), title, body, media_urls[], tags[], user_id, validation_score (nullable), validation_report jsonb (nullable). Drives Showcase, Idea board, Streak feed, Creator feed (filtered by `type` + tags).
- `post_votes`, `post_comments` — community voting on ideas + comments everywhere.
- `streaks (user_id, current, longest, last_post_date)` — incremented by trigger on `posts` insert where type=streak.
- `cofounder_requests (from_user, to_user, message, status)` — pending/accepted/declined. On accept → unlock DM.
- `direct_messages (from_user, to_user, body, attachment_url, created_at)` — 1-1 DMs unlocked by accepted cofounder match.
- `resources (title, description, url, file_path, category, posted_by, is_official)` — members post; admin posts flagged official.
- `hall_of_fame (title, winner_user_id, challenge, built_thing, image_url, year)` — admin-only writes.
- `groups (name, description, image_url, created_by)` — admin-only create.
- `group_members (group_id, user_id)` — auto-join all members to default groups; admin manages.
- `group_messages (group_id, user_id, body, attachment_url, attachment_type, created_at)` — realtime chat.

**XP rules (trigger-based):** +10 per post, +5 per comment, +2 per vote received, +20 per streak day, +50 per validated idea. Leaderboard = `profiles` ordered by `xp` / `streak_days`.

**Realtime:** enable on `group_messages`, `direct_messages`, `posts`, `cofounder_requests`.

**Storage buckets:** `avatars` (public), `post-media` (public), `resources` (public), `chat-attachments` (public), `hall-of-fame` (public).

## 2. Auth + onboarding

- Update `handle_new_user` trigger: also assign `app_role` (first user = admin, else member), use Google `picture` for `avatar_url`.
- Signup flow → redirect to `/app/onboarding` if `onboarded=false`. Required fields: name, DOB, avatar, roles (multi), skills, interests, looking_for. Optional: bio, location, links, creator toggle. On save → `onboarded=true` → `/app/dashboard`.
- Profile is editable later at `/app/profile`.

## 3. Routes (TanStack file-based, all under `_authenticated`)

```
src/routes/_authenticated/
  route.tsx              (integration-managed gate — already exists)
  app.tsx                (sidebar layout shell, Outlet)
  app.dashboard.tsx      (today's streak, recent posts, XP, quick actions)
  app.profile.tsx        (view/edit own profile + creator section)
  app.onboarding.tsx     (first-time profile wizard)
  app.showcase.tsx       (feed with filter: type, tag, sort)
  app.ideas.tsx          (post idea + AI validate button + community votes)
  app.cofounders.tsx     (browse grid + filters + send request)
  app.cofounders.requests.tsx  (incoming/outgoing requests)
  app.messages.tsx       (DM inbox list)
  app.messages.$userId.tsx     (1-1 thread, only if matched)
  app.resources.tsx      (vault list + post form; admin official badge)
  app.leaderboard.tsx    (XP rank + streak rank tabs)
  app.hall.tsx           (Hall of Fame; admin edit controls)
  app.community.tsx      (groups list + sidebar)
  app.community.$groupId.tsx   (Instagram-style group chat)
  app.admin.tsx          (admin-only: create groups, post hall of fame, mark official resources)
```

## 4. Sidebar shell (`app.tsx`)

Uses shadcn Sidebar (`collapsible="icon"`) with `SidebarTrigger` in the top bar. Items: Dashboard, Showcase, Post Idea, Co-Founders, Messages, Community, Resources, Leaderboard, Hall of Fame, Profile, (Admin if role=admin), Sign out. Mobile: sidebar collapses to offcanvas + hamburger; desktop: persistent rail. Top bar shows XP + 🔥 streak badge + avatar.

## 5. Feature implementation notes

- **Showcase / Ideas / Creator feed** — same `posts` table, filtered by `type`. Card shows author avatar, title, body, media, tags, votes, comments. Filter pills + search.
- **Idea Validator** — `validateIdea` server fn calls Lovable AI Gateway (`google/gemini-2.5-flash`) returning JSON `{score, strengths, risks, market, suggestions}`. Stored on post. Community can also upvote/comment.
- **Co-founder matching** — grid of profiles filtered by role/skills/looking_for. "Connect" sends request with optional message. Recipient accepts in `app.cofounders.requests` → DM unlocked.
- **Streak** — `app.dashboard` has "Post today's update" composer creating a `type=streak` post; trigger advances streak counter. Calendar heatmap shows last 30 days.
- **Resource Vault** — list with category filter; member submission form; admin-posted resources get an "Official" gold badge.
- **Leaderboard** — two tabs (XP, Streak), top-100, rank chips, current user highlight.
- **Hall of Fame** — public-readable, admin-only write; card grid with image + winner + what they built.
- **Community chat** — Realtime subscription on `group_messages` filtered by `group_id`. Composer supports text + image + file (uploaded to `chat-attachments`). Each message shows avatar + display name + timestamp, Instagram-style (own messages right-aligned in primary tint, others left-aligned glass).

## 6. Security

- RLS on every table. `has_role(auth.uid(), 'admin')` gates admin writes on `hall_of_fame`, `groups`, official resources.
- Group messages: only members of group can read/write (subquery against `group_members`).
- DMs: only sender/recipient can read; only allowed if an accepted `cofounder_requests` row exists between them.
- Profiles publicly readable (already is); updates restricted to owner.
- Storage policies: authenticated upload, public read for media buckets.

## 7. Technical notes

- Server fns for: `validateIdea` (AI), `sendCofounderRequest`, `respondCofounderRequest`, `sendDM`, `sendGroupMessage`, `postUpdate`, `upvotePost`, `commentPost`, `uploadAvatar`. All use `requireSupabaseAuth`.
- Confirm `attachSupabaseAuth` is in `src/start.ts` (already is from prior auth setup).
- Realtime subscriptions in browser via `supabase.channel(...)`.
- Zod validation on all server-fn inputs (length caps, URL format, allowed enums).
- No new env vars needed — `LOVABLE_API_KEY` already present for AI.

## 8. Out of scope (this iteration)

- Email notifications for requests/DMs.
- Push notifications.
- Group voice/video.
- Admin moderation queue (admin can still delete via DB).

## 9. Deliverables checklist

- 1 migration (schema + RLS + GRANTs + triggers + realtime + first-admin trigger).
- 5 storage buckets via storage tool.
- ~16 route files + sidebar shell + onboarding wizard.
- Profile component (view + edit + creator section).
- Reusable PostCard, PostComposer, ProfileCard, ChatMessage, FilterBar.
- Server fns + AI validator.
- Landing page unchanged; "Join the Forge" routes to `/auth` → onboarding → `/app/dashboard`.
