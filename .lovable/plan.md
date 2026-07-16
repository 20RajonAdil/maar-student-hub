
# MAAR Student Hub — Build Plan

## Reality check on your constraints

- **Vanilla HTML/CSS/JS is not possible on this platform.** This project is scaffolded on TanStack Start + React + Supabase and cannot be swapped out. I'll write the app in React/TSX but keep it clean, well-commented, and organized so it's readable and maintainable. If you need pure HTML/CSS/JS, you'd need a different host.
- **Scope is enormous.** What you described is a full product suite. I'll design the whole architecture + database schema up front, then build in phases. Phase 1 lands a working, production-quality slice; later phases extend it.
- **Google OAuth:** I'll wire it via Lovable Cloud's managed provider. Your `GOOGLE_OAUTH_CLIENT_ID` isn't needed for that flow — the platform manages the credentials.
- **AI assistant:** built later using Lovable AI Gateway (no extra keys); designed as a pluggable provider from day one.

## Architecture

- **Frontend:** React 19 + TanStack Start (file-based routing, SSR-aware), Tailwind v4 with a semantic design-token system in `src/styles.css`, shadcn/ui primitives customized to the MAAR brand.
- **Backend:** Lovable Cloud (Supabase) — Postgres, Auth, Storage, RLS on every table.
- **Auth gate:** `_authenticated/` layout guards all private routes. `/auth` is public. Onboarding is a gated route that redirects here on first login until `profiles.onboarding_completed = true`.
- **Data access:** `createServerFn` + `requireSupabaseAuth` for user-scoped reads/writes; browser Supabase client for realtime + auth flows.
- **State:** TanStack Query for server state; local component state for UI.

## Design system (brand)

- Deep navy `#0B1F3A` (trust), emerald `#10B981` (progress), amber `#F59E0B` (deadlines), muted violet `#7C6BF2` accent (creativity), warm off-white surface for light mode, near-black surface for dark mode.
- Typography: Inter for UI, Fraunces for display headings (distinct from generic AI look).
- Rounded 12–16px, soft shadows, calm motion (150–250ms ease-out), full reduced-motion + keyboard support, WCAG AA contrast.
- Logo: geometric wordmark "MAAR" with a stacked square glyph.

## Database schema (Phase 1)

```text
profiles                — 1:1 auth.users; name, country, education_system, year, learning_style, prefs, onboarding_completed
subjects                — user-scoped; name, color, code
timetable_events        — user-scoped; title, subject_id?, starts_at, ends_at, rrule, location, category, color
homework                — user-scoped; title, subject_id?, due_at, priority, est_minutes, status, notes
notebooks               — user-scoped; name, subject_id?, color
notes                   — user-scoped; notebook_id?, title, content(html), tags[], is_favorite, updated_at
focus_sessions          — user-scoped; started_at, ended_at, planned_seconds, actual_seconds, mode, subject_id?, note
user_roles              — separate table; app_role enum; has_role() SECURITY DEFINER
```
Every table: RLS ON, `auth.uid() = user_id` policies, `GRANT` to `authenticated`, `service_role`. Indexes on `(user_id, ...)` for the query patterns each module uses.

## Routes (Phase 1)

```text
/                              public landing (hero, features, sign-in CTA)
/auth                          sign in / sign up (email+password + Google)
/_authenticated/onboarding     multi-step wizard
/_authenticated/dashboard      today view: timetable, homework, focus, streak, quick actions
/_authenticated/timetable      day / week / month views
/_authenticated/notes          notebooks sidebar + editor
/_authenticated/homework       list + filters + detail drawer
/_authenticated/focus          Pomodoro (timestamp-accurate) + session history
/_authenticated/settings       profile, appearance, account
```

## Phased delivery

**Phase 1 (this turn):**
1. Enable Lovable Cloud, configure Google sign-in.
2. Design system + brand tokens + logo.
3. Migration: all Phase 1 tables + RLS + grants + trigger to auto-create `profiles` row on signup.
4. Public landing + `/auth` (email/password + Google).
5. Onboarding wizard (writes to `profiles`, gates dashboard until complete).
6. Dashboard shell with today's data.
7. Timetable (week view, create/edit/delete events).
8. Notes (notebooks + list + rich editor with autosave).
9. Homework (list, filters, add/edit, complete).
10. Focus Room (timestamp-accurate Pomodoro that survives refresh, session log).
11. Settings (profile edit, dark/light).
12. Footer with © 2026 MAAR Student Hub.

**Phase 2 (later turns, on request):** Calendar month view + recurring rules + ICS import, Flashcards + spaced repetition, Grade Tracker with charts, Study Planner + goals + streaks, File Manager (Supabase Storage), Study Tools (calculators, converters), Achievements.

**Phase 3:** Source-Based Study Assistant (Lovable AI Gateway, RAG over uploaded files), Official resources library, Accessibility polish pass, i18n scaffold.

## Non-negotiables I'll enforce

- No secrets in client code; `SUPABASE_SERVICE_ROLE_KEY` never leaves server functions.
- Input validation with Zod on every server function.
- XSS-safe rich text (sanitize on save + render).
- Roles in a separate `user_roles` table with `has_role()` SECURITY DEFINER (no roles on `profiles`).
- Every route has `errorComponent` + `notFoundComponent`.
- Loader/Query pattern (`ensureQueryData` + `useSuspenseQuery`), never `useEffect` + fetch.

Reply "go" to build Phase 1, or tell me what to change.
