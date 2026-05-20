# atelierm-planning

Next.js 14 planning app for a French construction company (Atelier M).

## Stack

- Next.js 14 App Router (TypeScript), monolithic `app/page.tsx`
- Supabase (postgres, jsonb state, RLS)
- @dnd-kit/core for drag-and-drop
- Tailwind CSS
- Vercel auto-deploy from `main`

## Deploy workflow

**Always push directly to `main` after every change** — Vercel auto-deploys from main. No confirmation needed, no feature branches required. Commit → push to main → done.

## Key conventions

- All app logic lives in `app/page.tsx` (monolithic by design)
- Calendar lane order persisted in Supabase as `calendarLaneOrder: string[]`
- Span-based greedy packing for lane assignment (first→last planningWeek of each chantier)
- `LANE_H = 26px` per row
- Category colors: emerald (AO), violet (Particulier), blue (Pro)
- Difficulty colors: amber-500 (jaune), orange-500 (orange), red-500 (rouge)
