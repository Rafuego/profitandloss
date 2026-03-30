import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
};

export type Account = {
  id: string;
  name: string;
  sl: string;
  leadId: string | null;   // lead_id
  supportIds: string[];    // from account_support join
  status: "Launch" | "Growth" | "Active" | "Pipeline" | "Paused" | "Closed";
  type: "Retainer" | "Project" | "Hybrid";
  retainer: number;
  project: number;         // flat fee for Project/Hybrid types
  startDate: string | null; // project start date (YYYY-MM-DD)
  endDate: string | null;   // project end date (YYYY-MM-DD)
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
  }));
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

  const supportMap: Record<string, string[]> = {};
  (support || []).forEach((r: any) => {
    if (!supportMap[r.account_id]) supportMap[r.account_id] = [];
    supportMap[r.account_id].push(r.member_id);
  });

  return (accts || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    sl: r.sl,
    leadId: r.lead_id,
    supportIds: supportMap[r.id] || [],
    status: r.status,
    type: r.type,
    retainer: Number(r.retainer),
    project: Number(r.project),
    startDate: r.start_date || null,
    endDate: r.end_date || null,
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
    role: p.role,
    sl: p.sl,
    type: p.type,
    cad_yearly: p.cadY,
    usd_monthly: p.usdM,
    hours_per_month: p.hrs,
    is_lead: p.lead,
  });
  if (error) throw error;
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertAccount(a: Account) {
  // Upsert the account row
  const { error: acctErr } = await supabase.from("accounts").upsert({
    id: a.id,
    name: a.name,
    sl: a.sl,
    lead_id: a.leadId,
    status: a.status,
    type: a.type,
    retainer: a.retainer,
    project: a.project,
    start_date: a.startDate || null,
    end_date: a.endDate || null,
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
