# Plan: Admin groups, bug fixes, Challenges, Feed, perf

This is a large batch. I'll ship it in one pass, organized below.

## 1. Bug fixes (existing app)

- **Co-founder requests not visible / DMs not loading**: in `_authenticated.app.messages.tsx` the nested-select aliasing on `cofounder_requests` is fragile and silently returns empty. Switch to two simple queries: fetch requests where I'm sender or recipient + status `accepted`, then fetch profiles by `id IN (...)`. Same fix in `cofounders.requests.tsx`.
- **Streak XP duplication**: trigger `posts_after_insert` adds 10 (post) + 20 (streak) = 30. Change so `type='streak'` posts award only 10 XP total.
- **Streak posts mixed with ideas**: route streak posts to the existing "Today's update" composer on Dashboard. Remove "post streak" from Ideas page; Ideas shows only `type='idea'` posts with a top-right "Post Idea" button (matching Showcase pattern). Apply same pattern to Resources (top-right "Add Resource").
- **Community chat won't open**: `community.tsx` "Open chat" links to `/app/community/$groupId`. Confirm route file naming + Link `params`. Likely cause: membership check requires row in `group_members` but join button doesn't insert for admin-created groups for the admin user. Fix join logic + ensure RLS allows member to read group_messages after join.
- **Slow nav between sections**: every page does its own `supabase.from(...).select()` in `useEffect` with no caching. Wrap the existing app in `QueryClientProvider` (already in root) and convert page fetches to `useQuery` with `staleTime: 30s`. Prefetch profile/me once in shell and share via context.

## 2. Co-founder visibility toggle

- Add `profiles.cofounder_visible boolean default true`.
- Profile page: Switch to toggle it.
- `cofounders.tsx` query: `.eq('cofounder_visible', true)`. Hide current user too.

## 3. Admin community group management

New admin UI on `/app/community` (admin-only section above member group list):
- Create group (name, description, optional cover, `is_pinned`).
- Rename / edit description / delete group.
- Manage members: list, remove, promote (add `group_members.role` enum `member|moderator`).
- Pin/unpin group (sorts first).
- Moderate messages: delete any `group_messages` row.

Migration: add `groups.is_pinned bool`, `groups.cover_url text`, `group_members.role text default 'member'`. Admin RLS already exists via `has_role`.

## 4. Challenges feature

New tables:
- `challenges`: title, description, cover_url, status (`upcoming|ongoing|past`), starts_at, ends_at, created_by (admin).
- `challenge_enrollments`: challenge_id, user_id, unique.
- `challenge_requests`: user_id, title, description, status (`pending|approved|rejected`), admin can respond.
- `challenge_request_messages`: WhatsApp-style chat between requester and admin (text only). Realtime.

Routes:
- `/app/challenges` — list cards grouped by status, top-right "Submit Challenge Idea" → modal. Enroll button on each; shows enrolled member avatars.
- `/app/challenges/$id` — detail, enroll, enrolled list.
- `/app/admin/challenges` — admin CRUD + inbox of requests with chat thread.

Landing page: add Challenges section showing upcoming/ongoing; "Enroll" → redirect to `/auth`.

## 5. Feed section

New route `/app/feed` (default landing after onboarding instead of dashboard).
- Vertical Instagram-style feed of ALL posts (showcase + idea + streak + creator) newest first.
- Card: avatar, name, role under name, XP + streak chips, post body, image (signed URL), like button (realtime via existing `post_votes`), comment count → expandable, repost button (creates new post with `repost_of` FK).
- Realtime: subscribe to `posts` insert + `post_votes` changes for visible posts.
- Add `posts.repost_of uuid` column.

## 6. Landing page + header

- `Navbar`: change to `backdrop-blur-xl bg-background/60` with semi-transparent menu. Show "Open Panel" button on mobile (currently hidden — add to mobile menu drawer too).
- Add `<Challenges />` section between Features and CTA: pulls `challenges` where status in (upcoming, ongoing), public read policy. "Enroll" → `/auth?redirect=/app/challenges/{id}`.

## 7. Perf

- Move data fetching to `@tanstack/react-query` for all panel pages.
- Memoize sidebar; avoid re-render storm from `useRouterState` selecting full pathname (already selecting just pathname — fine).
- Use signed URLs cached in a single `signedUrl` map (react-query keyed on path).
- Lazy-load heavy routes via existing TanStack code splitting (automatic for file routes — already on).

## Technical notes

- One migration covering: `cofounder_visible`, `groups.is_pinned/cover_url`, `group_members.role`, challenges tables, `posts.repost_of`, fixed `posts_after_insert` trigger, public-read policy on `challenges` (anon SELECT where status != 'past').
- All new tables get GRANTs + RLS per project rules.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE challenges, challenge_enrollments, challenge_request_messages, posts, post_votes`.

## Out of scope (will not do this turn)

- Push/email notifications for challenge approvals.
- Video posts/feed.
- Story-style ephemeral content.
- Group voice/video.

Ready to implement on approval.
