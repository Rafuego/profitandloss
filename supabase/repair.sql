-- ============================================
-- Interlude Tracker — Database Repair Script
-- ============================================
-- Run this ONCE in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste → Run
--
-- What it does:
--   1. Adds the columns the app now requires (weight, start_date, end_date)
--      — without these, every account save in the app fails silently.
--   2. Upserts the latest team, accounts, and departments from the codebase.
--      Existing rows with matching IDs are OVERWRITTEN with these values.
--      Rows created through the UI (UUID ids) are left untouched.
--
-- Safe to re-run: every statement is idempotent.

-- ── 1. Schema repair: add missing columns ──
alter table accounts add column if not exists weight numeric not null default 3;
alter table accounts add column if not exists start_date date;
alter table accounts add column if not exists end_date date;

-- ── 2. Service lines ──
insert into service_lines (id, name, color) values
  ('deck', 'Deck', 'bg-amber-100 text-amber-700'),
  ('site', 'Site', 'bg-teal-100 text-teal-700'),
  ('brand', 'Brand', 'bg-rose-100 text-rose-700'),
  ('product', 'Product', 'bg-blue-100 text-blue-700'),
  ('symphony', 'Symphony', 'bg-violet-100 text-violet-700'),
  ('ops', 'Operations', 'bg-stone-200 text-stone-600'),
  ('leadership', 'Leadership', 'bg-gray-800 text-white')
on conflict (id) do update set name = excluded.name, color = excluded.color;

-- ── 3. Team members (latest) ──
insert into team_members (id, name, role, sl, type, cad_yearly, usd_monthly, hours_per_month, is_lead) values
  ('t1',  'Rafay Iqbal',        'Partner',                                'leadership', 'Partner',       110000, null, 160, true),
  ('t2',  'Matthew Good',       'Partner',                                'leadership', 'Partner',       110000, null, 160, true),
  ('t3',  'Vicky Huynh',        'Senior Project Manager',                 'ops',        'Full-Time',      90000, null, 160, true),
  ('t4',  'Andrew del Rizzo',   'Digital Site Designer / Animations',     'site',       'Full-Time',     100000, null, 160, true),
  ('t5',  'Sylvia Han',         'Senior Digital Designer (Brand & Decks)','deck',       'Full-Time',     120000, null, 160, true),
  ('t6',  'Nicole Chou',        'Staff Product Designer',                 'product',    'Full-Time',      85000, null, 160, true),
  ('t7',  'Robyn Dang',         'Staff Product Designer',                 'product',    'Full-Time',      80000, null, 160, false),
  ('t8',  'Sabrina Wen',        'Staff Product Designer',                 'product',    'Full-Time',      75000, null, 160, false),
  ('t9',  'Deseree Lau',        'Digital Designer',                       'brand',      'Full-Time',      85000, null, 160, false),
  ('t10', 'Victor Wong',        'Junior Digital Designer',                'brand',      'Full-Time',      85000, null, 160, false),
  ('t11', 'Emily Chung',        'Contractor',                             'brand',      'Contractor',    102000, null,  40, true),
  ('t12', 'Vencho',             'Brand Lead',                             'brand',      'Contractor',      null, 3500,  40, false),
  ('t13', 'Candy Cho',          'Contractor',                             'symphony',   'Contractor',      null, 1800,  40, false),
  ('t14', 'Ivy',                'Contractor',                             'symphony',   'Contractor',      null, 1800,  40, false),
  ('t15', 'Joshua Ramkhelawan', 'Webflow Developer',                      'site',       'Contractor',     24000, null,  40, false),
  ('t16', 'Igor Katcha',        'Webflow Developer',                      'site',       'Contractor',      null, 2000,  40, false),
  ('t17', 'Talha',              'Webflow Developer',                      'site',       'Project-Based',   null,    0,   0, false)
on conflict (id) do update set
  name = excluded.name, role = excluded.role, sl = excluded.sl, type = excluded.type,
  cad_yearly = excluded.cad_yearly, usd_monthly = excluded.usd_monthly,
  hours_per_month = excluded.hours_per_month, is_lead = excluded.is_lead;

