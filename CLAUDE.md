# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interlude Tracker is an internal P&L, workload, and team management tool for Interlude Studio. It is a Next.js 14 App Router app (TypeScript) using Tailwind CSS for styling and Supabase (PostgreSQL) for persistence. It is deployed on Vercel and the repo lives at https://github.com/Rafuego/profitandloss.

## Commands

```bash
npm run dev      # local dev server at localhost:3000
npm run build    # production build (runs on Vercel automatically)
npm run lint     # ESLint
```

No test suite exists.

## Architecture

The entire application is a single React component tree with no routing:

- `app/page.tsx` — renders `<App />`
- `components/App.tsx` — **all** views, state, logic, and UI (~1300+ lines). All state lives here.
- `lib/supabase.ts` — Supabase client, TypeScript types, and all CRUD helpers

There are no separate page files, no API routes, and no context providers. Everything is co-located in `App.tsx`.

## Key Patterns in App.tsx

**`// @ts-nocheck`** is at the top of App.tsx — TypeScript errors are suppressed intentionally to keep the file concise.

**State loads from Supabase on mount, falls back to `INIT_*` constants:**
```js
useEffect(() => {
  async function load() {
    const [t, a, d] = await Promise.all([fetchTeam(), fetchAccounts(), fetchDepartments()]);
    if (t.length) setTeam(t);
    if (a.length) setAccounts(a);
    if (d.length) setDepts(d);
  }
  load();
}, []);
```

**Save pattern — optimistic update with revert on failure:**
```js
const prev = accounts;
setAccounts(a => ...update...);
try { await upsertAccount(d); } catch (e) {
  setSaveError(`Save failed: ${e?.message}`);
  setAccounts(prev); // revert
}
```

**IDs use `crypto.randomUUID()`** for all new records — never increment counters or reuse existing IDs.

**React Rules of Hooks** — hooks must be at component top level. Any component that needs local state must be its own named component (e.g. `PersonSidebar` is separate from `Sidebar` for this reason).

## Views

| Tab | State key |
|-----|-----------|
| Workload | `workloadTab`: `"leads" \| "symphony" \| "product" \| "pm" \| "all"` |
| Org Chart | `depts` state |
| Team | static, reads `team` |
| Accounts | `acctTab`: `"retainer" \| "projects" \| "closed"`, `acctView`: `"list" \| "pods"` |
| P&L | computed via `pods` and `totals` useMemo |

## Financial Model

**CAD → USD:** `cadY / 12 * 0.69`

**Monthly cost per person:** `usdM` if set, otherwise CAD conversion.

**Revenue attribution (lead/support split):**
- Lead with no support → 100% of account value
- Lead with support → 70% of account value
- Each support member → 30% / number of support members

**Flat rate / project amortization:**
```js
monthlyProjectRev(a) // returns project fee / months(start→end), or 0 outside window
```
Projects with no dates return the full fee as monthly (backward compat).

**Overhead distribution:** ops + leadership costs split equally across all active clients, allocated proportionally to each pod.

## Workload Capacity System

Each designer has **5 pts max capacity**. Each account has a `weight` (1–5, default 3).

- Lead on account with support → `weight * 0.7` pts
- Lead on account with no support → `weight * 1.0` pts
- Support member → `(weight * 0.3) / numSupportMembers` pts

Only **Active, Launch, Growth** accounts count toward capacity. Closed/Pipeline/Paused are excluded.

Thresholds: ≥5 pts = red "At capacity", ≥4 pts = amber "Near capacity", <4 pts = green.

## Database Schema

Tables in Supabase (all with open RLS policies — no auth):

| Table | Key columns |
|-------|-------------|
| `team_members` | `id`, `name`, `role`, `sl` (FK→service_lines), `type`, `cad_yearly`, `usd_monthly`, `hours_per_month`, `is_lead` |
| `accounts` | `id`, `name`, `sl`, `lead_id`, `status`, `type`, `retainer`, `project`, `start_date`, `end_date`, `weight`, `notes` |
| `account_support` | `account_id`, `member_id` (many-to-many) |
| `departments` | `id`, `name`, `color`, `sort_order` |
| `department_members` | `department_id`, `member_id` |
| `service_lines` | `id`, `name`, `color` |

**Critical:** `sl` field on `team_members` is a FK to `service_lines.id`. Empty string `""` violates the constraint — always coerce to `null`: `sl: p.sl || null`.

**`account_support` sync:** `upsertAccount` deletes all support rows then re-inserts — full replace, not patch.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Set in Vercel dashboard. Local dev uses `.env.local`.

## Account ID Convention

INIT_ACCOUNTS uses prefixed IDs (`a1`–`a13`, `a114`–`a122`, `a200`–`a220`, `a300`–`a313`). When adding new seed accounts, use the next available block (e.g. `a400+`) to avoid Supabase conflicts. All runtime-created accounts use `crypto.randomUUID()`.

## Team Member IDs

`t1`–`t17` are the original seed members. New members added via UI get UUIDs. The `INIT_TEAM` constant is only the fallback — Supabase is the source of truth after first load.

## Deployment

Push to `main` → Vercel auto-deploys. No manual steps needed. Build takes ~1–2 minutes to go live.

## Common Migrations

When adding a new column to Supabase:
```sql
alter table accounts add column if not exists <col> <type> default <val>;
```
Then update: the `Account` type in `lib/supabase.ts`, `fetchAccounts` mapping, `upsertAccount` payload, and `INIT_ACCOUNTS` defaults in `App.tsx`.
