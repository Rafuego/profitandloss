-- ============================================
-- Interlude Tracker — Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates all tables, seed data, and Row Level Security policies.

-- ── Extensions ──
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Service Lines (reference table)
create table if not exists service_lines (
  id text primary key,
  name text not null,
  color text not null default 'bg-gray-100 text-gray-600'
);

-- Team Members
create table if not exists team_members (
  id text primary key default 't' || floor(random() * 100000)::text,
  name text not null,
  role text not null default '',
  sl text references service_lines(id),
  type text not null default 'Full-Time' check (type in ('Partner', 'Full-Time', 'Contractor', 'Project-Based')),
  cad_yearly numeric,          -- annual salary in CAD (nullable)
  usd_monthly numeric,         -- monthly rate in USD (nullable, for contractors)
  hours_per_month integer not null default 160,
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Client Accounts
create table if not exists accounts (
  id text primary key default 'a' || floor(random() * 100000)::text,
  name text not null,
  sl text references service_lines(id),
  lead_id text references team_members(id) on delete set null,
  status text not null default 'Active' check (status in ('Launch', 'Growth', 'Active', 'Pipeline', 'Paused', 'Closed')),
  type text not null default 'Retainer' check (type in ('Retainer', 'Project', 'Hybrid')),
  retainer numeric not null default 0,
  project numeric not null default 0,
  weight numeric not null default 3,   -- designer capacity weight (1–5 pts)
  start_date date,                     -- project amortization window
  end_date date,
  deposit_paid boolean not null default false,  -- 50% upfront invoice collected (flat-rate projects)
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Account ↔ Support Member (many-to-many)
create table if not exists account_support (
  account_id text not null references accounts(id) on delete cascade,
  member_id text not null references team_members(id) on delete cascade,
  primary key (account_id, member_id)
);

-- Org Chart Departments (independent of service lines)
create table if not exists departments (
  id text primary key default 'd' || floor(random() * 100000)::text,
  name text not null,
  color text not null default 'bg-gray-100 text-gray-600',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Department ↔ Member (many-to-many, a person can only be in one dept)
create table if not exists department_members (
  department_id text not null references departments(id) on delete cascade,
  member_id text not null references team_members(id) on delete cascade,
  primary key (department_id, member_id),
  -- ensure a person is only in one department
  unique (member_id)
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_team_sl on team_members(sl);
create index if not exists idx_accounts_sl on accounts(sl);
create index if not exists idx_accounts_lead on accounts(lead_id);
create index if not exists idx_accounts_status on accounts(status);
create index if not exists idx_account_support_member on account_support(member_id);
create index if not exists idx_dept_members_member on department_members(member_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_team_members_updated
  before update on team_members
  for each row execute function update_updated_at();

create trigger trg_accounts_updated
  before update on accounts
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- For now, enable RLS but allow all authenticated users full access.
-- When you add auth, tighten these policies.

alter table service_lines enable row level security;
alter table team_members enable row level security;
alter table accounts enable row level security;
alter table account_support enable row level security;
alter table departments enable row level security;
alter table department_members enable row level security;

-- Policy: allow all operations for authenticated users
create policy "Authenticated full access" on service_lines for all using (true) with check (true);
create policy "Authenticated full access" on team_members for all using (true) with check (true);
create policy "Authenticated full access" on accounts for all using (true) with check (true);
create policy "Authenticated full access" on account_support for all using (true) with check (true);
create policy "Authenticated full access" on departments for all using (true) with check (true);
create policy "Authenticated full access" on department_members for all using (true) with check (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Service Lines
insert into service_lines (id, name, color) values
  ('deck', 'Deck', 'bg-amber-100 text-amber-700'),
  ('site', 'Site', 'bg-teal-100 text-teal-700'),
  ('brand', 'Brand', 'bg-rose-100 text-rose-700'),
  ('product', 'Product', 'bg-blue-100 text-blue-700'),
  ('symphony', 'Symphony', 'bg-violet-100 text-violet-700'),
  ('ops', 'Operations', 'bg-stone-200 text-stone-600'),
  ('leadership', 'Leadership', 'bg-gray-800 text-white')
on conflict (id) do nothing;

-- Team Members
-- Pay synced to Humi payroll 2026-07-09 — stored as USD/month
-- (bi-weekly CAD × 26 ÷ 12 × 0.69, rounded to the dollar).
insert into team_members (id, name, role, sl, type, cad_yearly, usd_monthly, hours_per_month, is_lead) values
  ('t1',  'Rafay Iqbal',        'Partner',                                 'leadership', 'Partner',      null, 5711, 160, true),
  ('t2',  'Matthew Good',       'Partner',                                 'leadership', 'Partner',      null, 5711, 160, true),
  ('t3',  'Vicky Huynh',        'Senior Project Manager',                  'ops',        'Full-Time',    null, 4739, 160, true),
  ('t4',  'Andrew del Rizzo',   'Digital Site Designer / Animations',      'site',       'Full-Time',    null, 4067, 160, true),
  ('t5',  'Sylvia Han',         'Senior Digital Designer (Brand & Decks)', 'deck',       'Full-Time',    null, 4953, 160, true),
  ('t6',  'Nicole Chou',        'Staff Product Designer',                  'product',    'Full-Time',    null, 3525, 160, true),
  ('t7',  'Robyn Dang',         'Staff Product Designer',                  'product',    'Full-Time',    null, 3344, 160, false),
  ('t8',  'Sabrina Wen',        'Staff Product Designer',                  'product',    'Full-Time',    null, 3525, 160, false),
  ('t9',  'Deseree Lau',        'Digital Designer',                        'brand',      'Full-Time',    null, 3525, 160, false),
  ('t10', 'Victor Wong',        'Junior Digital Designer',                 'brand',      'Full-Time',    null, 3344, 160, false),
  ('t11', 'Emily Chung',        'Contractor',                              'brand',      'Contractor', 102000, null,  40, true),
  ('t12', 'Vencho',             'Brand Lead',                              'brand',      'Contractor',   null, 3500,  40, false),
  ('t15', 'Joshua Ramkissoon',  'Webflow Developer',                       'site',       'Full-Time',    null, 3267, 160, false),
  ('t16', 'Igor Katcha',        'Webflow Developer',                       'site',       'Contractor',   null, 2000,  40, false),
  ('t18', 'Dong-soo Shin',      'Project Manager',                         'ops',        'Full-Time',    null, 3162, 160, false),
  ('t19', 'Christine Chow',     'Digital Designer',                        'brand',      'Full-Time',    null, 3811, 160, false),
  ('t20', 'Carson',             'Chief of Staff',                          'ops',        'Full-Time',    null, 6000, 160, false)
on conflict (id) do nothing;

-- Client Accounts
insert into accounts (id, name, sl, lead_id, status, type, retainer, project, weight, start_date, end_date, notes) values
  -- Active retainers (synced to billing platform 2026-07-09)
  ('a1',   '1AU Technologies', 'symphony', 't15', 'Active', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a2',   'Attio',            'symphony', null,  'Active', 'Retainer', 1375, 0, 3, null, null, ''),
  ('a3',   'Basis',            'symphony', 't10', 'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a5',   'Highrise',         'symphony', 't15', 'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a6',   'Lumen',            'symphony', null,  'Active', 'Retainer', 4500, 0, 3, null, null, ''),
  ('a7',   'Portal Space',     'symphony', 't10', 'Active', 'Retainer', 2750, 0, 3, null, null, ''),
  ('a8',   'Vuecason',         'symphony', 't9',  'Active', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a9',   'Applecart',        'symphony', 't15', 'Active', 'Retainer', 2750, 0, 3, null, null, ''),
  ('a10',  'Cytora',           'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a11',  'Goody',            'symphony', 't9',  'Active', 'Retainer', 4800, 0, 3, null, null, ''),
  ('a13',  'RBL',              'symphony', 't10', 'Active', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a115', 'Complify',         'symphony', null,  'Active', 'Retainer', 8500, 0, 3, null, null, ''),
  ('a117', 'NeuralWatt',       'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a119', 'Tempus Ai',        'symphony', null,  'Active', 'Retainer', 1250, 0, 3, null, null, ''),
  ('a122', 'Lucenia',          'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a200', 'Anthro Energy',    'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a201', 'Voyager Ventures', 'symphony', null,  'Active', 'Retainer', 1500, 0, 3, null, null, ''),
  ('a400', 'ARK Invest',       'symphony', null,  'Active', 'Retainer', 6000, 0, 3, null, null, ''),
  ('a401', 'Axle Energy',      'symphony', null,  'Active', 'Retainer', 4500, 0, 3, null, null, ''),
  ('a402', 'Chart R',          'symphony', null,  'Active', 'Retainer', 4500, 0, 3, null, null, ''),
  ('a403', 'Alcove',           'symphony', null,  'Active', 'Retainer', 6000, 0, 3, null, null, ''),
  -- Churned retainers (kept for history)
  ('a4',   'Envoy',            'symphony', 't10', 'Closed', 'Retainer', 1500, 0, 3, null, null, ''),
  ('a12',  'Raspberry Ai',     'symphony', 't8',  'Closed', 'Retainer', 8750, 0, 3, null, null, ''),
  ('a114', 'Tocaro Blue',      'symphony', null,  'Closed', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a116', 'Narya VC',         'symphony', null,  'Closed', 'Retainer', 2000, 0, 3, null, null, ''),
  ('a118', 'SirenOpt',         'symphony', null,  'Closed', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a120', 'Guardrail Ai',     'symphony', null,  'Closed', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a121', 'Kevin Morris',     'symphony', null,  'Closed', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a202', 'Atlas Rd',         'symphony', null,  'Closed', 'Retainer', 3500, 0, 3, null, null, '')
on conflict (id) do nothing;

-- Departments (for org chart)
insert into departments (id, name, color, sort_order) values
  ('d1', 'Deck',            'bg-amber-100 text-amber-700',  1),
  ('d2', 'Web Development', 'bg-teal-100 text-teal-700',    2),
  ('d3', 'Brand',           'bg-rose-100 text-rose-700',    3),
  ('d4', 'Product',         'bg-blue-100 text-blue-700',    4),
  ('d5', 'Symphony',        'bg-violet-100 text-violet-700', 5)
on conflict (id) do nothing;

-- Department Members
insert into department_members (department_id, member_id) values
  ('d1', 't5'),
  ('d2', 't4'),  ('d2', 't15'), ('d2', 't16'),
  ('d3', 't9'),  ('d3', 't10'), ('d3', 't11'), ('d3', 't12'), ('d3', 't19'),
  ('d4', 't6'),  ('d4', 't7'),  ('d4', 't8')
on conflict do nothing;
