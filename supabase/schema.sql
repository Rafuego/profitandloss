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
insert into team_members (id, name, role, sl, type, cad_yearly, usd_monthly, hours_per_month, is_lead) values
  ('t1',  'Rafay Iqbal',          'Partner',                                    'leadership', 'Partner',       110000, null, 160, true),
  ('t2',  'Matthew Good',         'Partner',                                    'leadership', 'Partner',       110000, null, 160, true),
  ('t3',  'Vicky Huynh',          'Senior Project Manager',                     'ops',        'Full-Time',      90000, null, 160, true),
  ('t4',  'Andrew del Rizzo',     'Digital Site Designer / Animations',          'site',       'Full-Time',     100000, null, 160, true),
  ('t5',  'Sylvia Han',           'Senior Digital Designer (Brand & Decks)',     'deck',       'Full-Time',     120000, null, 160, true),
  ('t6',  'Nicole Chou',          'Staff Product Designer',                     'product',    'Full-Time',      85000, null, 160, true),
  ('t7',  'Robyn Dang',           'Staff Product Designer',                     'product',    'Full-Time',      80000, null, 160, false),
  ('t8',  'Sabrina Wen',          'Staff Product Designer',                     'product',    'Full-Time',      75000, null, 160, false),
  ('t9',  'Deseree Lau',          'Digital Designer',                           'brand',      'Full-Time',      85000, null, 160, false),
  ('t10', 'Victor Wong',          'Junior Digital Designer',                    'brand',      'Full-Time',      85000, null, 160, false),
  ('t11', 'Emily Chung',          'Contractor',                                'brand',      'Contractor',    102000, null,  40, true),
  ('t12', 'Vencho',               'Brand Lead',                                'brand',      'Contractor',      null, 3500,  40, false),
  ('t13', 'Candy Cho',            'Contractor',                                'symphony',   'Contractor',      null, 1800,  40, false),
  ('t14', 'Ivy',                  'Contractor',                                'symphony',   'Contractor',      null, 1800,  40, false),
  ('t15', 'Joshua Ramkhelawan',   'Webflow Developer',                         'site',       'Contractor',     24000, null,  40, false),
  ('t16', 'Igor Katcha',          'Webflow Developer',                         'site',       'Contractor',      null, 2000,  40, false),
  ('t17', 'Talha',                'Webflow Developer',                         'site',       'Project-Based',   null,    0,   0, false)
on conflict (id) do nothing;

-- Client Accounts
insert into accounts (id, name, sl, lead_id, status, type, retainer, project, notes) values
  ('a1',  '1AU Technologies', 'symphony', 't15', 'Launch', 'Retainer', 3000,  0, ''),
  ('a2',  'Attio',            'symphony', 't13', 'Launch', 'Retainer', 2750,  0, ''),
  ('a3',  'Basis',            'symphony', 't10', 'Growth', 'Retainer', 4500,  0, ''),
  ('a4',  'Envoy',            'symphony', 't10', 'Launch', 'Retainer', 1500,  0, ''),
  ('a5',  'Highrise',         'symphony', 't15', 'Launch', 'Retainer', 2750,  0, ''),
  ('a6',  'Lumen',            'symphony', 't13', 'Growth', 'Retainer', 4500,  0, ''),
  ('a7',  'Portal Space',     'symphony', 't10', 'Growth', 'Retainer', 4500,  0, ''),
  ('a8',  'Vuecason',         'symphony', 't9',  'Growth', 'Retainer', 3000,  0, ''),
  ('a9',  'Applecart',        'symphony', 't15', 'Launch', 'Retainer', 2750,  0, ''),
  ('a10', 'Cytora',           'symphony', 't13', 'Launch', 'Retainer', 2250,  0, ''),
  ('a11', 'Goody',            'symphony', 't9',  'Growth', 'Retainer', 4800,  0, ''),
  ('a12', 'Raspberry Ai',     'symphony', 't8',  'Growth', 'Retainer', 8750,  0, ''),
  ('a13', 'RBL',              'symphony', 't10', 'Launch', 'Retainer', 3000,  0, '')
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
  ('d2', 't4'),  ('d2', 't15'), ('d2', 't16'), ('d2', 't17'),
  ('d3', 't9'),  ('d3', 't10'), ('d3', 't11'), ('d3', 't12'),
  ('d4', 't6'),  ('d4', 't7'),  ('d4', 't8'),
  ('d5', 't13'), ('d5', 't14')
on conflict do nothing;
