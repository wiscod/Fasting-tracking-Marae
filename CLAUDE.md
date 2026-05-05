# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint via Next.js
```

There is no test suite configured.

## Environment setup

Copy `.env.local.example` to `.env.local` and fill in the Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Run `supabase/schema.sql` once in the Supabase SQL editor to create tables, indexes, and RLS policies. Optionally seed with `supabase/seed.sql` for test data.

## Architecture

**Stack**: Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (PostgreSQL via `@supabase/supabase-js`)

**Identity model**: No authentication. Each device generates a UUID stored in `localStorage` under the key `jeunes_device_id`. All data reads/writes are scoped to this device ID. The user's first name is optionally stored in `localStorage` under `jeunes_user_name`. The Supabase client is created with `auth: { persistSession: false }` and the RLS policies are fully permissive to the `anon` role (this is intentional for the current testing phase).

### Page / component pattern

Server `page.tsx` files are thin shells that read the current ISO week (server-side via `lib/week.ts`) and pass it as props to a `"use client"` component. All data fetching and state live in the client component. This split is used consistently:

- `/jeune/equipe/page.tsx` → `client.tsx` (`TeamFastClient`)
- `/jeune/perso/page.tsx` → `client.tsx` (`PersonalListClient`)
- `/jeune/perso/nouveau/page.tsx` → `editor.tsx` (`PersonalEditor mode="create"`)
- `/jeune/perso/[id]/page.tsx` → `editor.tsx` (`PersonalEditor mode="edit"`)

### Data layer (`lib/`)

`lib/supabase.ts` — singleton Supabase client (module-level cache, safe for client-side use).

`lib/data.ts` — all DB operations. The subject save pattern for both team and personal fasts is: upsert the `fast_entries` row, then **delete all** existing `fast_entry_subjects` and re-insert the new set. There is no incremental diff.

`lib/types.ts` — shared TypeScript types mirroring the DB schema (`WeeklyFast`, `WeeklyFastSubject`, `FastEntry`, `FastEntrySubject`, `FastKind`).

`lib/week.ts` — ISO 8601 week calculation (`getIsoWeek`). Used server-side in page components to seed the initial week.

`lib/deviceId.ts` — `getDeviceId()`, `getStoredName()`, `setStoredName()`. Guards `typeof window === "undefined"` for SSR safety; must only be called inside `useEffect` or event handlers.

### Database schema (4 tables)

- `weekly_fasts` — admin-configured weekly fasts, unique on `(year, week)`.
- `weekly_fast_subjects` — up to N prayer subjects per week, ordered by `position`. Configured by an admin directly in Supabase; the app auto-creates the `weekly_fasts` row but expects the subjects to be pre-seeded.
- `fast_entries` — one row per device per fast. `kind` is `'team'` or `'personal'`. A partial unique index enforces one team entry per `(device_id, weekly_fast_id)`.
- `fast_entry_subjects` — per-subject intercession count and hours for a given `fast_entry`.

### Hours logic

Each subject row has an `hours` field. A separate `global_hours` field at the entry level overrides the sum of per-subject hours for the displayed total. `TotalsBar` renders the computed total against a 24 h goal.

### Shared UI components

`SubjectsEditor` — controlled grid component for editing subject rows. Rows with `editable: true` render a text input for the label; rows with `editable: false` show a read-only label from the admin-defined subjects.

`TotalsBar` — progress bar showing `totalHours / goalHours` as a percentage.

`Header` — sticky top bar with optional back-link, used on all inner pages.

### Tailwind conventions

Custom component classes are defined in `app/globals.css` via `@layer components`: `.btn`, `.btn-primary`, `.btn-secondary`, `.input`, `.card`, `.label`. The brand color scale (`brand-50` through `brand-700`) maps to purple/violet and is defined in `tailwind.config.ts`.
