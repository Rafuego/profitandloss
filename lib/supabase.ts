import { createClient } from "@supabase/supabase-js";

// Supabase connection — hardcoded on purpose.
// The Vercel env vars still point at a deleted Supabase project, so they are
// intentionally ignored. The anon key is public by design (it ships in the
// browser bundle either way); access control comes from RLS, not key secrecy.
// If the Supabase project ever changes again, update these two constants.
const SUPABASE_URL = "https://dhutggfdiajxyxdipxta.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodXRnZ2ZkaWFqeHl4ZGlweHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDIwNjUsImV4cCI6MjA5OTExODA2NX0.fKb4Ja1u4xlNH-i6O8mnCQ4iabe4_3hiF1RR-dHoNYA";

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Type definitions matching the DB schema ──

export type ServiceLine = {
  id: string;
  name: string;
  color: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  sl: string;              // service_lines.id
  type: "Partner" | "Full-Time" | "Contractor" | "Project-Based";
  cadY: number | null;     // cad_yearly
  usdM: number | null;     // usd_monthly
  hrs: number;             // hours_per_month
  lead: boolean;           // is_lead
  podId: string | null;    // pod_id — home pod (exclusive)
};

export type Pod = {
  id: string;
  name: string;
  color: string;
  leadId: string | null;   // designated pod lead
  sortOrder: number;
};

export type Account = {
  id: string;
  name: string;
  sl: string;              // legacy primary service line (= sls[0])
  sls: string[];           // all service lines, from account_service_lines join
  podId: string | null;    // pod_id — owning pod (exclusive)
  leadId: string | null;   // lead_id — main designer on the account
  pmId: string | null;     // pm_id — project manager (cost spreads across their book)
  devId: string | null;    // dev_id — designated developer (optional; support-style math)
  supportIds: string[];    // from account_support join
  status: "Launch" | "Growth" | "Active" | "Pipeline" | "Paused" | "Closed";
  type: "Retainer" | "Project" | "Hybrid";
  retainer: number;
  project: number;         // flat fee for Project/Hybrid types
  startDate: string | null; // project start date (YYYY-MM-DD)
  endDate: string | null;   // project end date (YYYY-MM-DD)
  weight: number;           // designer capacity weight (1–5 pts, default 3)
  depositPaid: boolean;     // legacy; collections now come from Mercury
  mercuryInvoices: string;  // optional explicit Mercury invoice numbers (comma-separated)
  notes: string;
};

export type Department = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];     // from department_members join
};

// ── Data fetching helpers ──
// These map between the DB column names (snake_case) and the app's camelCase.

export async function fetchTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    sl: r.sl,
    type: r.type,
    cadY: r.cad_yearly,
    usdM: r.usd_monthly,
    hrs: r.hours_per_month,
    lead: r.is_lead,
    podId: r.pod_id ?? null,
  }));
}

export async function fetchPods(): Promise<Pod[]> {
  const { data, error } = await supabase
    .from("pods")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    leadId: r.lead_id ?? null,
    sortOrder: r.sort_order ?? 0,
  }));
}

export async function upsertPod(p: Pod) {
  const { error } = await supabase.from("pods").upsert({
    id: p.id,
    name: p.name,
    color: p.color,
    lead_id: p.leadId ?? null,
    sort_order: p.sortOrder ?? 0,
  });
  if (error) throw error;
}

export async function deletePod(id: string) {
  const { error } = await supabase.from("pods").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data: accts, error: acctErr } = await supabase
    .from("accounts")
    .select("*")
    .order("name");
  if (acctErr) throw acctErr;

  const { data: support, error: supErr } = await supabase
    .from("account_support")
    .select("*");
  if (supErr) throw supErr;

  const { data: slRows, error: slErr } = await supabase
    .from("account_service_lines")
    .select("*");
  if (slErr) throw slErr;

  const supportMap: Record<string, string[]> = {};
  (support || []).forEach((r: any) => {
    if (!supportMap[r.account_id]) supportMap[r.account_id] = [];
    supportMap[r.account_id].push(r.member_id);
  });

  const slMap: Record<string, string[]> = {};
  (slRows || []).forEach((r: any) => {
    if (!slMap[r.account_id]) slMap[r.account_id] = [];
    slMap[r.account_id].push(r.sl);
  });

  return (accts || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    sl: r.sl,
    sls: slMap[r.id] || (r.sl ? [r.sl] : []),
    podId: r.pod_id ?? null,
    leadId: r.lead_id,
    pmId: r.pm_id ?? null,
    devId: r.dev_id ?? null,
    supportIds: supportMap[r.id] || [],
    status: r.status,
    type: r.type,
    retainer: Number(r.retainer),
    project: Number(r.project),
    startDate: r.start_date || null,
    endDate: r.end_date || null,
    weight: r.weight != null ? Number(r.weight) : 3,
    depositPaid: r.deposit_paid ?? false,
    mercuryInvoices: r.mercury_invoices || "",
    notes: r.notes || "",
  }));
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data: depts, error: deptErr } = await supabase
    .from("departments")
    .select("*")
    .order("sort_order");
  if (deptErr) throw deptErr;

  const { data: members, error: memErr } = await supabase
    .from("department_members")
    .select("*");
  if (memErr) throw memErr;

  const memMap: Record<string, string[]> = {};
  (members || []).forEach((r: any) => {
    if (!memMap[r.department_id]) memMap[r.department_id] = [];
    memMap[r.department_id].push(r.member_id);
  });

  return (depts || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    memberIds: memMap[r.id] || [],
  }));
}