-- ── 4. Accounts (latest — 41 accounts) ──
insert into accounts (id, name, sl, lead_id, status, type, retainer, project, weight, start_date, end_date, notes) values
  -- Symphony retainers
  ('a1',   '1AU Technologies', 'symphony', 't15', 'Launch', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a2',   'Attio',            'symphony', 't13', 'Launch', 'Retainer', 2750, 0, 3, null, null, ''),
  ('a3',   'Basis',            'symphony', 't10', 'Growth', 'Retainer', 2000, 0, 3, null, null, ''),
  ('a4',   'Envoy',            'symphony', 't10', 'Launch', 'Retainer', 1500, 0, 3, null, null, ''),
  ('a5',   'Highrise',         'symphony', 't15', 'Launch', 'Retainer', 2750, 0, 3, null, null, ''),
  ('a6',   'Lumen',            'symphony', 't13', 'Growth', 'Retainer', 4500, 0, 3, null, null, ''),
  ('a7',   'Portal Space',     'symphony', 't10', 'Growth', 'Retainer', 4500, 0, 3, null, null, ''),
  ('a8',   'Vuecason',         'symphony', 't9',  'Growth', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a9',   'Applecart',        'symphony', 't15', 'Launch', 'Retainer', 2750, 0, 3, null, null, ''),
  ('a10',  'Cytora',           'symphony', 't13', 'Launch', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a11',  'Goody',            'symphony', 't9',  'Growth', 'Retainer', 4800, 0, 3, null, null, ''),
  ('a12',  'Raspberry Ai',     'symphony', 't8',  'Growth', 'Retainer', 8750, 0, 3, null, null, ''),
  ('a13',  'RBL',              'symphony', 't10', 'Launch', 'Retainer', 3000, 0, 3, null, null, ''),
  ('a114', 'Tocaro Blue',      'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a115', 'Complify',         'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a116', 'Narya VC',         'symphony', null,  'Active', 'Retainer', 2000, 0, 3, null, null, ''),
  ('a117', 'NeuralWatt',       'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a118', 'SirenOpt',         'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a119', 'Tempus Ai',        'symphony', null,  'Active', 'Retainer', 1250, 0, 3, null, null, ''),
  ('a120', 'Guardrail Ai',     'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a121', 'Kevin Morris',     'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  ('a122', 'Lucenia',          'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  -- New retainers
  ('a200', 'Anthro Energy',    'symphony', null,  'Active', 'Retainer', 5000, 0, 3, null, null, ''),
  ('a201', 'Voyager VC',       'symphony', null,  'Active', 'Retainer', 1500, 0, 3, null, null, ''),
  ('a202', 'Atlas Rd',         'symphony', null,  'Active', 'Retainer', 3500, 0, 3, null, null, ''),
  -- Closed flat-rate projects
  ('a203', 'Giant Step Capital', 'deck', null, 'Closed', 'Project', 0, 8000,  3, null, null, ''),
  ('a205', 'Slang Ventures',     'deck', null, 'Closed', 'Project', 0, 7500,  3, null, null, ''),
  ('a207', 'Kunin',              'deck', null, 'Closed', 'Project', 0, 20000, 3, null, null, ''),
  ('a300', 'Wetstone',           'deck', null, 'Closed', 'Project', 0, 7500,  3, null, null, ''),
  ('a301', 'NVP Capital',        'deck', null, 'Closed', 'Project', 0, 8000,  3, null, null, ''),
  ('a302', 'Blair AI',           'deck', null, 'Closed', 'Project', 0, 25000, 3, null, null, ''),
  ('a303', 'Twelve Below',       'deck', null, 'Closed', 'Project', 0, 2000,  3, null, null, ''),
  ('a304', 'Iris Finance',       'deck', null, 'Closed', 'Project', 0, 3000,  3, null, null, 'Fired — collected 50% ($3K of $6K)'),
  ('a305', 'Zingage',            'deck', null, 'Closed', 'Project', 0, 6500,  3, null, null, ''),
  ('a306', 'Symbio',             'deck', null, 'Closed', 'Project', 0, 6000,  3, null, null, ''),
  ('a307', 'Unknown Capital',    'deck', null, 'Closed', 'Project', 0, 6000,  3, null, null, ''),
  ('a308', 'Cargo Robotics',     'deck', null, 'Closed', 'Project', 0, 3500,  3, null, null, ''),
  ('a309', 'Homemade Method',    'deck', null, 'Closed', 'Project', 0, 8000,  3, null, null, ''),
  ('a310', 'Antares Space',      'deck', null, 'Closed', 'Project', 0, 7500,  3, null, null, ''),
  ('a311', 'Tarlton Automotive', 'deck', null, 'Closed', 'Project', 0, 5000,  3, null, null, ''),
  ('a312', 'Narya VC (Deck)',    'deck', null, 'Closed', 'Project', 0, 10000, 3, null, null, ''),
  ('a313', 'Basis (Deck)',       'deck', null, 'Closed', 'Project', 0, 10000, 3, null, null, ''),
  -- Active flat-rate project
  ('a220', 'Saris AI', 'brand', 't4', 'Active', 'Project', 0, 30000, 4, '2026-04-01', '2026-05-21', 'Brand + web. $15K paid, $15K on completion. PM: Daniel (assign when in system).')
on conflict (id) do update set
  name = excluded.name, sl = excluded.sl, lead_id = excluded.lead_id,
  status = excluded.status, type = excluded.type,
  retainer = excluded.retainer, project = excluded.project,
  weight = excluded.weight, start_date = excluded.start_date, end_date = excluded.end_date,
  notes = excluded.notes;

-- ── 5. Account support members ──
insert into account_support (account_id, member_id) values
  ('a220', 't15'),
  ('a220', 't12')
on conflict do nothing;

-- ── 6. Departments (org chart) ──
insert into departments (id, name, color, sort_order) values
  ('d1', 'Deck',            'bg-amber-100 text-amber-700',   1),
  ('d2', 'Web Development', 'bg-teal-100 text-teal-700',     2),
  ('d3', 'Brand',           'bg-rose-100 text-rose-700',     3),
  ('d4', 'Product',         'bg-blue-100 text-blue-700',     4),
  ('d5', 'Symphony',        'bg-violet-100 text-violet-700', 5)
on conflict (id) do update set name = excluded.name, color = excluded.color, sort_order = excluded.sort_order;

insert into department_members (department_id, member_id) values
  ('d1', 't5'),
  ('d2', 't4'),  ('d2', 't15'), ('d2', 't16'), ('d2', 't17'),
  ('d3', 't9'),  ('d3', 't10'), ('d3', 't11'), ('d3', 't12'),
  ('d4', 't6'),  ('d4', 't7'),  ('d4', 't8'),
  ('d5', 't13'), ('d5', 't14')
on conflict (member_id) do update set department_id = excluded.department_id;

-- ── 7. Verify ──
select 'team_members' as tbl, count(*) from team_members
union all select 'accounts', count(*) from accounts
union all select 'account_support', count(*) from account_support
union all select 'departments', count(*) from departments
union all select 'department_members', count(*) from department_members;
