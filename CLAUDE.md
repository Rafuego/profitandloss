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
- `app/api/mercury/route.ts` — the one server-side route (Mercury invoicing sync)

Everything is co-located in `App.tsx` with no context providers. The only server code is the Mercury route (see below).

## Mercury Invoicing (server-side)

`app/api/mercury/route.ts` is a Node serverless route (`ƒ` in the build). It reads
`MERCURY_API_TOKEN` (a **read-only** Mercury token, set in Vercel env — never in the
browser), calls Mercury's AR API (`GET /api/v1/ar/invoices` + `/ar/customers`), and
returns normalized invoices (status: Unpaid/Processing = in flight, Paid = paid). The
"Invoices" tab lazy-fetches `/api/mercury` and matches invoice customers to accounts by
name. No token → `{connected:false}` → setup instructions render. The route only ever
issues GETs — it can never move money. Invoices sent via Ignition are a separate
(planned) integration, not visible here.

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
| Projects | flat-rate project economics — computed inline via `projectEcon` |
| P&L | computed via `pods` and `totals` useMemo |

## Financial Model

**CAD → USD:** `cadY / 12 * 0.69`

**Monthly cost per person:** `usdM` if set, otherwise CAD conversion.

**Revenue attribution (see `leadShare`/`supShare`/`delivPool`):**
- Lead delivering alone → 100% of account value
- Lead with support and/or a developer → 50% of account value
- Support members and the developer (`dev_id`) split the remaining 50% evenly

**Flat rate / project amortization:**
```js
monthlyProjectRev(a) // returns project fee / months(start→end), or 0 outside window
```
Projects with no dates contribute $0 to MRR — a fee only amortizes across a known window.
Pod P&L revenue uses `acctVal(a)` (retainer + amortized project) — never the raw fee.

**Flat-rate project cost allocation (Projects tab, see `projectTeam`/`projectEcon`):**
- A person's allocation to a project = their capacity points on it ÷ 5
  (lead w/ support = weight×0.7, solo lead = weight, support = weight×0.3 ÷ #support)
- Monthly cost to project = person's monthly cost × allocation
- Total project cost = team monthly × `monthsBetween(start, end)`; profit = fee − total cost
- Projects without dates or team show "—" (unknown) rather than fake numbers

**Developer (see `dev_id`):** optional per account. Support-style math: weight × 0.3
capacity points, weight × 0.3 ÷ 5 cost allocation on projects, and an equal slice
of the 50% delivery pool in revenue attribution (same as a support member).

**Pods (see `pod_id` on accounts + team_members, `pods` table):** cross-functional
teams that own a book of accounts, distinct from service lines. Exclusive membership:
one home pod per person, one owning pod per account. Pod P&L = full acctVal of its
active accounts − full cost of its members (no splitting, since membership is exclusive).
The "Pods" tab manages them; the by-discipline table on the P&L tab is now "Service Line P&L". Two divisions per Kyle's model: pods (Division 1, retainer book) and the **Studio Bench** (Division 2 — non-pod people + all flat-rate projects, a permanent home not an "unassigned" error). Only active retainers are nudged to "place into a pod"; projects stay on the bench.

**PM vs. Lead (see `pm_id`):** `lead_id` is the main designer — drives revenue
attribution and capacity points. `pm_id` is the project manager — no capacity
points; their cost is normalized across their managed book: PM's monthly cost ×
(account weight ÷ total weight of all active accounts they PM), so a PM's summed
allocation never exceeds their salary (`pmBookWeight`/`projectTeam`).

**Flat-rate invoicing model (50/50):** `deposit_paid` boolean tracks the 50% upfront
invoice. Collected = full fee when `status = 'Closed'` (marking complete logs all funds
paid), else 50% of fee if `deposit_paid`, else $0. The Projects tab has one-click
"Collect 50%" and "Complete" buttons on in-flight cards.

**Overhead distribution:** ops + leadership costs split equally across all active clients, allocated proportionally to each pod.

## Workload Capacity System

Each designer has **5 pts max capacity**. Each account has a `weight` (1–5, default 3).

- Lead on account with support → `weight * 0.7` pts
- Lead on account with no support → `weight * 1.0` pts
- Support member → `(weight * 0.3) / numSupportMembers` pts
- Developer (`dev_id`) → `weight * 0.3` pts
- PM (`pm_id`) → `weight * 0.1` pts (`PM_LOAD_PER_WEIGHT` — oversight is lighter per account)

Only **Active, Launch, Growth** accounts count toward capacity. Closed/Pipeline/Paused are excluded.

Thresholds: ≥5 pts = red "At capacity", ≥4 pts = amber "Near capacity", <4 pts = green.

## Database Schema

Tables in Supabase (all with open RLS policies — no auth):

| Table | Key columns |
|-------|-------------|
| `team_members` | `id`, `name`, `role`, `sl` (FK→service_lines), `type`, `cad_yearly`, `usd_monthly`, `hours_per_month`, `is_lead` |
| `accounts` | `id`, `name`, `sl`, `lead_id` (main designer), `pm_id` (project manager), `dev_id` (optional developer), `status`, `type`, `retainer`, `project`, `start_date`, `end_date`, `weight`, `deposit_paid`, `notes` |
| `account_support` | `account_id`, `member_id` (many-to-many) |
| `account_service_lines` | `account_id`, `sl` (many-to-many; `accounts.sl` = primary line, kept in sync) |
| `pods` | `id`, `name`, `color`, `lead_id`, `sort_order` (cross-functional teams; exclusive membership) |
| `departments` | `id`, `name`, `color`, `sort_order` |
| `department_members` | `department_id`, `member_id` |
| `service_lines` | `id`, `name`, `color` |

**Critical:** `sl` field on `team_members` is a FK to `service_lines.id`. Empty string `""` violates the constraint — always coerce to `null`: `sl: p.sl || null`.

**Multi service lines:** accounts can span several lines (`sls` array in app, `account_service_lines` junction). Pod P&L splits an account's value evenly across its lines (`acctVal(a) / acctSls(a).length`) — never double-counts. `acctSls(a)` falls back to legacy single `sl`.

**`account_support` sync:** `upsertAccount` deletes all support rows then re-inserts — full replace, not patch.

## Supabase Connection

The Supabase URL and anon key are **hardcoded in `lib/supabase.ts`** (not env vars). The Vercel env vars point at a deleted project and are intentionally ignored — do not switch back to `process.env` without also updating Vercel. The anon key is public by design (it ships in the browser bundle); access control is RLS, not key secrecy. If the Supabase project changes, update the two constants at the top of `lib/supabase.ts`.

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