// ── Save helpers ──

export async function upsertTeamMember(p: TeamMember) {
  const { error } = await supabase.from("team_members").upsert({
    id: p.id,
    name: p.name,
    role: p.role || "",
    sl: p.sl || null,          // empty string → null to avoid FK violation
    type: p.type,
    cad_yearly: p.cadY || null,
    usd_monthly: p.usdM || null,
    hours_per_month: p.hrs || 160,
    is_lead: p.lead || false,
    pod_id: p.podId ?? null,
  });
  if (error) throw error;
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertAccount(a: Account) {
  const sls = a.sls && a.sls.length ? a.sls : (a.sl ? [a.sl] : []);
  // Upsert the account row
  const { error: acctErr } = await supabase.from("accounts").upsert({
    id: a.id,
    name: a.name,
    sl: sls[0] || null,   // legacy primary line stays in sync
    pod_id: a.podId ?? null,
    lead_id: a.leadId,
    pm_id: a.pmId ?? null,
    dev_id: a.devId ?? null,
    status: a.status,
    type: a.type,
    retainer: a.retainer,
    project: a.project,
    start_date: a.startDate || null,
    end_date: a.endDate || null,
    weight: a.weight ?? 3,
    deposit_paid: a.depositPaid ?? false,
    mercury_invoices: a.mercuryInvoices || null,
    notes: a.notes,
  });
  if (acctErr) throw acctErr;

  // Sync support members: delete all, then re-insert
  await supabase.from("account_support").delete().eq("account_id", a.id);
  if (a.supportIds.length > 0) {
    const rows = a.supportIds.map(mid => ({ account_id: a.id, member_id: mid }));
    const { error: supErr } = await supabase.from("account_support").insert(rows);
    if (supErr) throw supErr;
  }

  // Sync service lines: delete all, then re-insert (same pattern as support)
  await supabase.from("account_service_lines").delete().eq("account_id", a.id);
  if (sls.length > 0) {
    const rows = sls.map(s => ({ account_id: a.id, sl: s }));
    const { error: slErr } = await supabase.from("account_service_lines").insert(rows);
    if (slErr) throw slErr;
  }
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertDepartment(d: Department) {
  const { error: deptErr } = await supabase.from("departments").upsert({
    id: d.id,
    name: d.name,
    color: d.color,
  });
  if (deptErr) throw deptErr;

  // Sync members: remove all from this dept, then re-insert
  await supabase.from("department_members").delete().eq("department_id", d.id);
  if (d.memberIds.length > 0) {
    // Also remove these members from any OTHER dept (person can only be in one)
    for (const mid of d.memberIds) {
      await supabase.from("department_members").delete().eq("member_id", mid);
    }
    const rows = d.memberIds.map(mid => ({ department_id: d.id, member_id: mid }));
    const { error: memErr } = await supabase.from("department_members").insert(rows);
    if (memErr) throw memErr;
  }
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw error;
}

export type Cost = {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  month: string;            // YYYY-MM-01
  accountId: string | null; // optional project attribution
  notes: string;
};

export async function fetchCosts(): Promise<Cost[]> {
  const { data, error } = await supabase.from("costs").select("*").order("month", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, vendor: r.vendor, category: r.category,
    amount: Number(r.amount), month: r.month,
    accountId: r.account_id ?? null, notes: r.notes || "",
  }));
}

export async function upsertCost(c: Cost) {
  const { error } = await supabase.from("costs").upsert({
    id: c.id, vendor: c.vendor, category: c.category || "Development",
    amount: c.amount || 0, month: c.month,
    account_id: c.accountId ?? null, notes: c.notes || "",
  });
  if (error) throw error;
}

export async function deleteCost(id: string) {
  const { error } = await supabase.from("costs").delete().eq("id", id);
  if (error) throw error;
}
