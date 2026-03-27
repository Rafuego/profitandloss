# Interlude Tracker — Setup Guide

A team management, client account, and P&L tracking tool for Interlude Studio.
Built with Next.js 14, Tailwind CSS, and Supabase.

---

## Architecture Overview

```
interlude-tracker/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (Inter font, metadata)
│   ├── page.tsx            # Home page — renders the main App component
│   └── globals.css         # Tailwind directives
├── components/
│   └── App.tsx             # Main application (all views, state, UI)
├── lib/
│   └── supabase.ts         # Supabase client, types, fetch/save helpers
├── supabase/
│   └── schema.sql          # Full DB schema + seed data (run once)
├── .env.example            # Environment variable template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── SETUP.md                # ← You are here
```

### How the app works

The app is a single-page React app with 5 tabbed views:

| View | What it does |
|------|-------------|
| **Workload** | One card per person showing their assigned accounts (as lead + support) and revenue/cost ratio |
| **Org Chart** | Hierarchical org: Leadership → Operations → custom department boxes. Departments are editable — you can create, rename, and assign people freely |
| **Team** | Grouped roster by service line with compensation details |
| **Accounts** | Full table of client accounts with lead, support, status, retainer, project revenue |
| **P&L** | Studio KPIs, pod-level P&L table, and revenue-per-person breakdown |

**Revenue attribution model:** When a person is the lead on an account with no support, they get 100% of the revenue attributed. When there are support members, the lead gets 50% and the remaining 50% is split evenly among support members.

**Key data concepts:**
- `service_lines` — Deck, Site, Brand, Product, Symphony, Operations, Leadership
- `team_members` — 17 people with CAD/USD compensation, service line, type
- `accounts` — 13 client accounts with lead assignment, support members, retainer/project revenue
- `departments` — Org chart groupings (independent of service lines) with member assignments

---

## Step 1: Create a GitHub Repo

```bash
# In your terminal
cd interlude-tracker
git init
git add .
git commit -m "Initial commit — Interlude Tracker"

# Create repo on GitHub (using GitHub CLI, or do it via github.com)
gh repo create interlude-tracker --private --source=. --push
```

---

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name (e.g., `interlude-tracker`) and set a database password
3. Wait for the project to provision (~2 minutes)

### Run the schema

4. Go to **SQL Editor** in the Supabase dashboard
5. Click **New Query**
6. Paste the entire contents of `supabase/schema.sql`
7. Click **Run** — this creates all tables, indexes, triggers, RLS policies, and seeds your data

### Get your keys

8. Go to **Settings → API** in the Supabase dashboard
9. Copy these two values:
   - **Project URL** (looks like `https://abc123.supabase.co`)
   - **anon / public key** (long JWT string starting with `eyJ...`)

### Create your .env.local

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-key-here
```

---

## Step 3: Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the tracker with all your team and account data.

> **Note:** The app currently works with local state (in-memory). To wire it up to Supabase for persistence, you'll integrate the fetch/save helpers from `lib/supabase.ts` into the `App.tsx` component. The helpers are already written and ready to use — this is the next development step after confirming the UI works.

---

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (easiest)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `interlude-tracker` repo
4. Vercel auto-detects Next.js — leave all defaults
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
6. Click **Deploy**

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel

# Follow the prompts, then set env vars:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy
vercel --prod
```

Your app will be live at `https://interlude-tracker.vercel.app` (or whatever name you chose).

---

## Step 5: Wire Up Supabase Persistence (Next Dev Step)

The app currently runs on in-memory state. Here's how to connect it to Supabase so changes persist:

### In `components/App.tsx`:

1. **Import the helpers** at the top:
```tsx
import {
  fetchTeam, fetchAccounts, fetchDepartments,
  upsertTeamMember, deleteTeamMember,
  upsertAccount, deleteAccount,
  upsertDepartment, deleteDepartment,
} from "@/lib/supabase";
```

2. **Load data on mount** — replace the `useState(INIT_TEAM)` etc. with:
```tsx
const [team, setTeam] = useState<TeamMember[]>([]);
const [accounts, setAccounts] = useState<Account[]>([]);
const [depts, setDepts] = useState<Department[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function load() {
    const [t, a, d] = await Promise.all([
      fetchTeam(), fetchAccounts(), fetchDepartments()
    ]);
    setTeam(t);
    setAccounts(a);
    setDepts(d);
    setLoading(false);
  }
  load();
}, []);
```

3. **Save on edit** — in the `save` function, call the upsert helpers:
```tsx
const save = async (type, d) => {
  if (type === "person") {
    await upsertTeamMember(d);
    // ... update local state as before
  } else {
    await upsertAccount(d);
    // ... update local state as before
  }
};
```

4. **Same for delete and department operations.**

The `lib/supabase.ts` file has all the CRUD functions ready — they handle the snake_case ↔ camelCase mapping and the many-to-many join tables.

---

## Database Tables Reference

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `service_lines` | Reference: Deck, Site, Brand, etc. | `id`, `name`, `color` |
| `team_members` | All employees and contractors | `id`, `name`, `role`, `sl`, `type`, `cad_yearly`, `usd_monthly`, `hours_per_month`, `is_lead` |
| `accounts` | Client accounts | `id`, `name`, `sl`, `lead_id`, `status`, `retainer`, `project` |
| `account_support` | Many-to-many: account ↔ support member | `account_id`, `member_id` |
| `departments` | Org chart groupings | `id`, `name`, `color`, `sort_order` |
| `department_members` | Department ↔ member (unique per member) | `department_id`, `member_id` |

---

## Financial Model

- **CAD → USD conversion:** `cadY / 12 * 0.69` (monthly)
- **Monthly cost:** `usd_monthly` if set, otherwise CAD conversion
- **Revenue attribution:**
  - Lead with no support → 100% of account value
  - Lead with support → 50% of account value
  - Each support member → 50% / number of support members
- **Ratio:** total attributed revenue / monthly cost

---

## Future Enhancements

When you're ready to extend:

- **Auth:** Add Supabase Auth (email/password or Google) and tighten RLS policies to `auth.uid()`
- **Real-time:** Use Supabase Realtime subscriptions so multiple users see live updates
- **Audit log:** Add a `changes` table to track who edited what
- **CSV export:** Add a button to export P&L data
- **Time tracking:** Add a `time_entries` table to track actual hours per account
