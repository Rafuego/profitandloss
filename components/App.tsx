// @ts-nocheck
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  fetchTeam, fetchAccounts, fetchDepartments, fetchPods,
  upsertTeamMember, deleteTeamMember,
  upsertAccount, deleteAccount,
  upsertDepartment, deleteDepartment,
  upsertPod, deletePod,
  fetchCosts, upsertCost, deleteCost,
  fetchCostRules, upsertCostRule,
} from "@/lib/supabase";

const CAD_TO_USD = 0.69;

const SERVICE_LINES = [
  { id: "deck", name: "Deck", color: "bg-amber-100 text-amber-700" },
  { id: "site", name: "Site", color: "bg-teal-100 text-teal-700" },
  { id: "brand", name: "Brand", color: "bg-rose-100 text-rose-700" },
  { id: "product", name: "Product", color: "bg-blue-100 text-blue-700" },
  { id: "symphony", name: "Symphony", color: "bg-violet-100 text-violet-700" },
  { id: "animation", name: "Animation", color: "bg-emerald-100 text-emerald-700" },
  { id: "ops", name: "Operations", color: "bg-stone-200 text-stone-600" },
  { id: "leadership", name: "Leadership", color: "bg-gray-800 text-white" },
];
const SL = Object.fromEntries(SERVICE_LINES.map(s => [s.id, s]));

// Pay basis (2026-07-14): bi-weekly CAD payroll × 2 = monthly, × 0.69 = USD/month.
// Partners set directly at $110K USD/yr; contractors set directly in USD.
const INIT_TEAM = [
  { id: "t1", name: "Rafay Iqbal", role: "Partner", sl: "leadership", type: "Partner", cadY: null, usdM: 9166.67, hrs: 160, lead: true },
  { id: "t2", name: "Matthew Good", role: "Partner", sl: "leadership", type: "Partner", cadY: null, usdM: 9166.67, hrs: 160, lead: true },
  { id: "t3", name: "Vicky Huynh", role: "Senior Project Manager", sl: "ops", type: "Full-Time", cadY: null, usdM: 4375, hrs: 160, lead: true },
  { id: "t4", name: "Andrew del Rizzo", role: "Digital Site Designer / Animations", sl: "site", type: "Full-Time", cadY: null, usdM: 3754, hrs: 160, lead: true },
  { id: "t5", name: "Sylvia Han", role: "Senior Digital Designer (Brand & Decks)", sl: "deck", type: "Full-Time", cadY: null, usdM: 4572, hrs: 160, lead: true },
  { id: "t6", name: "Nicole Chou", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: null, usdM: 3254, hrs: 160, lead: true },
  { id: "t7", name: "Robyn Dang", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: null, usdM: 3086, hrs: 160, lead: false },
  { id: "t8", name: "Sabrina Wen", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: null, usdM: 3254, hrs: 160, lead: false },
  { id: "t9", name: "Deseree Lau", role: "Digital Designer", sl: "brand", type: "Full-Time", cadY: null, usdM: 3254, hrs: 160, lead: false },
  { id: "t10", name: "Victor Wong", role: "Junior Digital Designer", sl: "brand", type: "Full-Time", cadY: null, usdM: 3086, hrs: 160, lead: false },
  { id: "t11", name: "Emily Chung", role: "Contractor", sl: "brand", type: "Contractor", cadY: null, usdM: 6200, hrs: 40, lead: true },
  { id: "t12", name: "Vencho", role: "Brand Lead", sl: "brand", type: "Contractor", cadY: null, usdM: 4000, hrs: 40, lead: false },
  { id: "t15", name: "Joshua Ramkissoon", role: "Webflow Developer", sl: "site", type: "Full-Time", cadY: null, usdM: 3016, hrs: 160, lead: false },
  { id: "t16", name: "Igor Katcha", role: "Webflow Developer", sl: "site", type: "Contractor", cadY: null, usdM: 4000, hrs: 40, lead: false },
  { id: "t21", name: "Martin", role: "Animator", sl: "animation", type: "Contractor", cadY: null, usdM: 2000, hrs: 40, lead: false },
  { id: "t18", name: "Daniel Shin", role: "Project Manager", sl: "ops", type: "Full-Time", cadY: null, usdM: 2919, hrs: 160, lead: false },
  { id: "t19", name: "Christine Chow", role: "Digital Designer", sl: "brand", type: "Full-Time", cadY: null, usdM: 3518, hrs: 160, lead: false },
  { id: "t20", name: "Carson", role: "Chief of Staff", sl: "ops", type: "Full-Time", cadY: null, usdM: 6000, hrs: 160, lead: false },
];

const INIT_ACCOUNTS = [
  // ── Active retainers (synced to billing platform 2026-07-09) ──
  { id: "a1", name: "1AU Technologies", sl: "symphony", leadId: "t15", pmId: "t20", supportIds: [], status: "Active", type: "Retainer", retainer: 3000, project: 0, weight: 1, notes: "" },
  { id: "a2", name: "Attio", sl: "symphony", leadId: null, pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 1375, project: 0, weight: 3, notes: "" },
  { id: "a3", name: "Basis", sl: "symphony", leadId: "t10", pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 5000, project: 0, weight: 3, notes: "" },
  { id: "a5", name: "Highrise", sl: "symphony", leadId: "t15", pmId: "t20", supportIds: [], status: "Active", type: "Retainer", retainer: 5000, project: 0, weight: 4, notes: "" },
  { id: "a6", name: "Lumen", sl: "symphony", leadId: null, pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 4500, project: 0, weight: 5, notes: "" },
  { id: "a7", name: "Portal Space", sl: "symphony", leadId: "t10", pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 2750, project: 0, weight: 5, notes: "" },
  { id: "a8", name: "Vuecason", sl: "symphony", leadId: "t9", pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 3000, project: 0, weight: 1, notes: "" },
  { id: "a9", name: "Applecart", sl: "symphony", leadId: "t15", pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 2750, project: 0, weight: 4, notes: "" },
  { id: "a10", name: "Cytora", sl: "symphony", leadId: null, pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 3500, project: 0, weight: 4, notes: "" },
  { id: "a11", name: "Goody", sl: "symphony", leadId: "t9", pmId: "t3", supportIds: [], status: "Active", type: "Retainer", retainer: 4800, project: 0, weight: 5, notes: "" },
  { id: "a13",  name: "RBL",              sl: "symphony", leadId: "t10", pmId: "t3", supportIds: [], status: "Closed", type: "Retainer", retainer: 3000, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a115", name: "Complify",         sl: "symphony", leadId: null, pmId: "t20",  supportIds: [], status: "Active", type: "Retainer", retainer: 5000, project: 0, weight: 5, startDate: null, endDate: null, notes: "" },
  { id: "a119", name: "Tempus Ai",        sl: "symphony", leadId: null, pmId: "t3",  supportIds: [], status: "Active", type: "Retainer", retainer: 1250, project: 0, weight: 2, startDate: null, endDate: null, notes: "" },
  { id: "a122", name: "Lucenia",          sl: "symphony", leadId: null, pmId: "t18",  supportIds: [], status: "Active", type: "Retainer", retainer: 5000, project: 0, weight: 1, startDate: null, endDate: null, notes: "" },
  { id: "a200", name: "Anthro Energy",    sl: "symphony", leadId: null, pmId: "t18",  supportIds: [], status: "Active", type: "Retainer", retainer: 5000, project: 0, weight: 4, startDate: null, endDate: null, notes: "" },
  { id: "a201", name: "Voyager Ventures", sl: "symphony", leadId: null, pmId: "t18",  supportIds: [], status: "Active", type: "Retainer", retainer: 1500, project: 0, weight: 2, startDate: null, endDate: null, notes: "" },
  { id: "a400", name: "ARK Invest",       sl: "symphony", leadId: null,  supportIds: [], status: "Active", type: "Retainer", retainer: 6000, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a401", name: "Axle Energy",      sl: "symphony", leadId: null, pmId: "t3",  supportIds: [], status: "Active", type: "Retainer", retainer: 4500, project: 0, weight: 2, startDate: null, endDate: null, notes: "" },
  { id: "a402", name: "Chart R",          sl: "symphony", leadId: null, pmId: "t18",  supportIds: [], status: "Active", type: "Retainer", retainer: 4500, project: 0, weight: 5, startDate: null, endDate: null, notes: "" },
  { id: "a403", name: "Alcove",           sl: "symphony", leadId: null,  supportIds: [], status: "Active", type: "Retainer", retainer: 6000, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },

  // ── Churned retainers (kept for history) ──
  { id: "a4",   name: "Envoy",        sl: "symphony", leadId: "t10", supportIds: [], status: "Closed", type: "Retainer", retainer: 1500, project: 0, weight: 3, notes: "" },
  { id: "a12",  name: "Raspberry Ai", sl: "symphony", leadId: "t8",  supportIds: [], status: "Closed", type: "Retainer", retainer: 8750, project: 0, weight: 3, notes: "" },
  { id: "a114", name: "Tocaro Blue",  sl: "symphony", leadId: null,  supportIds: [], status: "Closed", type: "Retainer", retainer: 5000, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a118", name: "SirenOpt",     sl: "symphony", leadId: null,  supportIds: [], status: "Closed", type: "Retainer", retainer: 5000, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a120", name: "Guardrail Ai", sl: "symphony", leadId: null,  supportIds: [], status: "Closed", type: "Retainer", retainer: 3500, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a121", name: "Kevin Morris", sl: "symphony", leadId: null,  supportIds: [], status: "Closed", type: "Retainer", retainer: 3500, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },
  { id: "a202", name: "Atlas Rd",     sl: "symphony", leadId: null,  supportIds: [], status: "Closed", type: "Retainer", retainer: 3500, project: 0, weight: 3, startDate: null, endDate: null, notes: "" },

  // ── Flat-rate projects (from Notion 2026-07-09; fees set, dates pending) ──
  { id: "a500", name: "Alcove — Product Pilot", sl: "product", leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 6000,  weight: 2, depositPaid: false, startDate: "2026-06-01", endDate: "2026-07-31", notes: "PM: Daniel. Product pilot engagement." },
  { id: "a520", name: "Alcove — Website",       sl: "site",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 15000, weight: 2, depositPaid: false, startDate: "2026-06-01", endDate: "2026-07-31", notes: "PM: Daniel. Website build." },
  { id: "a501", name: "Ansa",                   sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 7500,  weight: 4, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-22", notes: "PM: Daniel" },
  { id: "a502", name: "Blair Health",           sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 20000, weight: 4, depositPaid: false, startDate: "2026-07-01", endDate: "2026-08-31", notes: "PM: Daniel" },
  { id: "a503", name: "Ciridae",                sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 60000, weight: 4, depositPaid: false, startDate: "2026-07-01", endDate: "2026-09-30", notes: "PM: Carson" },
  { id: "a504", name: "Fortastra",              sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 7500,  weight: 3, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-31", notes: "PM: Carson" },
  { id: "a505", name: "Giant Step VC",          sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 8000,  weight: 3, depositPaid: false, startDate: "2026-05-01", endDate: "2026-08-31", notes: "PM: Daniel" },
  { id: "a506", name: "Homemade Method",        sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 8000,  weight: 2, depositPaid: false, startDate: "2026-06-01", endDate: "2026-07-31", notes: "PM: Carson" },
  { id: "a507", name: "Inference Health",       sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 25000, weight: 5, depositPaid: false, startDate: "2026-06-01", endDate: "2026-08-31", notes: "PM: Daniel. Formerly Blair AI." },
  { id: "a508", name: "Kunin",                  sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 20000, weight: 4, depositPaid: false, startDate: "2026-06-01", endDate: "2026-07-31", notes: "PM: Carson" },
  { id: "a509", name: "Narya",                  sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 10000, weight: 3, depositPaid: false, startDate: "2026-05-01", endDate: "2026-05-31", notes: "PM: Carson. Will convert to Symphony, then primarily on Josh." },
  { id: "a510", name: "OG Venture Partners",    sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 20000, weight: 2, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-15", notes: "PM: Daniel" },
  { id: "a511", name: "Ops Companion",          sl: "deck",    leadId: null, pmId: "t20",  supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 10000, weight: 4, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-31", notes: "No PM assigned yet" },
  { id: "a512", name: "Revenant VC",            sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 5000,  weight: 2, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-22", notes: "PM: Carson" },
  { id: "a513", name: "Slang Ventures",         sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 7500,  weight: 4, depositPaid: false, startDate: "2026-06-01", endDate: "2026-06-30", notes: "PM: Daniel" },
  { id: "a514", name: "Spice VC",               sl: "site",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 16000, weight: 1, depositPaid: false, startDate: "2026-05-01", endDate: "2026-07-31", notes: "PM: Daniel. $10K original site + $6K expanded scope (animation) worked into the existing site." },
  { id: "a515", name: "Steel Atlas",            sl: "deck",    leadId: null, pmId: "t20", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 1000,  weight: 2, depositPaid: false, startDate: "2026-05-01", endDate: "2026-06-12", notes: "PM: Carson" },
  { id: "a516", name: "Twine Ventures",         sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 8500,  weight: 3, depositPaid: false, startDate: "2026-07-01", endDate: "2026-07-31", notes: "PM: Daniel" },
  { id: "a517", name: "VistaShares",            sl: "deck",    leadId: null, pmId: "t18", supportIds: [], status: "Active",   type: "Project", retainer: 0, project: 35000, weight: 4, depositPaid: false, startDate: "2026-06-01", endDate: "2026-08-31", notes: "PM: Daniel" },
  { id: "a518", name: "Axle Access",            sl: "deck",    leadId: null, pmId: "t20",  supportIds: [], status: "Pipeline", type: "Project", retainer: 0, project: 15000, weight: 4, depositPaid: false, startDate: null, endDate: null, notes: "Planning" },
  { id: "a519", name: "Interlude Capital",      sl: "deck",    leadId: null, pmId: "t18",  supportIds: [], status: "Pipeline", type: "Project", retainer: 0, project: 40000, weight: 4, depositPaid: false, startDate: null, endDate: null, notes: "Planning" },
  // ── From Notion PM views 2026-07-14 ──
  { id: "a521", name: "Bohr Systems", sl: "deck", leadId: null, pmId: "t20", supportIds: [], status: "Pipeline", type: "Project", retainer: 0, project: 0, weight: 3, depositPaid: false, startDate: null, endDate: null, notes: "Planning" },
  { id: "a522", name: "1921", sl: "deck", leadId: null, pmId: "t18", supportIds: [], status: "Paused", type: "Project", retainer: 0, project: 0, weight: 4, depositPaid: false, startDate: null, endDate: null, notes: "" },
  { id: "a523", name: "Atria", sl: "deck", leadId: null, pmId: "t18", supportIds: [], status: "Paused", type: "Project", retainer: 0, project: 0, weight: 1, depositPaid: false, startDate: null, endDate: null, notes: "" },
  { id: "a524", name: "Neru Health", sl: "deck", leadId: null, pmId: "t18", supportIds: [], status: "Paused", type: "Project", retainer: 0, project: 0, weight: 1, depositPaid: false, startDate: null, endDate: null, notes: "" },
];

// ── Org Chart Departments (independent of service lines) ──
const INIT_DEPTS = [
  { id: "d10", name: "Animation", memberIds: ["t21"], color: "bg-emerald-100 text-emerald-700" },
  { id: "d1", name: "Deck", memberIds: ["t5"], color: "bg-amber-100 text-amber-700" },
  { id: "d2", name: "Web Development", memberIds: ["t4", "t15", "t16"], color: "bg-teal-100 text-teal-700" },
  { id: "d3", name: "Brand", memberIds: ["t9", "t10", "t11", "t12", "t19"], color: "bg-rose-100 text-rose-700" },
  { id: "d4", name: "Product", memberIds: ["t6", "t7", "t8"], color: "bg-blue-100 text-blue-700" },
  { id: "d5", name: "Symphony", memberIds: [], color: "bg-violet-100 text-violet-700" },
];

const DEPT_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
];

// ── Helpers ──
const cost = (p: any) => p.usdM != null ? p.usdM : (p.cadY ? (p.cadY / 12) * CAD_TO_USD : 0);
// Accounts can span multiple service lines (sls array); fall back to legacy single sl
const acctSls = (a: any) => (a.sls && a.sls.length ? a.sls : (a.sl ? [a.sl] : []));
// PM workload: each managed account adds weight × this factor in capacity pts
// (managing is lighter per-account than designing — a PM tops out ~50 weight-pts of book)
const PM_LOAD_PER_WEIGHT = 0.1;
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : fmt(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const ini = (n: string) => n.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

// ── Project amortization helpers ──
const monthsBetween = (start: string, end: string) => {
  const s = new Date(start), e = new Date(end);
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, m);
};
const monthlyProjectRev = (a: any) => {
  if (!a.project) return 0;
  // No dates = $0 toward MRR — a flat fee only amortizes across a known
  // window. (Counting the full fee monthly inflated P&L revenue wildly.)
  if (!a.startDate || !a.endDate) return 0;
  const today = new Date();
  const start = new Date(a.startDate);
  const end = new Date(a.endDate);
  // Outside the project window → contributes $0 to current MRR
  if (today < start || today > end) return 0;
  return a.project / monthsBetween(a.startDate, a.endDate);
};
const isProjectLive = (a: any) => {
  if (!a.startDate || !a.endDate) return true;
  const today = new Date();
  return today >= new Date(a.startDate) && today <= new Date(a.endDate);
};

// Amortized project revenue landing in a specific calendar month (y, m 0-based)
const projRevInMonth = (a: any, y: number, m: number) => {
  if (!a.project || !a.startDate || !a.endDate) return 0;
  const s = new Date(a.startDate), e = new Date(a.endDate);
  const mStart = new Date(y, m, 1), mEnd = new Date(y, m + 1, 0, 23, 59, 59);
  if (s > mEnd || e < mStart) return 0;
  return a.project / monthsBetween(a.startDate, a.endDate);
};

// Revenue attribution: lead gets 50% (or 100% if delivering alone); support
// members AND the designated developer split the remaining 50% evenly.
const acctVal = (a: any) => a.retainer + monthlyProjectRev(a);
const delivPool = (a: any) => a.supportIds.length + (a.devId ? 1 : 0);
const leadShare = (a: any) => delivPool(a) > 0 ? acctVal(a) * 0.5 : acctVal(a);
const supShare = (a: any) => delivPool(a) > 0 ? (acctVal(a) * 0.5) / delivPool(a) : 0;
const personExposure = (personId: string, accounts: any[]) => {
  let asLead = 0, asSupport = 0, asDev = 0;
  accounts.forEach(a => {
    if (a.leadId === personId) asLead += leadShare(a);
    if (a.supportIds.includes(personId)) asSupport += supShare(a);
    if (a.devId === personId) asDev += supShare(a);
  });
  return { asLead, asSupport, asDev, total: asLead + asSupport + asDev };
};

// ── Flat-rate project economics ──
// Designer cost allocation reuses the workload capacity model: a person's
// slice of a project = their capacity points on it / 5 (lead w/ support =
// weight×0.7, solo lead = weight, support = weight×0.3 / #support).
// PM cost allocation is normalized instead: a PM's monthly cost is split
// across every active account they manage, proportional to account weight —
// so a PM's total allocated cost never exceeds their actual salary.
const pmBookWeight = (pmId: string, accounts: any[]) =>
  accounts
    .filter(x => x.pmId === pmId && ["Active", "Launch", "Growth"].includes(x.status))
    .reduce((s, x) => s + (x.weight ?? 3), 0);

const projectTeam = (a: any, team: any[], accounts: any[]) => {
  const w = a.weight ?? 3;
  const rows: any[] = [];
  const lead = team.find((p: any) => p.id === a.leadId);
  if (lead) {
    const pts = a.supportIds.length > 0 ? w * 0.7 : w;
    rows.push({ p: lead, role: "Lead", alloc: pts / 5 });
  }
  a.supportIds.forEach((id: string) => {
    const p = team.find((x: any) => x.id === id);
    if (p) rows.push({ p, role: "Support", alloc: (w * 0.3) / a.supportIds.length / 5 });
  });
  // Optional designated developer — support-style slice (weight × 0.3 / 5)
  const dev = team.find((p: any) => p.id === a.devId);
  if (dev) rows.push({ p: dev, role: "Dev", alloc: (w * 0.3) / 5 });
  const pm = team.find((p: any) => p.id === a.pmId);
  if (pm) {
    const bookW = pmBookWeight(pm.id, accounts);
    rows.push({ p: pm, role: "PM", alloc: bookW > 0 ? w / bookW : 0 });
  }
  return rows.map(r => ({ ...r, monthlyCost: cost(r.p) * r.alloc }));
};

// Revenue attribution on a project's total fee (lead 50% / support+dev split 50%,
// same model as retainer attribution above)
const projFeeShare = (a: any, personId: string) => {
  const pool = delivPool(a);
  if (a.leadId === personId) return pool > 0 ? a.project * 0.5 : a.project;
  if (a.supportIds.includes(personId) || a.devId === personId) return (a.project * 0.5) / pool;
  return 0;
};

// How far through the project window we are, 0→1 (null if no dates)
const projElapsed = (a: any) => {
  if (!a.startDate || !a.endDate) return null;
  const s = new Date(a.startDate).getTime(), e = new Date(a.endDate).getTime(), now = Date.now();
  if (e <= s) return 1;
  return Math.min(1, Math.max(0, (now - s) / (e - s)));
};

// Full economics for one flat-rate project
const projectEcon = (a: any, team: any[], accounts: any[], costs: any[] = []) => {
  const members = projectTeam(a, team, accounts);
  const teamMonthly = members.reduce((s, m) => s + m.monthlyCost, 0);
  const hasDates = !!(a.startDate && a.endDate);
  const months = hasDates ? monthsBetween(a.startDate, a.endDate) : null;
  // External spend explicitly attributed to this project (e.g. Upwork devs).
  // It's an actual total, not a monthly rate, so it adds on top of team cost.
  const external = costs.filter(c => c.accountId === a.id);
  const externalTotal = external.reduce((s, c) => s + Number(c.amount || 0), 0);
  const teamTotal = months != null ? teamMonthly * months : null;
  const totalCost = teamTotal != null ? teamTotal + externalTotal : (externalTotal > 0 ? externalTotal : null);
  const profit = totalCost != null ? a.project - totalCost : null;
  const marginPct = profit != null && a.project > 0 ? profit / a.project : null;
  const elapsed = projElapsed(a);
  return { members, teamMonthly, hasDates, months, teamTotal, external, externalTotal, totalCost, profit, marginPct, elapsed,
    // burn-to-date: team cost accrues over the window, external is already spent
    costToDate: teamTotal != null && elapsed != null ? teamTotal * elapsed + externalTotal : null,
    revToDate: elapsed != null ? a.project * elapsed : null };
};

// ── Components ──
const Av = ({ name, size = 36, sl, lead }) => {
  const bg = lead ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600";
  return (
    <div className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${bg}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {ini(name)}
    </div>
  );
};

const Tag = ({ children, variant = "default", small }) => {
  const base = small ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1";
  const variants = {
    default: "bg-gray-100 text-gray-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-600",
    dark: "bg-gray-800 text-white",
    sl: children, // will be overridden below
  };
  const cls = variant === "sl" ? children : (variants[variant] || variants.default);
  return <span className={`font-semibold rounded-full tracking-wide ${base} ${typeof cls === "string" ? cls : variants.default}`}>{variant === "sl" ? null : children}</span>;
};

const SlTag = ({ sl, small }) => {
  const s = SL[sl];
  if (!s) return null;
  const base = small ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1";
  return <span className={`font-semibold rounded-full tracking-wide ${base} ${s.color}`}>{s.name}</span>;
};

// All of an account's service line tags
const SlTags = ({ a, small }) => <>{acctSls(a).map((s: string) => <SlTag key={s} sl={s} small={small} />)}</>;

// Payment status from the Mercury rollup — 🟢 paid up / 🟡 due / 🔴 overdue
const PAY_STYLE: Record<string, any> = {
  current: { dot: "bg-emerald-400", text: "text-emerald-600" },
  due:     { dot: "bg-amber-400",   text: "text-amber-600" },
  overdue: { dot: "bg-red-500",     text: "text-red-500" },
};
const payLabel = (p: any) =>
  p.status === "overdue" ? `${p.overdueDays}d overdue · ${fmtK(p.overdue)}`
  : p.status === "due" ? `${fmtK(p.outstanding)} due`
  : "Paid up";
const PayDot = ({ pay, showLabel }: any) => {
  if (!pay) return null;
  const s = PAY_STYLE[pay.status];
  return (
    <span className="inline-flex items-center gap-1.5" title={`Mercury: ${payLabel(pay)}${pay.lastPaid ? ` · last paid ${pay.lastPaid}` : ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {showLabel && <span className={`text-[10px] font-semibold ${s.text}`}>{payLabel(pay)}</span>}
    </span>
  );
};

const StatusTag = ({ status, small }) => {
  const base = small ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1";
  const colors = {
    Growth: "bg-emerald-50 text-emerald-600",
    Launch: "bg-blue-50 text-blue-600",
    Active: "bg-emerald-50 text-emerald-600",
    Pipeline: "bg-amber-50 text-amber-600",
    Paused: "bg-gray-100 text-gray-500",
    Closed: "bg-red-50 text-red-500",
  };
  return <span className={`font-semibold rounded-full tracking-wide ${base} ${colors[status] || colors.Pipeline}`}>{status}</span>;
};

const Inp = ({ label, value, onChange, type = "text", opts, ph }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">{label}</label>}
    {opts ? (
      <select value={value || ""} onChange={e => onChange(e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none">
        <option value="">—</option>
        {opts.map(o => <option key={typeof o === "object" ? o.value : o} value={typeof o === "object" ? o.value : o}>{typeof o === "object" ? o.label : o}</option>)}
      </select>
    ) : (
      <input type={type} value={value ?? ""} onChange={e => onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} placeholder={ph}
        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none w-full" />
    )}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white border border-gray-200 rounded-2xl p-7 w-[460px] max-h-[85vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between mb-5">
        <h3 className="text-xl font-medium text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Sidebar ──
// ── Person sidebar panel (own component so hooks are at top level) ──
const PersonSidebar = ({ p, accounts, onClose, onEdit, onAssign }) => {
  const [assignRole, setAssignRole] = useState(p.lead ? "lead" : "support");
  const [assignAcctId, setAssignAcctId] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const c = cost(p);
  const led = accounts.filter(a => a.leadId === p.id);
  const sup = accounts.filter(a => a.supportIds.includes(p.id));
  const pmd = accounts.filter(a => a.pmId === p.id && a.status !== "Closed");
  const exp = personExposure(p.id, accounts);
  const available = accounts.filter(a =>
    !["Closed"].includes(a.status) &&
    a.leadId !== p.id &&
    !a.supportIds.includes(p.id)
  );

  return (
    <div className="w-96 min-w-[384px] border-l border-gray-200 bg-gray-50 overflow-auto h-full">
      <div className="px-6 pt-7 pb-5">
        <div className="flex justify-between items-start">
          <div className="flex gap-3.5 items-center">
            <Av name={p.name} size={52} sl={p.sl} lead={p.lead} />
            <div>
              <div className="text-lg font-medium text-gray-900">{p.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.role}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="flex gap-1.5 mt-3.5">
          <SlTag sl={p.sl} />
          <Tag>{p.type}</Tag>
          {p.lead && <Tag variant="dark">Pod Lead</Tag>}
        </div>
      </div>

      <div className="h-px bg-gray-200 w-full" />

      <div className="px-6 py-5">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3.5">Compensation</div>
        <div className="grid grid-cols-2 gap-4">
          {p.cadY && <div><div className="text-[10px] text-gray-400 mb-0.5">Annual CAD</div><div className="text-xl font-medium text-gray-900">{fmt(p.cadY)}</div></div>}
          <div><div className="text-[10px] text-gray-400 mb-0.5">Monthly USD</div><div className="text-xl font-medium text-gray-900">{fmt(Math.round(c))}</div></div>
          <div><div className="text-[10px] text-gray-400 mb-0.5">Annual USD</div><div className="text-base text-gray-500">{fmt(Math.round(c * 12))}</div></div>
          {p.hrs > 0 && <div><div className="text-[10px] text-gray-400 mb-0.5">Effective $/hr</div><div className="text-base text-gray-500">{fmt(Math.round(c / p.hrs))}</div></div>}
        </div>
      </div>

      <div className="h-px bg-gray-200 w-full" />

      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Accounts</div>
          <button onClick={() => { setShowAssign(v => !v); setAssignAcctId(""); }}
            className="text-[10px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors">
            {showAssign ? "Cancel" : "+ Assign"}
          </button>
        </div>

        {showAssign && (
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 mb-3">
            <div className="flex gap-1.5 mb-2.5">
              {(p.lead ? ["lead", "support"] : ["support"]).map(r => (
                <button key={r} onClick={() => setAssignRole(r)}
                  className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg capitalize transition-colors ${assignRole === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {r}
                </button>
              ))}
            </div>
            <select value={assignAcctId} onChange={e => setAssignAcctId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none mb-2.5">
              <option value="">Pick an account…</option>
              {available.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={() => { if (assignAcctId) { onAssign(p.id, assignAcctId, assignRole); setShowAssign(false); setAssignAcctId(""); } }}
              disabled={!assignAcctId}
              className={`w-full py-2 rounded-lg text-[11px] font-semibold transition-colors ${assignAcctId ? "bg-gray-900 text-white hover:bg-gray-700" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
              Assign to {p.name.split(" ")[0]}
            </button>
          </div>
        )}

        {[...led.map(a => ({ ...a, _role: "Lead", _share: leadShare(a) })), ...sup.map(a => ({ ...a, _role: "Support", _share: supShare(a) })), ...accounts.filter(a => a.devId === p.id).map(a => ({ ...a, _role: "Dev", _share: supShare(a) }))].map(a => (
          <div key={a.id + a._role} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-white border border-gray-200 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-900">{a.name}</span>
              <Tag small variant={a._role === "Lead" ? "green" : a._role === "Dev" ? "dark" : "default"}>{a._role}</Tag>
            </div>
            <span className="text-xs font-semibold text-emerald-600">{fmt(Math.round(a._share))}</span>
          </div>
        ))}
        {pmd.map(a => (
          <div key={a.id + "pm"} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-white border border-gray-200 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-900">{a.name}</span>
              <Tag small variant="amber">PM</Tag>
            </div>
            <span className="text-[10px] text-gray-400">{Math.round((a.weight ?? 3) * PM_LOAD_PER_WEIGHT * 10) / 10}pt</span>
          </div>
        ))}
        {led.length + sup.length + pmd.length === 0 && !showAssign && <div className="text-xs text-gray-400 italic">No accounts assigned</div>}
      </div>

      <div className="px-6 pb-6 pt-3">
        <button onClick={() => onEdit("person", p)} className="w-full bg-gray-900 rounded-lg py-3 text-white text-xs font-semibold tracking-wide hover:bg-gray-800 transition-colors">Edit Person</button>
      </div>
    </div>
  );
};

const Sidebar = ({ selected, team, accounts, onClose, onEdit, onAssign }) => {
  if (!selected) return null;
  const { type, data } = selected;

  if (type === "person") {
    return <PersonSidebar p={data} accounts={accounts} onClose={onClose} onEdit={onEdit} onAssign={onAssign} />;
  }

  if (type === "account") {
    const a = data;
    const lead = team.find(p => p.id === a.leadId);
    const pm = team.find(p => p.id === a.pmId);
    const dev = team.find(p => p.id === a.devId);
    const sups = team.filter(p => a.supportIds.includes(p.id));

    return (
      <div className="w-96 min-w-[384px] border-l border-gray-200 bg-gray-50 overflow-auto h-full">
        <div className="px-6 pt-7 pb-5">
          <div className="flex justify-between">
            <div>
              <div className="text-xl font-medium text-gray-900">{a.name}</div>
              <div className="flex gap-1.5 mt-2.5">
                <SlTags a={a} />
                <StatusTag status={a.status} />
                <Tag>{a.type}</Tag>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full" />

        <div className="px-6 py-5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2.5">Revenue</div>
          <div className="text-3xl font-medium text-gray-900">{fmt(a.retainer + a.project)}<span className="text-base text-gray-400">/mo</span></div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-white rounded-lg px-3.5 py-3 border border-gray-200">
              <div className="text-[9px] text-gray-400 uppercase tracking-wider">Retainer</div>
              <div className="text-base font-medium text-gray-900 mt-0.5">{fmt(a.retainer)}</div>
            </div>
            <div className="bg-white rounded-lg px-3.5 py-3 border border-gray-200">
              <div className="text-[9px] text-gray-400 uppercase tracking-wider">Project</div>
              <div className="text-base font-medium text-gray-900 mt-0.5">{fmt(a.project)}</div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full" />

        <div className="px-6 py-5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2.5">Team</div>
          {lead && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg mb-1.5 border border-gray-200">
              <Av name={lead.name} size={32} sl={lead.sl} lead={lead.lead} />
              <div className="flex-1"><div className="text-[13px] font-medium text-gray-900">{lead.name}</div><div className="text-[10px] text-gray-400">{lead.role}</div></div>
              <Tag small variant="green">Lead</Tag>
            </div>
          )}
          {sups.map(p => (
            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg mb-1.5 border border-gray-200">
              <Av name={p.name} size={28} sl={p.sl} />
              <div className="flex-1"><div className="text-xs font-medium text-gray-900">{p.name}</div></div>
              <Tag small>Support</Tag>
            </div>
          ))}
          {dev && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg mb-1.5 border border-gray-200">
              <Av name={dev.name} size={28} sl={dev.sl} />
              <div className="flex-1"><div className="text-xs font-medium text-gray-900">{dev.name}</div><div className="text-[10px] text-gray-400">{dev.role}</div></div>
              <Tag small variant="dark">Dev</Tag>
            </div>
          )}
          {pm && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg mb-1.5 border border-gray-200">
              <Av name={pm.name} size={28} sl={pm.sl} />
              <div className="flex-1"><div className="text-xs font-medium text-gray-900">{pm.name}</div><div className="text-[10px] text-gray-400">{pm.role}</div></div>
              <Tag small variant="amber">PM</Tag>
            </div>
          )}
          {!lead && sups.length === 0 && !pm && !dev && (
            <div className="text-[11px] text-gray-300 italic">No team assigned</div>
          )}
        </div>

        {a.notes && (<><div className="h-px bg-gray-200 w-full" /><div className="px-6 py-5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1.5">Scope</div>
          <div className="text-[13px] text-gray-500 leading-relaxed">{a.notes}</div>
        </div></>)}

        <div className="px-6 pb-6 pt-3">
          <button onClick={() => onEdit("account", a)} className="w-full bg-gray-900 rounded-lg py-3 text-white text-xs font-semibold tracking-wide hover:bg-gray-800 transition-colors">Edit Account</button>
        </div>
      </div>
    );
  }

  return null;
};

// ── KPI Card ──
const KpiCard = ({ label, value, sub, color = "text-gray-900" }) => (
  <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex-1 min-w-[160px]">
    <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1.5">{label}</div>
    <div className={`text-2xl font-medium ${color}`}>{value}</div>
    {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
  </div>
);

// ═══════════════════════════════
// MAIN
// ═══════════════════════════════
export default function App() {
  const [team, setTeam] = useState(INIT_TEAM);
  const [accounts, setAccounts] = useState(INIT_ACCOUNTS);
  const [depts, setDepts] = useState(INIT_DEPTS);
  const [pods, setPods] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [costRules, setCostRules] = useState<any[]>([]);
  const [importText, setImportText] = useState("");
  const [costsShowAll, setCostsShowAll] = useState(false);
  // Costs tab: account id to filter the transaction list to (null = no filter).
  // Set by clicking a "By project" row so its transactions can be reassigned.
  const [costsFilter, setCostsFilter] = useState(null);
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [mercury, setMercury] = useState<any>(null);        // Mercury invoice sync result
  const [mercuryLoading, setMercuryLoading] = useState(false);
  const loadMercury = () => {
    setMercuryLoading(true);
    fetch("/api/mercury")
      .then(r => r.json())
      .then(setMercury)
      .catch(e => setMercury({ connected: true, error: String(e?.message || e) }))
      .finally(() => setMercuryLoading(false));
  };
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [nid, setNid] = useState(20);
  const [deptNid, setDeptNid] = useState(10);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [acctView, setAcctView] = useState<"list" | "pods">("pods");
  const [acctTab, setAcctTab] = useState<"retainer" | "projects" | "closed">("retainer");
  const [workloadTab, setWorkloadTab] = useState<"leads" | "symphony" | "product" | "pm" | "all">("leads");
  const [invoiceTab, setInvoiceTab] = useState<"overview" | "overdue" | "monthly">("overview");
  const [quickAssign, setQuickAssign] = useState<{ personId: string; role: "lead" | "support"; acctId: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, a, d, pd, cs] = await Promise.all([fetchTeam(), fetchAccounts(), fetchDepartments(), fetchPods().catch(() => []), fetchCosts().catch(() => [])]);
        if (t.length > 0) setTeam(t);
        if (a.length > 0) setAccounts(a);
        if (d.length > 0) setDepts(d);
        if (pd.length > 0) setPods(pd);
        if (cs.length > 0) setCosts(cs);
        try { setCostRules(await fetchCostRules()); } catch {}
      } catch (e) {
        console.error("Failed to load from Supabase, using local data:", e);
        setSaveError(`Couldn't load from the database (${e?.message || "Supabase error"}) — showing built-in fallback data. Edits won't persist.`);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Pull Mercury invoices once on load so every tab (Projects, Accounts,
  // Invoices) can show per-account payment status.
  useEffect(() => { loadMercury(); }, []);

  const slPods = useMemo(() => {
    // Service-line P&L (disciplines). Distinct from the `pods` state (real
    // cross-functional pods). Overhead = ops + leadership split across clients.
    const overheadCost = team
      .filter(p => p.sl === "ops" || p.sl === "leadership")
      .reduce((s, p) => s + cost(p), 0);
    const allActiveAccts = accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status));
    const totalClients = allActiveAccts.length;
    const overheadPerClient = totalClients > 0 ? overheadCost / totalClients : 0;

    return SERVICE_LINES
      .filter(sl => sl.id !== "ops" && sl.id !== "leadership")
      .map(sl => {
        const members = team.filter(p => p.sl === sl.id);
        const accts = allActiveAccts.filter(a => acctSls(a).includes(sl.id));
        // acctVal = retainer + amortized project revenue (full fee ÷ project
        // months, $0 outside the window) — not the raw fee, which would
        // inflate MRR for the whole life of a flat-rate project.
        // Multi-line accounts split their value evenly across their lines
        // so pod revenue never double-counts.
        const rev = accts.reduce((s, a) => s + acctVal(a) / acctSls(a).length, 0);
        const directCost = members.reduce((s, p) => s + cost(p), 0);
        const overheadAlloc = overheadPerClient * accts.reduce((s, a) => s + 1 / acctSls(a).length, 0);
        const c = directCost + overheadAlloc;
        return { ...sl, members, accounts: accts, rev, cost: c, directCost, overheadAlloc, margin: rev - c, marginPct: rev > 0 ? (rev - c) / rev : (c > 0 ? -1 : 0) };
      })
      .filter(p => p.members.length > 0 || p.accounts.length > 0);
  }, [team, accounts]);

  const totals = useMemo(() => {
    const r = slPods.reduce((s, p) => s + p.rev, 0);
    const people = team.reduce((s, p) => s + cost(p), 0);
    // External vendor spend is lumpy month to month, so the P&L carries a
    // trailing 3-month average rather than whichever month you're looking at.
    const byMonth: Record<string, number> = {};
    costs.forEach((x: any) => {
      const m = (x.month || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + Number(x.amount || 0);
    });
    const recent = Object.keys(byMonth).sort().reverse().slice(0, 3);
    const vendor = recent.length ? recent.reduce((s, m) => s + byMonth[m], 0) / recent.length : 0;
    const c = people + vendor;
    return { rev: r, cost: c, people, vendor, margin: r - c, pct: r > 0 ? (r - c) / r : 0, heads: team.length, active: accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status)).length };
  }, [slPods, team, accounts, costs]);

  const save = async (type, d) => {
    setSaveError(null);
    if (type === "person") {
      if (!d.id) { d = { ...d, id: crypto.randomUUID() }; }
      const prev = team;
      setTeam(t => t.find(x => x.id === d.id) ? t.map(x => x.id === d.id ? d : x) : [...t, d]);
      try { await upsertTeamMember(d); } catch (e: any) {
        console.error("Save person failed:", e);
        setSaveError(`Save failed: ${e?.message || "Supabase error"} — change was not saved.`);
        setTeam(prev); // revert on failure
      }
    } else {
      if (!d.id) { d = { ...d, id: crypto.randomUUID() }; }
      // Keep legacy single sl in sync with the multi-select (first line = primary)
      d = { ...d, sls: acctSls(d), sl: acctSls(d)[0] || "" };
      const prev = accounts;
      setAccounts(a => a.find(x => x.id === d.id) ? a.map(x => x.id === d.id ? d : x) : [...a, d]);
      try { await upsertAccount(d); } catch (e: any) {
        console.error("Save account failed:", e);
        setSaveError(`Save failed: ${e?.message || "Supabase error"} — change was not saved.`);
        setAccounts(prev); // revert on failure
      }
    }
    setModal(null);
  };
  const del = async (type, id) => {
    setSaveError(null);
    if (type === "person") {
      setTeam(t => t.filter(p => p.id !== id));
      try { await deleteTeamMember(id); } catch (e: any) {
        console.error("Delete person failed:", e);
        setSaveError(`Delete failed: ${e?.message || "Supabase error"}`);
      }
    } else {
      setAccounts(a => a.filter(x => x.id !== id));
      try { await deleteAccount(id); } catch (e: any) {
        console.error("Delete account failed:", e);
        setSaveError(`Delete failed: ${e?.message || "Supabase error"}`);
      }
    }
    setSelected(null); setModal(null);
  };

  const assignAccount = async (personId, acctId, role) => {
    const acct = accounts.find(a => a.id === acctId);
    if (!acct) return;
    let updated;
    if (role === "lead") {
      updated = { ...acct, leadId: personId };
    } else {
      const ids = acct.supportIds.includes(personId) ? acct.supportIds : [...acct.supportIds, personId];
      updated = { ...acct, supportIds: ids };
    }
    const prev = accounts;
    setAccounts(a => a.map(x => x.id === acctId ? updated : x));
    try { await upsertAccount(updated); } catch (e: any) {
      setSaveError(`Save failed: ${e?.message || "Supabase error"} — change was not saved.`);
      setAccounts(prev);
    }
    setQuickAssign(null);
  };

  // True only when the Mercury sync actually returned data — lets the UI tell
  // "Mercury is down / not connected" apart from "this client has no invoices"
  const mercuryReady = !!mercury?.byCustomer;
  // Per-account payment status. The route resolves this per account id —
  // honouring explicit invoice claims first, then falling back to name match.
  const payFor = (a: any) => {
    if (!mercury?.byCustomer) return null;
    const r = mercury.byAccount?.[a.id];
    if (!r) return null; // no Mercury invoices matched to this account
    const status = r.overdue > 0 ? "overdue" : r.outstanding > 0 ? "due" : "current";
    const overdueDays = r.oldestDue ? Math.max(0, Math.round((Date.now() - new Date(r.oldestDue).getTime()) / 86400000)) : 0;
    return { ...r, status, overdueDays };
  };
  const collections = useMemo(() => {
    const bc = mercury?.byCustomer;
    if (!bc) return null;
    let overdue = 0, overdueCount = 0, outstanding = 0;
    Object.values(bc).forEach((r: any) => {
      outstanding += r.outstanding || 0;
      if (r.overdue > 0) { overdue += r.overdue; overdueCount++; }
    });
    return { overdue, overdueCount, outstanding };
  }, [mercury]);

  // ── External / vendor costs ──────────────────────────────────────────────
  // Spend that isn't a person on the roster (Upwork dev, agencies, software).
  // Monthly figures are lumpy, so the P&L uses a trailing 3-month average.
  const costStats = useMemo(() => {
    const byMonth: Record<string, number> = {};
    const byVendor: Record<string, { total: number; months: number }> = {};
    costs.forEach((c: any) => {
      const m = (c.month || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + Number(c.amount || 0);
      const v = byVendor[c.vendor] || (byVendor[c.vendor] = { total: 0, months: 0 });
      v.total += Number(c.amount || 0); v.months++;
    });
    const months = Object.keys(byMonth).sort().reverse();
    const recent = months.slice(0, 3);
    const trailingAvg = recent.length ? recent.reduce((s, m) => s + byMonth[m], 0) / recent.length : 0;
    const total = Object.values(byMonth).reduce((s, v) => s + v, 0);
    return { byMonth, byVendor, months, trailingAvg, total };
  }, [costs]);

  // Any account can carry external cost — dev work happens on retainers too.
  // Grouped so active work is easy to find among the archived projects.
  const costTargetGroups = useMemo(() => {
    const live = (a: any) => ["Active", "Launch", "Growth"].includes(a.status);
    const byName = (a: any, b: any) => a.name.localeCompare(b.name);
    return [
      { label: "Internal", items: accounts.filter(a => a.isInternal).sort(byName) },
      { label: "Active projects", items: accounts.filter(a => !a.isInternal && a.type !== "Retainer" && live(a)).sort(byName) },
      { label: "Retainers", items: accounts.filter(a => !a.isInternal && a.type === "Retainer" && live(a)).sort(byName) },
      { label: "Closed / archived", items: accounts.filter(a => !a.isInternal && !live(a)).sort(byName) },
    ].filter(g => g.items.length > 0);
  }, [accounts]);
  const CostTargetOptions = () => (
    <>{costTargetGroups.map(g => (
      <optgroup key={g.label} label={g.label}>
        {g.items.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </optgroup>
    ))}</>
  );

  // ── Upwork CSV import ────────────────────────────────────────────────────
  // Parses an Upwork export, finds the freelancer/contract + amount + date
  // columns whatever they're called, and pre-assigns each row to a project
  // using saved rules so you only ever map a given freelancer once.
  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const splitRow = (line: string) => {
      const out: string[] = []; let cur = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === "," && !q) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur); return out.map(s => s.trim());
    };
    const head = splitRow(lines[0]).map(h => h.toLowerCase());
    const findCol = (...names: string[]) => head.findIndex(h => names.some(n => h.includes(n)));
    const iDate = findCol("date");
    const iAmt = findCol("amount", "total");
    // Prefer a real contract/freelancer column; the payment report has neither
    const iWho = findCol("freelancer", "contract", "description", "team", "payment method");
    const iType = findCol("type");
    const iRef = findCol("reference id", "reference", "ref id");
    if (iDate < 0 || iAmt < 0) return [];
    const rows: any[] = [];
    for (const line of lines.slice(1)) {
      const c = splitRow(line);
      const amount = parseFloat((c[iAmt] || "").replace(/[^0-9.\-]/g, ""));
      if (!isFinite(amount) || amount === 0) continue;
      const d = new Date((c[iDate] || "").replace(/"/g, ""));
      if (isNaN(d.getTime())) continue;
      const who = (iWho >= 0 ? c[iWho] : "") || "Upwork";
      const rule = costRules.find((r: any) => who.toLowerCase().includes(r.matchText.toLowerCase()));
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      // Stable id per transaction — Upwork's Reference ID when present, else
      // date+amount. Re-importing the same transaction updates that row instead
      // of creating a duplicate, so existing project assignments survive.
      const ref = iRef >= 0 ? (c[iRef] || "").replace(/\W/g, "") : "";
      const id = ref ? `upw-${ref}` : `upw-${month}-${Math.round(amount * 100)}`;
      const existing = costs.find((x: any) => x.id === id);
      rows.push({
        id, who, amount, type: iType >= 0 ? c[iType] : "",
        month,
        // never clobber an assignment you've already made
        accountId: existing?.accountId || rule?.accountId || null,
        alreadyAssigned: !!existing?.accountId, isNew: !existing, remember: false,
      });
    }
    return rows;
  };

  const runImport = async () => {
    if (!importRows?.length) return;
    setSaveError(null);
    // One row per transaction, keyed by a stable id. Re-importing simply updates
    // matching rows — nothing is deleted, so project assignments always survive.
    const newRows = importRows.map(r => ({
      id: r.id, vendor: "Upwork", category: "Development",
      amount: Math.round(r.amount * 100) / 100, month: r.month, accountId: r.accountId,
      notes: `Imported from Upwork · ${r.who}`,
    }));
    try {
      for (const r of newRows) await upsertCost(r);
      for (const r of importRows.filter(x => x.remember && x.accountId)) {
        await upsertCostRule({ id: crypto.randomUUID(), matchText: r.who, accountId: r.accountId, vendor: "Upwork" });
      }
      const byId = new Set(newRows.map(r => r.id));
      setCosts(cs => [...cs.filter((c: any) => !byId.has(c.id)), ...newRows]);
      try { setCostRules(await fetchCostRules()); } catch {}
      setImportRows(null); setImportText("");
    } catch (e: any) { setSaveError(`Import failed: ${e?.message || "Supabase error"}`); }
  };

  const saveCost = async (d: any) => {
    setSaveError(null);
    let c = d.id ? d : { ...d, id: crypto.randomUUID() };
    const prev = costs;
    setCosts(cs => cs.find((x: any) => x.id === c.id) ? cs.map((x: any) => x.id === c.id ? c : x) : [...cs, c]);
    try { await upsertCost(c); } catch (e: any) { setSaveError(`Save failed: ${e?.message || "Supabase error"}`); setCosts(prev); }
    setModal(null);
  };
  // Replace one cost row with several project-tagged rows (keeps any unallocated
  // remainder as an untagged row so the month's total never changes).
  const applySplit = async (d: any) => {
    setSaveError(null);
    const parts = d._splits.filter((s: any) => s.accountId && Number(s.amount) > 0);
    if (!parts.length) return;
    const allocated = parts.reduce((s: number, x: any) => s + Number(x.amount), 0);
    const left = Math.round((Number(d.amount) - allocated) * 100) / 100;
    const base = { vendor: d.vendor, category: d.category, month: d.month };
    const rows = parts.map((s: any) => ({
      ...base, id: crypto.randomUUID(), amount: Number(s.amount), accountId: s.accountId,
      notes: d.notes || "",
    }));
    if (left > 0.01) rows.push({ ...base, id: crypto.randomUUID(), amount: left, accountId: null, notes: (d.notes || "") + " (unattributed remainder)" });
    const prev = costs;
    setCosts(cs => [...cs.filter((c: any) => c.id !== d.id), ...rows]);
    try {
      for (const r of rows) await upsertCost(r);
      if (d.id) await deleteCost(d.id);
    } catch (e: any) { setSaveError(`Split failed: ${e?.message || "Supabase error"}`); setCosts(prev); }
    setModal(null);
  };

  const removeCost = async (id: string) => {
    const prev = costs;
    setCosts(cs => cs.filter((x: any) => x.id !== id));
    try { await deleteCost(id); } catch (e: any) { setSaveError(`Delete failed: ${e?.message || "Supabase error"}`); setCosts(prev); }
    setModal(null);
  };

  const getName = id => team.find(p => p.id === id)?.name || "—";
  const slOpts = SERVICE_LINES.map(s => ({ value: s.id, label: s.name }));
  const teamOpts = team.map(p => ({ value: p.id, label: p.name }));
  // Lead candidates = people with the Pod Lead tag (is_lead)
  const leadOpts = team.filter(p => p.lead).map(p => ({ value: p.id, label: p.name }));
  // PM candidates = Operations people; Dev candidates = Web Development department members
  const pmOpts = team.filter(p => p.sl === "ops").map(p => ({ value: p.id, label: p.name }));
  const webDept = depts.find(d => d.name.toLowerCase().includes("web dev"));
  const devOpts = (webDept ? team.filter(p => webDept.memberIds.includes(p.id)) : team).map(p => ({ value: p.id, label: p.name }));

  // Grouped for the sidebar — keeps the list readable as tabs are added
  const navGroups = [
    { label: "Studio", items: [
      { id: "dashboard", label: "Dashboard" },
    ]},
    { label: "People", items: [
      { id: "workload", label: "Workload" },
      { id: "team", label: "Team" },
      { id: "org", label: "Org Chart" },
      { id: "pods", label: "Pods" },
    ]},
    { label: "Clients", items: [
      { id: "accounts", label: "Accounts" },
      { id: "projects", label: "Projects" },
    ]},
    { label: "Money", items: [
      { id: "invoices", label: "Invoices" },
      { id: "costs", label: "Costs" },
      { id: "pnl", label: "P&L" },
    ]},
  ];

  // ── Pod economics: exclusive membership, so a pod gets full account value
  // and full member cost (no splitting needed). Reuses per-account/-person math.
  const podStats = useMemo(() => pods.map(pod => {
    const members = team.filter(p => p.podId === pod.id);
    const accts = accounts.filter(a => a.podId === pod.id);
    const activeAccts = accts.filter(a => ["Active", "Launch", "Growth"].includes(a.status));
    const rev = activeAccts.reduce((s, a) => s + acctVal(a), 0);
    const c = members.reduce((s, p) => s + cost(p), 0);
    const lead = team.find(p => p.id === pod.leadId);
    return { ...pod, members, accounts: accts, activeAccts, lead, rev, cost: c, margin: rev - c, marginPct: rev > 0 ? (rev - c) / rev : (c > 0 ? -1 : 0) };
  }), [pods, team, accounts]);
  // Division 2 — the studio bench: specialists, PMs, producer (everyone not on a
  // pod, minus leadership/escalation). A permanent home, not an "unassigned" error.
  const benchPeople = useMemo(() => team.filter(p => !p.podId && p.sl !== "leadership"), [team]);
  // Only active RETAINERS belong in pods; flat-rate projects are bench work by design.
  const retainersToPlace = useMemo(() => accounts.filter(a => a.type === "Retainer" && !a.podId && ["Active", "Launch", "Growth"].includes(a.status)), [accounts]);

  const savePod = async (d: any) => {
    setSaveError(null);
    let pod = d;
    // UUID ids — never a reused counter (a per-session counter collides with
    // pods loaded from the DB and silently overwrites them)
    if (!pod.id) pod = { ...pod, id: crypto.randomUUID(), sortOrder: pods.length };
    const prev = pods;
    setPods(ps => ps.find(x => x.id === pod.id) ? ps.map(x => x.id === pod.id ? pod : x) : [...ps, pod]);
    try { await upsertPod(pod); } catch (e: any) { setSaveError(`Save failed: ${e?.message || "Supabase error"}`); setPods(prev); }
    setModal(null);
  };
  const removePod = async (id: string) => {
    const prevP = pods, prevA = accounts, prevT = team;
    setPods(ps => ps.filter(x => x.id !== id));
    setAccounts(a => a.map(x => x.podId === id ? { ...x, podId: null } : x));
    setTeam(t => t.map(x => x.podId === id ? { ...x, podId: null } : x));
    try {
      await Promise.all([
        ...accounts.filter(a => a.podId === id).map(a => upsertAccount({ ...a, podId: null })),
        ...team.filter(p => p.podId === id).map(p => upsertTeamMember({ ...p, podId: null })),
      ]);
      await deletePod(id);
    } catch (e: any) { setSaveError(`Delete failed: ${e?.message || "Supabase error"}`); setPods(prevP); setAccounts(prevA); setTeam(prevT); }
    setModal(null);
  };
  // Move a person or account into (or out of, podId=null) a pod
  const assignToPod = async (kind: "person" | "account", id: string, podId: string | null) => {
    setSaveError(null);
    if (kind === "person") {
      const p = team.find(x => x.id === id); if (!p) return;
      const upd = { ...p, podId }; const prev = team;
      setTeam(t => t.map(x => x.id === id ? upd : x));
      try { await upsertTeamMember(upd); } catch (e: any) { setSaveError(`Save failed: ${e?.message}`); setTeam(prev); }
    } else {
      const a = accounts.find(x => x.id === id); if (!a) return;
      const upd = { ...a, podId }; const prev = accounts;
      setAccounts(acc => acc.map(x => x.id === id ? upd : x));
      try { await upsertAccount(upd); } catch (e: any) { setSaveError(`Save failed: ${e?.message}`); setAccounts(prev); }
    }
  };

  const activeAccounts = useMemo(() => accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status)), [accounts]);

  const personPods = useMemo(() => team.filter(p => p.sl !== "leadership").map(p => {
    const led = activeAccounts.filter(a => a.leadId === p.id);
    const sup = activeAccounts.filter(a => a.supportIds.includes(p.id));
    const pmd = activeAccounts.filter(a => a.pmId === p.id);
    const dev = activeAccounts.filter(a => a.devId === p.id);
    const exp = personExposure(p.id, accounts);
    const c = cost(p);
    return { ...p, ledAccounts: led, supAccounts: sup, pmAccounts: pmd, devAccounts: dev, leadRev: exp.asLead, supRev: exp.asSupport, rev: exp.total, cost: c, ratio: c > 0 ? exp.total / c : 0 };
  }), [team, accounts, activeAccounts]);

  const unassigned = useMemo(() => accounts.filter(a => !a.leadId && ["Active", "Launch", "Growth"].includes(a.status)), [accounts]);

  if (loading) return (
    <div className="font-sans bg-white text-gray-900 h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="font-sans bg-white text-gray-900 h-screen flex flex-col">

      {/* Save error banner */}
      {saveError && (
        <div className="bg-red-500 text-white text-xs px-6 py-2 flex items-center justify-between shrink-0">
          <span>⚠️ {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-4 underline opacity-80 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Main — left nav · content · detail panel */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left navigation ── */}
        <nav className="w-52 shrink-0 border-r border-gray-200 bg-gray-50/60 flex flex-col">
          <div className="px-5 pt-5 pb-4">
            <span className="text-base font-semibold text-gray-900 tracking-tight">Interlude</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3">
            {navGroups.map(g => (
              <div key={g.label} className="mb-4">
                <div className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">{g.label}</div>
                {g.items.map(v => (
                  <button key={v.id} onClick={() => { setView(v.id); setSelected(null); }}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 mb-0.5 text-[13px] font-medium transition-colors ${view === v.id ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent"}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Studio totals */}
          <div className="border-t border-gray-200 px-5 py-3.5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] text-gray-400">Revenue</span>
              <span className="text-[12px] font-semibold text-emerald-600">{fmtK(totals.rev)}</span>
            </div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] text-gray-400">Cost</span>
              <span className="text-[12px] font-semibold text-red-500">{fmtK(totals.cost)}</span>
            </div>
            <div className="flex items-baseline justify-between pt-1 border-t border-gray-200">
              <span className="text-[10px] text-gray-400">Margin</span>
              <span className={`text-[12px] font-semibold ${totals.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtK(totals.margin)} <span className="font-normal text-gray-400">({pct(totals.pct)})</span></span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-3 pb-4 pt-3 flex flex-col gap-1.5">
            <button onClick={() => setModal({ type: "account", data: { name: "", sl: "", sls: [], leadId: null, pmId: null, devId: null, supportIds: [], status: "Active", type: "Retainer", retainer: 0, project: 0, weight: 3, depositPaid: false, notes: "" } })}
              className="bg-gray-900 rounded-lg px-3 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ Account</button>
            <button onClick={() => setModal({ type: "person", data: { name: "", role: "", sl: "", type: "Full-Time", cadY: null, usdM: null, hrs: 160, lead: false } })}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors">+ Person</button>
          </div>
        </nav>

        <div className="flex-1 overflow-auto">

          {/* ══════════ WORKLOAD VIEW ══════════ */}
          {/* ══════════ DASHBOARD (default home) ══════════ */}
          {view === "dashboard" && (() => {
            // Compose the home view entirely from memos other tabs already compute.
            const nowMonth = new Date().toISOString().slice(0, 7);
            const collectedThisMonth = mercury?.paidByMonth?.[nowMonth]?.total || 0;

            // Same capacity math as the Workload cards
            const loads = personPods.filter(p => p.sl !== "leadership").map(p => {
              const lead = p.ledAccounts.reduce((s, a) => s + ((a.supportIds.length > 0 ? (a.weight ?? 3) * 0.7 : (a.weight ?? 3))), 0);
              const sup = p.supAccounts.reduce((s, a) => s + (a.supportIds.length > 0 ? ((a.weight ?? 3) * 0.3) / a.supportIds.length : 0), 0);
              const dev = p.devAccounts.reduce((s, a) => s + (a.weight ?? 3) * 0.3, 0);
              const pm = p.pmAccounts.reduce((s, a) => s + (a.weight ?? 3) * PM_LOAD_PER_WEIGHT, 0);
              return { p, pts: Math.round((lead + sup + dev + pm) * 10) / 10 };
            });
            const hot = loads.filter(l => l.pts >= 4).sort((a, b) => b.pts - a.pts);

            // Overdue accounts, worst first (same source as the Invoices Overdue tab)
            const overdueAccts = Object.values(mercury?.byAccount || {})
              .filter((r: any) => r.overdue > 0)
              .sort((a: any, b: any) => b.overdue - a.overdue);

            const liveProjects = accounts.filter(a => (a.type === "Project" || a.type === "Hybrid") && !a.isInternal && ["Active", "Launch", "Growth"].includes(a.status));
            const projEcons = liveProjects.map(a => ({ a, e: projectEcon(a, team, accounts, costs) }));
            const losing = projEcons.filter(x => x.e.profit != null && x.e.profit < 0);
            const endingSoon = liveProjects.filter(a => {
              if (!a.endDate) return false;
              const d = (new Date(a.endDate).getTime() - Date.now()) / 86400000;
              return d >= -7 && d <= 30;
            }).sort((a, b) => (a.endDate || "").localeCompare(b.endDate || ""));

            const unassignedCosts = costs.filter((c: any) => !c.accountId);
            const unassignedTotal = unassignedCosts.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

            const go = (v: string, fn?: () => void) => () => { setView(v); fn?.(); };
            const Tile = ({ label, value, sub, tone = "text-gray-900", onClick }: any) => (
              <div onClick={onClick} className={`bg-white border border-gray-200 rounded-xl px-5 py-4 flex-1 min-w-[150px] ${onClick ? "cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all" : ""}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
                <div className={`text-xl font-semibold mt-1 ${tone}`}>{value}</div>
                {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
              </div>
            );
            const Section = ({ title, action, onAction, children }: any) => (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-gray-100">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</div>
                  {action && <button onClick={onAction} className="text-[10px] font-semibold text-gray-400 hover:text-gray-700">{action} →</button>}
                </div>
                {children}
              </div>
            );
            const Row = ({ left, right, tone = "text-gray-900", onClick }: any) => (
              <div onClick={onClick} className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}>
                <span className="text-[12px] font-medium text-gray-900 truncate pr-3">{left}</span>
                <span className={`text-[12px] font-semibold shrink-0 ${tone}`}>{right}</span>
              </div>
            );
            const Empty = ({ children }: any) => <div className="px-4 py-4 text-[11px] text-gray-300 italic">{children}</div>;

            return (
              <div className="p-8 pb-12">
                <div className="mb-7">
                  <div className="text-2xl font-semibold text-gray-900 mb-1">Interlude Studio</div>
                  <div className="text-xs text-gray-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}{mercury?.stale ? " · Mercury data is from the last sync" : ""}</div>
                </div>

                {/* Headline numbers */}
                <div className="flex gap-3 flex-wrap mb-3">
                  <Tile label="Monthly Revenue" value={fmtK(totals.rev)} sub={`${totals.active} active accounts`} tone="text-emerald-600" onClick={go("pnl")} />
                  <Tile label="Monthly Cost" value={fmtK(totals.cost)} sub={`team ${fmtK(totals.people)} + external ${fmtK(totals.vendor)}`} tone="text-red-500" onClick={go("pnl")} />
                  <Tile label="Margin" value={`${fmtK(totals.margin)}`} sub={`${Math.round(totals.pct * 100)}% of revenue`} tone={totals.margin >= 0 ? "text-gray-900" : "text-red-500"} onClick={go("pnl")} />
                  <Tile label="Collected This Month" value={mercuryReady ? fmtK(collectedThisMonth) : "—"} sub={mercuryReady ? `via Mercury` : "Mercury not connected"} onClick={go("invoices")} />
                  <Tile label="Overdue" value={collections ? fmtK(collections.overdue) : "—"}
                    sub={collections ? `${collections.overdueCount} client${collections.overdueCount === 1 ? "" : "s"} · ${fmtK(collections.outstanding)} outstanding` : "Mercury not connected"}
                    tone={collections?.overdue > 0 ? "text-red-500" : "text-gray-900"}
                    onClick={go("invoices", () => setInvoiceTab("overdue"))} />
                </div>

                <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                  {/* Needs attention */}
                  <Section title="Collections — worst first" action="Invoices" onAction={go("invoices", () => setInvoiceTab("overdue"))}>
                    {overdueAccts.length === 0 && <Empty>{mercuryReady ? "Nothing overdue. Lovely." : "Mercury not connected."}</Empty>}
                    {overdueAccts.slice(0, 6).map((r: any) => (
                      <Row key={r.name} left={r.name} tone="text-red-500"
                        right={`${fmtK(r.overdue)}${r.oldestDue ? ` · ${Math.max(0, Math.round((Date.now() - new Date(r.oldestDue).getTime()) / 86400000))}d` : ""}`}
                        onClick={go("invoices", () => setInvoiceTab("overdue"))} />
                    ))}
                  </Section>

                  <Section title="Team capacity" action="Workload" onAction={go("workload")}>
                    {hot.length === 0 && <Empty>No one is near capacity.</Empty>}
                    {hot.slice(0, 6).map(({ p, pts }) => (
                      <Row key={p.id} left={p.name} tone={pts >= 5 ? "text-red-500" : "text-amber-500"}
                        right={`${pts} / 5 pts${pts >= 5 ? " · at capacity" : ""}`}
                        onClick={go("workload", () => setWorkloadTab("all"))} />
                    ))}
                  </Section>

                  <Section title="To do" >
                    {unassignedCosts.length === 0 && losing.length === 0 && endingSoon.length === 0 && retainersToPlace.length === 0 && <Empty>All clear.</Empty>}
                    {unassignedCosts.length > 0 && (
                      <Row left={`Assign ${unassignedCosts.length} external cost${unassignedCosts.length === 1 ? "" : "s"} to accounts`} right={fmtK(unassignedTotal)} tone="text-amber-600" onClick={go("costs")} />
                    )}
                    {losing.map(({ a, e }) => (
                      <Row key={a.id} left={`${a.name} is over budget`} right={fmtK(e.profit)} tone="text-red-500" onClick={go("projects")} />
                    ))}
                    {endingSoon.map(a => (
                      <Row key={a.id} left={`${a.name} wraps ${new Date(a.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} right={fmtK(a.project)} onClick={go("projects")} />
                    ))}
                    {retainersToPlace.length > 0 && (
                      <Row left={`Place ${retainersToPlace.length} retainer${retainersToPlace.length === 1 ? "" : "s"} into a pod`} right="" onClick={go("pods")} />
                    )}
                  </Section>

                  {/* Snapshots */}
                  <Section title="Service line P&L" action="P&L" onAction={go("pnl")}>
                    {slPods.map(sl => (
                      <Row key={sl.id} left={sl.name} tone={sl.margin >= 0 ? "text-emerald-600" : "text-red-500"}
                        right={`${fmtK(sl.rev)} rev · ${fmtK(sl.margin)}`} onClick={go("pnl")} />
                    ))}
                  </Section>

                  <Section title="Projects in flight" action="Projects" onAction={go("projects")}>
                    {projEcons.length === 0 && <Empty>No active flat-rate projects.</Empty>}
                    {projEcons.sort((x, y) => y.a.project - x.a.project).slice(0, 6).map(({ a, e }) => (
                      <Row key={a.id} left={a.name}
                        right={`${fmtK(a.project)}${e.elapsed != null ? ` · ${Math.round(e.elapsed * 100)}%` : ""}`}
                        onClick={go("projects")} />
                    ))}
                  </Section>

                  <Section title="External spend" action="Costs" onAction={go("costs")}>
                    <Row left="Run rate (3-mo avg)" right={`${fmtK(costStats.trailingAvg)}/mo`} tone="text-red-500" onClick={go("costs")} />
                    {Object.entries(costs.reduce((m: any, c: any) => { if (c.accountId) { const a = accounts.find(x => x.id === c.accountId); if (a) m[a.name] = (m[a.name] || 0) + Number(c.amount || 0); } return m; }, {}))
                      .sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)
                      .map(([name, v]: any) => <Row key={name} left={name} right={fmtK(v)} onClick={go("costs")} />)}
                  </Section>
                </div>
              </div>
            );
          })()}

          {view === "workload" && (
            <div className="p-8 pb-12">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">Workload</div>
                  <div className="text-xs text-gray-400">Each card is one person — their assigned accounts and the revenue they drive.</div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {([
                    { id: "leads",    label: "Pod Leads",  count: personPods.filter(p => p.lead && p.sl !== "leadership" && p.sl !== "symphony" && p.sl !== "product").length },
                    { id: "symphony", label: "Symphony",   count: personPods.filter(p => p.sl === "symphony").length },
                    { id: "product",  label: "Product",    count: personPods.filter(p => p.sl === "product").length },
                    { id: "pm",       label: "Project Mgmt", count: personPods.filter(p => p.sl === "ops").length },
                    { id: "all",      label: "Everyone",   count: personPods.filter(p => p.sl !== "leadership").length },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setWorkloadTab(t.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${workloadTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      {t.label}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${workloadTab === t.id ? "bg-gray-100 text-gray-600" : "text-gray-400"}`}>{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {personPods.filter(p => {
                  if (p.sl === "leadership") return false;
                  if (workloadTab === "leads") return p.lead && p.sl !== "symphony" && p.sl !== "product" && p.sl !== "ops";
                  if (workloadTab === "symphony") return p.sl === "symphony";
                  if (workloadTab === "product") return p.sl === "product";
                  if (workloadTab === "pm") return p.sl === "ops";
                  return true;
                }).map(p => {
                  // Weight-based capacity: each account has a weight (1–5 pts)
                  // Lead gets 70% of weight (100% if no support), each support gets equal share of remaining 30%
                  const maxCapacity = 5;
                  const leadLoad = p.ledAccounts.reduce((sum, a) => {
                    const w = a.weight ?? 3;
                    return sum + (a.supportIds.length > 0 ? w * 0.7 : w);
                  }, 0);
                  const supLoad = p.supAccounts.reduce((sum, a) => {
                    const w = a.weight ?? 3;
                    const numSup = a.supportIds.length;
                    return sum + (numSup > 0 ? (w * 0.3) / numSup : 0);
                  }, 0);
                  // Dev work counts like support: weight × 0.3 per account
                  const devLoad = p.devAccounts.reduce((sum, a) => sum + (a.weight ?? 3) * 0.3, 0);
                  // PM oversight: weight × 0.1 per managed account
                  const pmLoad = p.pmAccounts.reduce((sum, a) => sum + (a.weight ?? 3) * PM_LOAD_PER_WEIGHT, 0);
                  const totalLoad = Math.round((leadLoad + supLoad + devLoad + pmLoad) * 10) / 10;
                  const leadCount = p.ledAccounts.length;
                  const supCount = p.supAccounts.length + p.devAccounts.length;
                  const pmCount = p.pmAccounts.length;
                  const totalClients = leadCount + supCount + pmCount;
                  const loadPct = Math.min(100, Math.round((totalLoad / maxCapacity) * 100));
                  const loadColor = totalLoad >= 5 ? "bg-red-400" : totalLoad >= 4 ? "bg-amber-400" : "bg-emerald-400";
                  const loadLabel = totalLoad >= 5 ? "At capacity" : totalLoad >= 4 ? "Near capacity" : totalClients === 0 ? "Available" : "Manageable";
                  const loadLabelColor = totalLoad >= 5 ? "text-red-500" : totalLoad >= 4 ? "text-amber-500" : totalClients === 0 ? "text-gray-400" : "text-emerald-600";
                  return (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="h-0.5 bg-gray-200" />
                    <div className="px-4 pt-4 pb-3">
                      {/* Person header */}
                      <div className="flex items-center gap-2.5 mb-3 cursor-pointer" onClick={() => setSelected({ type: "person", data: p })}>
                        <Av name={p.name} size={36} sl={p.sl} lead={p.lead} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{p.role}</div>
                        </div>
                        <SlTag sl={p.sl} small />
                      </div>

                      {/* Capacity bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{totalLoad} <span className="text-gray-300">/</span> 5 pts</span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">{leadCount} lead · {supCount} sup{pmCount > 0 ? ` · ${pmCount} pm` : ""}</span>
                          </div>
                          <span className={`text-[10px] font-semibold ${loadLabelColor}`}>{loadLabel}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${loadColor}`} style={{ width: `${loadPct}%` }} />
                        </div>
                      </div>

                      {/* Accounts list */}
                      <div className="border-t border-gray-100 pt-2.5">
                        {p.ledAccounts.length === 0 && p.supAccounts.length === 0 && p.pmAccounts.length === 0 && p.devAccounts.length === 0 ? (
                          <div className="text-[11px] text-gray-300 italic text-center py-2">No accounts assigned</div>
                        ) : (<>
                          {p.ledAccounts.map(a => {
                            const w = a.weight ?? 3;
                            const myLoad = a.supportIds.length > 0 ? w * 0.7 : w;
                            return (
                            <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-1 bg-gray-50 cursor-pointer border border-gray-100 hover:bg-gray-100 transition-colors">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.status === "Growth" ? "bg-emerald-500" : "bg-blue-400"}`} />
                              <span className="text-xs font-medium text-gray-900 flex-1 truncate">{a.name}</span>
                              <span className="text-[9px] text-gray-400 font-medium">{Math.round(myLoad * 10) / 10}pt</span>
                              <Tag small variant="green">Lead</Tag>
                            </div>
                          )})}
                          {p.supAccounts.map(a => {
                            const w = a.weight ?? 3;
                            const numSup = a.supportIds.length;
                            const myLoad = numSup > 0 ? (w * 0.3) / numSup : 0;
                            return (
                            <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                              <span className="text-xs text-gray-500 flex-1 truncate">{a.name}</span>
                              <span className="text-[9px] text-gray-400 font-medium">{Math.round(myLoad * 10) / 10}pt</span>
                              <Tag small>Support</Tag>
                            </div>
                          )})}
                          {/* Dev'd accounts — support-style capacity */}
                          {p.devAccounts.map(a => (
                            <div key={"dev" + a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0" />
                              <span className="text-xs text-gray-500 flex-1 truncate">{a.name}</span>
                              <span className="text-[9px] text-gray-400 font-medium">{Math.round((a.weight ?? 3) * 0.3 * 10) / 10}pt</span>
                              <Tag small variant="dark">Dev</Tag>
                            </div>
                          ))}
                          {/* PM'd accounts — lighter oversight load (weight × 0.1) */}
                          {p.pmAccounts.map(a => (
                            <div key={"pm" + a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                              <span className="text-xs text-gray-500 flex-1 truncate">{a.name}</span>
                              <span className="text-[9px] text-gray-400 font-medium">{Math.round((a.weight ?? 3) * PM_LOAD_PER_WEIGHT * 10) / 10}pt</span>
                              <Tag small variant="amber">PM</Tag>
                            </div>
                          ))}

                        </>)}
                      </div>

                      {/* Quick-assign panel */}
                      {quickAssign?.personId === p.id ? (
                        <div className="border-t border-gray-100 pt-2.5 mt-1" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5 mb-2">
                            {((p.lead ? ["lead", "support"] : ["support"]) as const).map(r => (
                              <button key={r} onClick={() => setQuickAssign({ ...quickAssign, role: r })}
                                className={`flex-1 text-[10px] font-semibold py-1 rounded-md capitalize transition-colors ${quickAssign.role === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                          <select value={quickAssign.acctId} onChange={e => setQuickAssign({ ...quickAssign, acctId: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none mb-2">
                            <option value="">Pick an account…</option>
                            {accounts.filter(a =>
                              !["Closed"].includes(a.status) &&
                              a.leadId !== p.id &&
                              !a.supportIds.includes(p.id)
                            ).map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <button onClick={() => { if (quickAssign.acctId) assignAccount(p.id, quickAssign.acctId, quickAssign.role); }}
                              disabled={!quickAssign.acctId}
                              className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${quickAssign.acctId ? "bg-gray-900 text-white hover:bg-gray-700" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
                              Assign
                            </button>
                            <button onClick={() => setQuickAssign(null)}
                              className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setQuickAssign({ personId: p.id, role: p.lead ? "lead" : "support", acctId: "" })}
                          className="mt-2 w-full text-[10px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg py-1.5 transition-colors border border-dashed border-gray-200 hover:border-gray-300">
                          + Assign account
                        </button>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>

              {/* Unassigned accounts */}
              {unassigned.length > 0 && (
                <div className="mt-9">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-base font-semibold text-gray-900">Unassigned Accounts</span>
                    <span className="text-[11px] text-gray-400">— no lead assigned</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                    {unassigned.map((a, i) => (
                      <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-red-100 transition-colors ${i < unassigned.length - 1 ? "border-b border-red-100" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[13px] font-semibold text-gray-900">{a.name}</span>
                          <SlTags a={a} small />
                          <StatusTag status={a.status} small />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-emerald-600">{fmt(a.retainer + a.project)}<span className="text-[10px] font-normal text-gray-400">/mo</span></span>
                          <button onClick={e => { e.stopPropagation(); setModal({ type: "account", data: a }); }} className="bg-gray-900 text-white rounded-md px-2.5 py-1 text-[10px] font-semibold hover:bg-gray-800 transition-colors">Assign</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-red-500 mt-2 font-medium">{unassigned.length} account{unassigned.length !== 1 ? "s" : ""} totaling {fmt(unassigned.reduce((s, a) => s + a.retainer + a.project, 0))}/mo without a lead</div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ ORG CHART VIEW ══════════ */}
          {view === "org" && (() => {
            const assignedIds = new Set(depts.flatMap(d => d.memberIds));
            const unassignedPeople = team.filter(p => !assignedIds.has(p.id) && p.sl !== "leadership" && p.sl !== "ops");
            return (
            <div className="p-9">
              {/* Leadership */}
              <div className="text-center mb-2">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3.5">Leadership</div>
                <div className="flex justify-center gap-4">
                  {team.filter(p => p.sl === "leadership").map(p => (
                    <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer min-w-[220px] hover:shadow-sm transition-shadow">
                      <Av name={p.name} size={44} sl={p.sl} lead />
                      <div>
                        <div className="text-[15px] font-medium text-gray-900">{p.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-px h-6 bg-gray-200 mx-auto" />

              {/* Operations */}
              <div className="text-center mb-2">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3.5">Operations</div>
                <div className="flex justify-center gap-4">
                  {team.filter(p => p.sl === "ops").map(p => (
                    <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer min-w-[220px] hover:shadow-sm transition-shadow">
                      <Av name={p.name} size={40} sl={p.sl} lead={p.lead} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-px h-6 bg-gray-200 mx-auto" />

              {/* Departments grid — equal width */}
              <div className="grid grid-cols-3 gap-4 mt-2">
                {depts.map(dept => {
                  const members = dept.memberIds.map(id => team.find(p => p.id === id)).filter(Boolean);
                  const deptAcctRev = members.reduce((s, p) => s + personExposure(p.id, accounts).total, 0);
                  return (
                    <div key={dept.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                      <div className="h-0.5 bg-gray-300" />
                      <div className="px-4 py-4">
                        <div className="flex justify-between items-center mb-3.5">
                          <span className={`font-semibold rounded-full tracking-wide text-[10px] px-2.5 py-1 ${dept.color}`}>{dept.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{members.length} {members.length === 1 ? "person" : "people"}</span>
                            <button onClick={() => setModal({ type: "dept", data: dept })} className="text-gray-300 hover:text-gray-500 text-sm transition-colors">&#9998;</button>
                          </div>
                        </div>
                        {members.map(p => (
                          <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <Av name={p.name} size={28} sl={p.sl} lead={p.lead} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900">{p.name}</div>
                              <div className="text-[9px] text-gray-400 truncate">{p.role}</div>
                            </div>
                            {p.lead && <Tag small variant="dark">Lead</Tag>}
                          </div>
                        ))}
                        {members.length === 0 && <div className="text-[11px] text-gray-300 italic text-center py-3">No members yet</div>}
                        <div className="border-t border-gray-100 mt-2.5 pt-2 flex justify-between text-[11px]">
                          <span className="text-gray-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                          <span className="font-semibold text-emerald-600">{fmtK(Math.round(deptAcctRev))}/mo</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add new department card */}
                <div onClick={() => {
                  const nextColor = DEPT_COLORS[depts.length % DEPT_COLORS.length];
                  setModal({ type: "dept", data: { id: null, name: "", memberIds: [], color: nextColor } });
                }} className="border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors min-h-[120px]">
                  <div className="text-center">
                    <div className="text-2xl text-gray-300 mb-1">+</div>
                    <div className="text-xs text-gray-400 font-medium">Add Department</div>
                  </div>
                </div>
              </div>

              {/* Unassigned people */}
              {unassignedPeople.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-medium text-gray-900">Unassigned People</span>
                    <span className="text-[11px] text-gray-400">— not in any department</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {unassignedPeople.map(p => (
                        <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:shadow-sm transition-shadow">
                          <Av name={p.name} size={24} sl={p.sl} lead={p.lead} />
                          <div>
                            <div className="text-xs font-medium text-gray-900">{p.name}</div>
                            <div className="text-[9px] text-gray-400">{p.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* ══════════ TEAM ROSTER VIEW ══════════ */}
          {view === "team" && (
            <div className="overflow-auto">
              {SERVICE_LINES.filter(sl => team.some(p => p.sl === sl.id)).map(sl => {
                const members = team.filter(p => p.sl === sl.id);
                const slCost = members.reduce((s, p) => s + cost(p), 0);
                return (
                  <div key={sl.id}>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-gray-100 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <SlTag sl={sl.id} small />
                        <span className="text-[10px] text-gray-400 ml-1">{members.length} {members.length === 1 ? "person" : "people"}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500">{fmt(Math.round(slCost))}<span className="font-normal text-gray-400">/mo</span></span>
                    </div>
                    <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 0.8fr" }}>
                      {["Name & Role", "Type", "Monthly USD", "Annual USD", "$/hr"].map(h => (
                        <div key={h} className="px-3 py-1.5 bg-gray-50 text-[8px] font-semibold tracking-wider uppercase text-gray-400 border-b border-gray-200 sticky top-0 z-10">{h}</div>
                      ))}
                    </div>
                    {members.map((p, i) => {
                      const c = cost(p);
                      return (
                        <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className={`grid cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors`} style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 0.8fr" }}>
                          <div className="px-3 py-2 flex items-center gap-2">
                            <Av name={p.name} size={28} sl={p.sl} lead={p.lead} />
                            <div className="min-w-0">
                              <div className="font-semibold text-xs flex items-center gap-1.5">
                                {p.name}
                                {p.lead && <Tag small variant="dark">Lead</Tag>}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{p.role}</div>
                            </div>
                          </div>
                          <div className="px-3 py-2 flex items-center">
                            <Tag small variant={p.type === "Full-Time" ? "default" : p.type === "Partner" ? "dark" : "default"}>{p.type}</Tag>
                          </div>
                          <div className="px-3 py-2 text-right text-[13px] font-semibold text-gray-900 flex items-center justify-end">{fmt(Math.round(c))}</div>
                          <div className="px-3 py-2 text-right text-xs text-gray-500 flex items-center justify-end">{fmt(Math.round(c * 12))}</div>
                          <div className="px-3 py-2 text-right text-[11px] text-gray-400 flex items-center justify-end">{p.hrs > 0 ? fmt(Math.round(c / p.hrs)) : "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="grid bg-gray-900" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 0.8fr" }}>
                <div className="px-5 py-3 text-[11px] font-bold text-white flex items-center gap-1.5">
                  Studio Total <span className="font-normal text-gray-400">{team.length} people</span>
                </div>
                <div className="px-3 py-3" />
                <div className="px-3 py-3 text-right font-bold text-white text-[13px]">{fmt(Math.round(team.reduce((s, p) => s + cost(p), 0)))}</div>
                <div className="px-3 py-3 text-right font-bold text-white text-xs">{fmt(Math.round(team.reduce((s, p) => s + cost(p) * 12, 0)))}</div>
                <div className="px-3 py-3" />
              </div>
            </div>
          )}

          {/* ══════════ ACCOUNTS VIEW ══════════ */}
          {view === "accounts" && (() => {
            const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "";

            // Tab filtering
            const tabFiltered = accounts.filter(a => {
              if (a.isInternal) return false; // internal work, not a client
              if (acctTab === "retainer") return a.type === "Retainer" && ["Active", "Launch", "Growth"].includes(a.status);
              // Same active-status rule as Retainers, so Paused/Pipeline projects
              // live only in Closed/Pipeline instead of appearing in both tabs
              if (acctTab === "projects") return (a.type === "Project" || a.type === "Hybrid") && ["Active", "Launch", "Growth"].includes(a.status);
              if (acctTab === "closed") return a.status === "Closed" || a.status === "Paused" || a.status === "Pipeline";
              return true;
            });

            // Counts mirror each tab's filter exactly
            const isActive = (a: any) => ["Active", "Launch", "Growth"].includes(a.status);
            const retainerCount = accounts.filter(a => !a.isInternal && a.type === "Retainer" && isActive(a)).length;
            const projectCount = accounts.filter(a => !a.isInternal && (a.type === "Project" || a.type === "Hybrid") && isActive(a)).length;
            const closedCount = accounts.filter(a => !a.isInternal && ["Closed", "Paused", "Pipeline"].includes(a.status)).length;

            // Shared header with tabs + view toggle
            const Header = () => (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    {([
                      { id: "retainer", label: "Retainers", count: retainerCount, dot: "bg-emerald-400" },
                      { id: "projects", label: "Flat Rate", count: projectCount, dot: "bg-violet-400" },
                      { id: "closed",   label: "Closed / Pipeline", count: closedCount, dot: "bg-gray-400" },
                    ] as const).map(t => (
                      <button key={t.id} onClick={() => setAcctTab(t.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${acctTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                        {t.label}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${acctTab === t.id ? "bg-gray-100 text-gray-600" : "text-gray-400"}`}>{t.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setAcctView("pods")} className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors ${acctView === "pods" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Pods</button>
                    <button onClick={() => setAcctView("list")} className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors ${acctView === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>List</button>
                  </div>
                </div>
                {/* Collections snapshot from Mercury */}
                {collections && (collections.outstanding > 0) && (
                  <div className="flex items-center gap-4 mb-6 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[12px]">
                    <span className="font-semibold text-gray-700">Collections</span>
                    {collections.overdue > 0 && (
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-red-500 font-semibold">{fmt(Math.round(collections.overdue))} overdue</span><span className="text-gray-400">· {collections.overdueCount} client{collections.overdueCount !== 1 ? "s" : ""}</span></span>
                    )}
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-gray-500">{fmt(Math.round(collections.outstanding))} outstanding total</span></span>
                    <span className="text-[10px] text-gray-400 ml-auto">via Mercury</span>
                  </div>
                )}
              </>
            );

            if (acctView === "pods") return (
              <div className="p-8 pb-12">
                <Header />
                {tabFiltered.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No accounts in this category.</div>
                )}
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {tabFiltered.map(a => {
                    const lead = team.find(p => p.id === a.leadId);
                    const sups = team.filter(p => a.supportIds.includes(p.id));
                    const mrr = acctVal(a);
                    const live = isProjectLive(a);
                    const hasDates = a.startDate && a.endDate;
                    const isClosed = a.status === "Closed" || a.status === "Paused";
                    const isProject = a.type === "Project" || a.type === "Hybrid";

                    // Card border + accent colours by tab
                    const cardBorder = isClosed ? "border-gray-200 opacity-60" : isProject && !live ? "border-gray-200 opacity-70" : isProject ? "border-violet-200" : "border-gray-200";
                    const topBar = isClosed ? "bg-gray-300" : isProject && !live ? "bg-gray-300" : isProject ? "bg-violet-400" : SL[acctSls(a)[0]]?.color.split(" ")[0] || "bg-gray-200";

                    return (
                      <div key={a.id} onClick={() => setSelected({ type: "account", data: a })}
                        className={`bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer ${cardBorder}`}>
                        <div className={`h-1 ${topBar}`} />
                        <div className="px-4 pt-4 pb-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                {a.name}
                                {isProject && !hasDates && (
                                  <span title="Missing dates" className="text-amber-500 text-[10px]">⚠</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <SlTags a={a} small />
                                <StatusTag status={a.status} small />
                                {isProject && (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full">{a.type}</span>
                                )}
                                {(() => { const pay = payFor(a); return pay ? <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${pay.status === "overdue" ? "bg-red-50 text-red-500" : pay.status === "due" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><span className={`w-1.5 h-1.5 rounded-full ${PAY_STYLE[pay.status].dot}`} />{payLabel(pay)}</span> : null; })()}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-base font-semibold ${isClosed || (isProject && !live) ? "text-gray-400" : "text-emerald-600"}`}>{fmtK(isProject ? a.project : mrr)}</div>
                              {!isProject && <div className="text-[9px] text-gray-400">/mo</div>}
                            </div>
                          </div>

                          {/* Project date bar */}
                          {isProject && hasDates && (
                            <div className={`flex items-center justify-between mb-3 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${live ? "bg-violet-50 text-violet-600" : "bg-gray-50 text-gray-400"}`}>
                              <span>{fmtDate(a.startDate!)} → {fmtDate(a.endDate!)}</span>
                              {live ? <span className="text-[9px] font-semibold text-violet-400">Active</span> : <span className="text-[9px]">Ended</span>}
                            </div>
                          )}

                          <div className="h-px bg-gray-100 mb-3" />

                          {/* Team */}
                          <div className="flex flex-col gap-2">
                            {lead && (
                              <div className="flex items-center gap-2.5">
                                <Av name={lead.name} size={28} sl={lead.sl} lead={lead.lead} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-900 truncate">{lead.name}</div>
                                  <div className="text-[9px] text-gray-400 truncate">{lead.role}</div>
                                </div>
                                <Tag small variant="green">Lead</Tag>
                              </div>
                            )}
                            {sups.map(p => (
                              <div key={p.id} className="flex items-center gap-2.5">
                                <Av name={p.name} size={24} sl={p.sl} lead={false} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-700 truncate">{p.name}</div>
                                </div>
                                <Tag small>Support</Tag>
                              </div>
                            ))}
                            {!lead && sups.length === 0 && (
                              <div className="text-[11px] text-gray-300 italic">No team assigned</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );

            // LIST VIEW
            return (
            <div className="overflow-auto">
              <div className="px-8 pt-8 pb-4"><Header /></div>
            <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr 1.5fr 1.2fr 0.8fr 1fr 1.4fr 1fr 2fr" }}>
              {["Account", "Service Line", "Lead", "Support", "Status", "Retainer", "Flat Fee", "MRR", "Scope"].map(h => (
                <div key={h} className="px-3 py-2 bg-gray-100 text-[9px] font-semibold tracking-wider uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10">{h}</div>
              ))}
              {tabFiltered.map((a, i) => {
                const bg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                const mpr = monthlyProjectRev(a);
                const live = isProjectLive(a);
                return (
                  <div key={a.id} className="contents cursor-pointer" onClick={() => setSelected({ type: "account", data: a })}>
                    <div className={`px-3 py-2 text-xs font-semibold border-b border-gray-100 flex items-center gap-1.5 ${bg}`}>
                      {a.name}
                      {(a.type === "Project" || a.type === "Hybrid") && (!a.startDate || !a.endDate) && (
                        <span title="Missing start/end dates — revenue not tracked in MRR" className="text-amber-500 text-[10px]">⚠</span>
                      )}
                    </div>
                    <div className={`px-3 py-2 border-b border-gray-100 ${bg}`}><SlTags a={a} small /></div>
                    <div className={`px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 ${bg}`}>
                      {a.leadId && <Av name={getName(a.leadId)} size={24} sl={a.sl} lead />}
                      <span className="text-xs">{getName(a.leadId)}</span>
                    </div>
                    <div className={`px-3 py-2 border-b border-gray-100 text-[11px] text-gray-500 ${bg}`}>{a.supportIds.map(getName).join(", ") || "—"}</div>
                    <div className={`px-3 py-2 border-b border-gray-100 ${bg}`}><StatusTag status={a.status} small /></div>
                    <div className={`px-3 py-2 border-b border-gray-100 text-right text-xs ${a.retainer > 0 ? "text-gray-900" : "text-gray-300"} ${bg}`}>{a.retainer > 0 ? fmt(a.retainer) : "—"}</div>
                    {/* Flat fee: show total + date range */}
                    <div className={`px-3 py-2 border-b border-gray-100 text-right ${bg}`}>
                      {a.project > 0 ? (
                        <>
                          <div className={`text-xs font-medium ${live ? "text-gray-900" : "text-gray-400"}`}>{fmt(a.project)}</div>
                          {a.startDate && a.endDate && (
                            <div className={`text-[9px] mt-0.5 ${live ? "text-violet-500" : "text-gray-400"}`}>
                              {fmtDate(a.startDate)} – {fmtDate(a.endDate)}{!live ? " · ended" : ""}
                            </div>
                          )}
                        </>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    {/* MRR: retainer + amortized project */}
                    <div className={`px-3 py-2 border-b border-gray-100 text-right ${bg}`}>
                      <div className="text-sm font-semibold text-emerald-600">{fmt(acctVal(a))}</div>
                      {mpr > 0 && a.startDate && <div className="text-[9px] text-violet-500">{fmt(mpr)}/mo proj</div>}
                    </div>
                    <div className={`px-3 py-2 border-b border-gray-100 text-[11px] text-gray-400 truncate ${bg}`}>{a.notes || "—"}</div>
                  </div>
                );
              })}
              {/* Totals */}
              <div className="px-3 py-2 bg-gray-100 text-[11px] font-bold text-gray-900 border-b border-gray-200" style={{ gridColumn: "1 / 6" }}>Total ({tabFiltered.length} shown)</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(tabFiltered.reduce((s, a) => s + a.retainer, 0))}</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(tabFiltered.reduce((s, a) => s + a.project, 0))}</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(tabFiltered.reduce((s, a) => s + acctVal(a), 0))}</div>
              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200" />
            </div>
            </div>
            );
          })()}

          {/* ══════════ FLAT-RATE PROJECTS VIEW ══════════ */}
          {view === "projects" && (() => {
            const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "";
            const flat = accounts.filter(a => (a.type === "Project" || a.type === "Hybrid") && !a.isInternal);
            const inFlight = flat.filter(a => ["Active", "Launch", "Growth"].includes(a.status));
            const completed = flat.filter(a => a.status === "Closed" || a.status === "Paused");
            const planning = flat.filter(a => a.status === "Pipeline");

            const econOf = (a: any) => projectEcon(a, team, accounts, costs);
            const inFlightEcon = inFlight.map(a => ({ a, e: econOf(a) }));
            const kpiFee = inFlight.reduce((s, a) => s + a.project, 0);
            const kpiMrr = inFlight.reduce((s, a) => s + monthlyProjectRev(a), 0);
            const withCost = inFlightEcon.filter(x => x.e.profit != null);
            const kpiProfit = withCost.reduce((s, x) => s + x.e.profit, 0);
            const kpiCostedFee = withCost.reduce((s, x) => s + x.a.project, 0);

            // Employee mileage across ALL flat-rate work (in-flight + completed)
            const mileage = team.map(p => {
              let rev = 0, costTotal = 0, monthly = 0, n = 0, unknownCost = false;
              flat.forEach(a => {
                const share = projFeeShare(a, p.id);
                if (share <= 0) return;
                n++;
                rev += share;
                const m = projectTeam(a, team, accounts).find(r => r.p.id === p.id && r.role !== "PM");
                if (m) {
                  monthly += m.monthlyCost;
                  const months = a.startDate && a.endDate ? monthsBetween(a.startDate, a.endDate) : null;
                  if (months != null) costTotal += m.monthlyCost * months; else unknownCost = true;
                }
              });
              return { p, n, rev, costTotal, monthly, unknownCost, multiple: costTotal > 0 ? rev / costTotal : null };
            // Keep delivery people even at zero, so coverage gaps stay visible.
            // PMs are measured in PM Coverage instead — drop them here unless
            // they actually carry a delivery role on a project.
            }).filter(m => m.n > 0 || m.p.sl !== "ops")
              .sort((x, y) => y.rev - x.rev || x.p.name.localeCompare(y.p.name));

            // Collected: completed = full fee, else 50% if the deposit invoice is in
            // Collections come from Mercury only (payFor) — the old manual
            // 50%-deposit toggle was removed so every project is tracked the
            // same way. Projects with no Mercury match show as "not linked".

            const ProjectCard = ({ a, done }: any) => {
              const e = econOf(a);
              const overdue = !done && e.elapsed === 1;
              const pay = payFor(a);
              return (
                <div onClick={() => setSelected({ type: "account", data: a })}
                  className={`bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer ${done ? "border-gray-200" : "border-violet-200"}`}>
                  <div className={`h-1 ${done ? "bg-gray-300" : "bg-violet-400"}`} />
                  <div className="px-5 pt-4 pb-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          {a.name}
                          {a.project <= 0 && <span title="No fee set — edit the account to add it" className="text-amber-500 text-[10px]">⚠ no fee</span>}
                          {!e.hasDates && <span title="No timeline set" className="text-amber-500 text-[10px]">⚠ no dates</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <SlTags a={a} small />
                          <StatusTag status={a.status} small />
                          {overdue && <Tag small variant="amber">Past end date</Tag>}
                          {pay && <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${pay.status === "overdue" ? "bg-red-50 text-red-500" : pay.status === "due" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><span className={`w-1.5 h-1.5 rounded-full ${PAY_STYLE[pay.status].dot}`} />{payLabel(pay)}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-semibold text-gray-900">{fmtK(a.project)}</div>
                        <div className="text-[9px] text-gray-400">flat fee{a.type === "Hybrid" ? ` + ${fmtK(a.retainer)}/mo ret.` : ""}</div>
                      </div>
                    </div>

                    {/* Timeline */}
                    {e.hasDates && (
                      <div className="mb-3.5">
                        <div className="flex items-center justify-between text-[10px] font-medium text-gray-400 mb-1.5">
                          <span>{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</span>
                          <span>{e.months} mo · {Math.round((e.elapsed ?? 0) * 100)}% elapsed</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${done ? "bg-gray-300" : overdue ? "bg-amber-400" : "bg-violet-400"}`}
                            style={{ width: `${(e.elapsed ?? 0) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Economics */}
                    <div className={`grid ${e.externalTotal > 0 ? "grid-cols-5" : "grid-cols-4"} gap-2 mb-3.5`}>
                      <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                        <div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Rev /mo</div>
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">{done ? "—" : fmtK(monthlyProjectRev(a))}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                        <div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Team /mo</div>
                        <div className="text-xs font-semibold text-red-500 mt-0.5">{e.members.length ? fmtK(e.teamMonthly) : "—"}</div>
                      </div>
                      {e.externalTotal > 0 && (
                        <div className="bg-amber-50 rounded-lg px-2.5 py-2" title={e.external.map((c: any) => `${(c.month || "").slice(0, 7)} ${c.vendor} ${fmt(c.amount)}`).join("\n")}>
                          <div className="text-[8px] font-semibold uppercase tracking-wider text-amber-600/70">External</div>
                          <div className="text-xs font-semibold text-amber-700 mt-0.5">{fmtK(e.externalTotal)}</div>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                        <div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Profit</div>
                        <div className={`text-xs font-semibold mt-0.5 ${e.profit == null ? "text-gray-300" : e.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{e.profit != null ? fmtK(e.profit) : "—"}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                        <div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Margin</div>
                        <div className={`text-xs font-semibold mt-0.5 ${e.marginPct == null ? "text-gray-300" : e.marginPct >= 0.3 ? "text-emerald-600" : e.marginPct >= 0 ? "text-amber-500" : "text-red-500"}`}>{e.marginPct != null ? pct(e.marginPct) : "—"}</div>
                      </div>
                    </div>

                    {/* Invoicing — real paid vs owed from Mercury when the client
                        matches (handles any deposit split); manual toggle otherwise */}
                    {!done ? (
                      pay ? (() => {
                        const pctPaid = a.project > 0 ? Math.min(1, pay.paid / a.project) : 0;
                        return (
                          <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 mb-3.5" onClick={ev => ev.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-[10px] font-medium text-gray-500">
                                Collected <span className={`font-semibold ${pay.paid > 0 ? "text-emerald-600" : "text-gray-400"}`}>{fmtK(pay.paid)}</span> of {fmtK(a.project)}
                                {pay.outstanding > 0 && <span className={pay.overdue > 0 ? "text-red-500 font-semibold" : "text-gray-400"}> · {fmtK(pay.outstanding)} {pay.overdue > 0 ? `overdue (${pay.overdueDays}d)` : "outstanding"}</span>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] text-gray-400">via Mercury</span>
                                <button onClick={() => save("account", { ...a, status: "Closed" })}
                                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors">✓ Complete</button>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pctPaid >= 1 ? "bg-emerald-500" : pay.overdue > 0 ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${pctPaid * 100}%` }} />
                            </div>
                            <div className="text-[9px] text-gray-400 mt-1">
                              {pay.paid > a.project + 1
                                ? <span className="text-amber-500 font-semibold">Mercury total {fmtK(pay.paid)} exceeds the {fmtK(a.project)} fee — extra invoices or fee understated</span>
                                : <>{Math.round(pctPaid * 100)}% of fee collected</>}
                              {pay.lastPaid ? ` · last payment ${pay.lastPaid}` : ""}
                            </div>
                          </div>
                        );
                      })() : (
                        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-3.5 ${mercuryReady ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"}`} onClick={ev => ev.stopPropagation()}>
                          <div className={`text-[10px] font-medium ${mercuryReady ? "text-amber-700" : "text-gray-400"}`}>
                            {mercuryReady ? <>
                              Not linked to Mercury — no invoices found for “{a.name}”
                              <div className="text-[9px] text-amber-600/80 font-normal mt-0.5">Collections can’t be tracked until the Mercury client name matches (or an alias is added).</div>
                            </> : "Collections unavailable — Mercury not connected"}
                          </div>
                          <button onClick={() => save("account", { ...a, status: "Closed" })}
                            className="text-[10px] font-semibold px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0">✓ Complete</button>
                        </div>
                      )
                    ) : (
                      pay ? (
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3.5 ${pay.outstanding > 0 ? "bg-amber-50" : "bg-emerald-50"}`}>
                          <span className={`text-[10px] font-medium ${pay.outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            {pay.outstanding > 0
                              ? <>{fmtK(pay.paid)} collected · <span className="font-semibold">{fmtK(pay.outstanding)} still owed</span>{pay.overdue > 0 ? ` (${pay.overdueDays}d overdue)` : ""}</>
                              : <>Fully collected — {fmtK(pay.paid)} paid</>}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">✓ Complete</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 mb-3.5">
                          <span className="text-[10px] font-medium text-gray-400">{mercuryReady ? "Not linked to Mercury — collections unknown" : "Collections unavailable — Mercury not connected"}</span>
                          <span className="text-[10px] font-semibold text-gray-400">✓ Complete</span>
                        </div>
                      )
                    )}

                    {/* Burn to date — only meaningful mid-flight */}
                    {!done && e.hasDates && e.costToDate != null && e.elapsed > 0 && e.elapsed < 1 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50 mb-3.5 text-[10px] font-medium">
                        <span className="text-violet-600">Burn to date: <span className="font-semibold">{fmtK(e.costToDate)}</span> spent vs {fmtK(e.revToDate)} earned</span>
                        <span className={`font-semibold ${e.costToDate <= e.revToDate ? "text-emerald-600" : "text-red-500"}`}>{e.costToDate <= e.revToDate ? "On track" : "Burning hot"}</span>
                      </div>
                    )}

                    {/* Team allocation rows */}
                    {e.members.length > 0 ? (
                      <div className="border-t border-gray-100 pt-2.5">
                        {e.members.map(m => (
                          <div key={m.p.id + m.role} className="flex items-center gap-2 py-1">
                            <Av name={m.p.name} size={22} sl={m.p.sl} lead={m.role === "Lead"} />
                            <span className="text-[11px] font-medium text-gray-900 flex-1 truncate">{m.p.name}</span>
                            <Tag small variant={m.role === "Lead" ? "green" : m.role === "PM" ? "amber" : "default"}>{m.role}</Tag>
                            <span className="text-[10px] text-gray-400 w-10 text-right" title={m.role === "PM" ? "Share of this PM's managed book" : "Capacity share"}>{Math.round(m.alloc * 100)}%</span>
                            <span className="text-[10px] font-semibold text-red-500 w-16 text-right">{fmtK(m.monthlyCost)}/mo</span>
                            <span className="text-[10px] text-gray-500 w-14 text-right">{e.months != null ? fmtK(m.monthlyCost * e.months) : "—"}</span>
                          </div>
                        ))}
                        {e.externalTotal > 0 && (
                          <div className="flex items-center gap-2 py-1 border-t border-gray-100 mt-1 pt-1.5">
                            <div className="w-[22px] h-[22px] rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-semibold text-amber-700 shrink-0">EX</div>
                            <span className="text-[11px] font-medium text-gray-900 flex-1 truncate">{[...new Set(e.external.map((c: any) => c.vendor))].join(", ")}</span>
                            <Tag small variant="amber">External</Tag>
                            <span className="text-[10px] text-gray-400 w-10 text-right">{e.external.length}×</span>
                            <span className="text-[10px] font-semibold text-red-500 w-16 text-right">—</span>
                            <span className="text-[10px] text-gray-500 w-14 text-right">{fmtK(e.externalTotal)}</span>
                          </div>
                        )}
                      </div>
                    ) : e.externalTotal > 0 ? (
                      <div className="border-t border-gray-100 pt-2.5 flex items-center gap-2">
                        <div className="w-[22px] h-[22px] rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-semibold text-amber-700 shrink-0">EX</div>
                        <span className="text-[11px] font-medium text-gray-900 flex-1 truncate">{[...new Set(e.external.map((c: any) => c.vendor))].join(", ")}</span>
                        <Tag small variant="amber">External</Tag>
                        <span className="text-[10px] text-gray-500 w-14 text-right">{fmtK(e.externalTotal)}</span>
                      </div>
                    ) : (
                      <div className="border-t border-gray-100 pt-2.5 text-[11px] text-gray-300 italic">No team attached — cost unknown</div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="p-8 pb-12">
                <div className="mb-7">
                  <div className="text-2xl font-semibold text-gray-900 mb-1">Flat Rate Projects</div>
                  <div className="text-xs text-gray-400">Budget vs. team cost over each project's timeline. Team cost = each person's monthly cost × their capacity share on the project.</div>
                </div>

                {/* KPIs */}
                <div className="flex gap-4 flex-wrap mb-9">
                  <KpiCard label="In Flight" value={inFlight.length} sub={`${fmtK(kpiFee)} contracted`} />
                  {(() => {
                    // Mercury is the single source for collections
                    if (!mercuryReady) return <KpiCard label="Collected" value="—" sub="Mercury not connected" color="text-gray-400" />;
                    const linked = inFlight.map(a => payFor(a)).filter(Boolean);
                    const unlinked = inFlight.length - linked.length;
                    const col = linked.reduce((s, p: any) => s + p.paid, 0);
                    const owe = linked.reduce((s, p: any) => s + p.outstanding, 0);
                    return <KpiCard label="Collected" value={fmt(Math.round(col))} sub={`${fmt(Math.round(owe))} outstanding${unlinked ? ` · ${unlinked} not linked` : ""}`} color="text-emerald-600" />;
                  })()}
                  <KpiCard label="Project MRR" value={fmt(Math.round(kpiMrr))} sub="amortized this month" color="text-emerald-600" />
                  <KpiCard label="Projected Profit" value={withCost.length ? fmt(Math.round(kpiProfit)) : "—"} sub={withCost.length ? `across ${withCost.length} costed project${withCost.length !== 1 ? "s" : ""}` : "needs team + dates"} color={kpiProfit >= 0 ? "text-emerald-600" : "text-red-500"} />
                  <KpiCard label="Blended Margin" value={kpiCostedFee > 0 ? pct(kpiProfit / kpiCostedFee) : "—"} sub="profit ÷ contracted fees" color={kpiProfit >= 0 ? "text-emerald-600" : "text-red-500"} />
                </div>

                {/* In flight */}
                <div className="text-xl font-semibold text-gray-900 mb-4">In Flight</div>
                {inFlight.length === 0 && <div className="text-sm text-gray-400 italic mb-8">No active flat-rate projects. Add one with “+ Account” → type Project (or Hybrid) with dates and a team.</div>}
                <div className="grid gap-4 mb-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
                  {inFlight.map(a => <ProjectCard key={a.id} a={a} done={false} />)}
                </div>

                {/* Planning / pipeline */}
                {planning.length > 0 && (
                  <div className="mb-10">
                    <div className="text-xl font-semibold text-gray-900 mb-1">Planning</div>
                    <div className="text-xs text-gray-400 mb-4">Not yet started — not counted in revenue or workload.</div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {planning.map((a, i) => (
                        <div key={a.id} onClick={() => setSelected({ type: "account", data: a })}
                          className={`flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${i < planning.length - 1 ? "border-b border-gray-100" : ""}`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-semibold text-gray-900">{a.name}</span>
                            <SlTags a={a} small />
                            <StatusTag status={a.status} small />
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] text-gray-400">{a.pmId ? `PM: ${getName(a.pmId)}` : "No PM"}</span>
                            <span className={`text-sm font-semibold ${a.project > 0 ? "text-gray-900" : "text-gray-300"}`}>{a.project > 0 ? fmtK(a.project) : "no fee set"}</span>
                            <button onClick={ev => { ev.stopPropagation(); save("account", { ...a, status: "Active" }); }}
                              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors">Start →</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employee mileage */}
                {mileage.length > 0 && (
                  <div className="mb-10">
                    <div className="text-xl font-semibold text-gray-900 mb-1">Employee Mileage</div>
                    <div className="text-xs text-gray-400 mb-4">Across all flat-rate work — the project value each person delivers vs. what their time on those projects costs. Zeros mean no flat-rate assignments; PMs are measured in PM Coverage below.</div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 0.8fr" }}>
                        {["Person", "Projects", "Value Delivered", "Cost on Projects", "Contribution", "Multiple"].map(h => (
                          <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                        ))}
                      </div>
                      {mileage.map(m => (
                        <div key={m.p.id} onClick={() => setSelected({ type: "person", data: m.p })} className={`grid px-5 py-3.5 border-b border-gray-100 items-center cursor-pointer hover:bg-gray-50 transition-colors ${m.n === 0 ? "bg-gray-50/60" : ""}`} style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 0.8fr" }}>
                          <div className="flex items-center gap-2.5">
                            <Av name={m.p.name} size={28} sl={m.p.sl} lead={m.p.lead} />
                            <div>
                              <div className="text-[13px] font-semibold text-gray-900">{m.p.name}</div>
                              <div className="text-[10px] text-gray-400">{m.p.role}</div>
                            </div>
                          </div>
                          <div className={`text-[13px] ${m.n === 0 ? "text-gray-300" : "text-gray-500"}`}>{m.n || "—"}</div>
                          <div className={`text-sm font-semibold ${m.rev > 0 ? "text-emerald-600" : "text-gray-300"}`}>{m.rev > 0 ? fmt(Math.round(m.rev)) : "—"}</div>
                          <div className="text-sm font-semibold text-red-500">{m.costTotal > 0 ? fmt(Math.round(m.costTotal)) : "—"}{m.unknownCost && <span title="Some projects have no dates — cost not counted" className="text-amber-500 text-[10px] ml-1">⚠</span>}</div>
                          <div className={`text-sm font-semibold ${m.rev - m.costTotal >= 0 ? "text-emerald-600" : "text-red-500"}`}>{m.costTotal > 0 ? fmt(Math.round(m.rev - m.costTotal)) : "—"}</div>
                          <div className={`text-base font-semibold ${m.multiple == null ? "text-gray-300" : m.multiple >= 1 ? "text-emerald-600" : "text-red-500"}`}>{m.multiple != null ? `${m.multiple.toFixed(1)}x` : "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PM coverage */}
                {(() => {
                  // Every PM with an active book — including PMs who manage only
                  // retainers (they'd otherwise vanish from this table entirely)
                  const activeAll = accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status));
                  const pms = team.filter(p => activeAll.some(a => a.pmId === p.id));
                  if (pms.length === 0) return null;
                  return (
                    <div className="mb-10">
                      <div className="text-xl font-semibold text-gray-900 mb-1">PM Coverage</div>
                      <div className="text-xs text-gray-400 mb-4">Each PM's whole managed book — flat-rate projects and retainers. Their cost is spread across the book by account weight, so a PM's allocation never exceeds their salary.</div>
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "1.8fr 1.1fr 1fr 1fr 0.9fr 1fr" }}>
                          {["PM", "Book", "Project Fees", "Retainer MRR", "Cost /mo", "Oversight Leverage"].map(h => (
                            <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                          ))}
                        </div>
                        {pms.map(pm => {
                          const book = activeAll.filter(a => a.pmId === pm.id);
                          const projs = book.filter(a => a.type === "Project" || a.type === "Hybrid");
                          const rets = book.filter(a => a.type === "Retainer");
                          const fees = projs.reduce((s, a) => s + a.project, 0);
                          const retMRR = rets.reduce((s, a) => s + a.retainer, 0);
                          const costMo = cost(pm); // full cost — the book is all their active accounts
                          const annualValue = fees + retMRR * 12;
                          return (
                            <div key={pm.id} onClick={() => setSelected({ type: "person", data: pm })} className="grid px-5 py-3.5 border-b border-gray-100 items-center cursor-pointer hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: "1.8fr 1.1fr 1fr 1fr 0.9fr 1fr" }}>
                              <div className="flex items-center gap-2.5">
                                <Av name={pm.name} size={28} sl={pm.sl} />
                                <div>
                                  <div className="text-[13px] font-semibold text-gray-900">{pm.name}</div>
                                  <div className="text-[10px] text-gray-400">{pm.role}</div>
                                </div>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                <span className={projs.length ? "text-gray-900 font-semibold" : "text-gray-300"}>{projs.length} project{projs.length !== 1 ? "s" : ""}</span>
                                <span className="text-gray-300"> · </span>
                                <span className={rets.length ? "text-gray-900 font-semibold" : "text-gray-300"}>{rets.length} retainer{rets.length !== 1 ? "s" : ""}</span>
                              </div>
                              <div className={`text-sm font-semibold ${fees > 0 ? "text-emerald-600" : "text-gray-300"}`}>{fees > 0 ? fmtK(fees) : "—"}</div>
                              <div className={`text-sm font-semibold ${retMRR > 0 ? "text-emerald-600" : "text-gray-300"}`}>{retMRR > 0 ? <>{fmtK(retMRR)}<span className="text-[9px] text-gray-400 font-normal">/mo</span></> : "—"}</div>
                              <div className="text-sm font-semibold text-red-500">{fmt(Math.round(costMo))}</div>
                              <div className="text-[13px] font-semibold text-gray-700">{costMo > 0 ? `${(annualValue / (costMo * 12)).toFixed(1)}x` : "—"}<span className="text-[9px] text-gray-400 font-normal ml-1">value / annual cost</span></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Completed */}
                {completed.length > 0 && (
                  <div>
                    <div className="text-xl font-semibold text-gray-900 mb-1">Completed</div>
                    <div className="text-xs text-gray-400 mb-4">{completed.length} project{completed.length !== 1 ? "s" : ""} · {fmtK(completed.reduce((s, a) => s + a.project, 0))} lifetime fees</div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
                      {completed.map(a => <ProjectCard key={a.id} a={a} done={true} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══════════ PODS VIEW ══════════ */}
          {view === "pods" && (
            <div className="p-8 pb-12">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">Pods</div>
                  <div className="text-xs text-gray-400">Cross-functional teams that own a book of accounts — each with its own P&L. One home pod per person, one owning pod per account.</div>
                </div>
                <button onClick={() => setModal({ type: "pod", data: { id: null, name: "", color: DEPT_COLORS[pods.length % DEPT_COLORS.length], leadId: null } })}
                  className="bg-gray-900 rounded-lg px-4 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ New Pod</button>
              </div>

              {pods.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-14 text-center mb-8">
                  <div className="text-sm text-gray-500 font-medium mb-1">No pods yet</div>
                  <div className="text-xs text-gray-400 mb-4">Create your first pod (e.g. the pilot), then assign a lead, members, and accounts.</div>
                  <button onClick={() => setModal({ type: "pod", data: { id: null, name: "", color: DEPT_COLORS[0], leadId: null } })}
                    className="bg-gray-900 rounded-lg px-4 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ Create a pod</button>
                </div>
              )}

              <div className="grid gap-4 mb-9" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}>
                {podStats.map(pod => {
                  const cap = pod.members.filter(m => m.sl !== "leadership" && m.sl !== "ops").length * 5;
                  return (
                  <div key={pod.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                    <div className={`h-1 ${pod.color.split(" ")[0]}`} />
                    <div className="px-5 pt-4 pb-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className={`font-semibold rounded-full tracking-wide text-[11px] px-2.5 py-1 ${pod.color}`}>{pod.name}</span>
                          <div className="text-[11px] text-gray-400 mt-1.5">{pod.lead ? `Lead: ${pod.lead.name}` : "No pod lead"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${pod.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtK(pod.margin)}</div>
                            <div className="text-[9px] text-gray-400">margin{pod.rev > 0 ? ` · ${pct(pod.marginPct)}` : ""}</div>
                          </div>
                          <button onClick={() => setModal({ type: "pod", data: pod })} className="text-gray-300 hover:text-gray-500 text-sm">&#9998;</button>
                        </div>
                      </div>
                      {/* P&L strip */}
                      <div className="grid grid-cols-3 gap-2 mb-3.5">
                        <div className="bg-gray-50 rounded-lg px-3 py-2"><div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Revenue</div><div className="text-[13px] font-semibold text-emerald-600 mt-0.5">{fmtK(pod.rev)}<span className="text-[8px] text-gray-400 font-normal">/mo</span></div></div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2"><div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Cost</div><div className="text-[13px] font-semibold text-red-500 mt-0.5">{fmtK(pod.cost)}<span className="text-[8px] text-gray-400 font-normal">/mo</span></div></div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2"><div className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Accounts</div><div className="text-[13px] font-semibold text-gray-900 mt-0.5">{pod.activeAccts.length}</div></div>
                      </div>
                      {/* Members */}
                      <div className="border-t border-gray-100 pt-2.5">
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Members · {pod.members.length}</div>
                        {pod.members.length === 0 ? <div className="text-[11px] text-gray-300 italic mb-2">No members yet</div> : (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {pod.members.map(m => (
                              <div key={m.id} onClick={() => setSelected({ type: "person", data: m })} className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 bg-gray-50 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-100">
                                <Av name={m.name} size={20} sl={m.sl} lead={m.id === pod.leadId} />
                                <span className="text-[11px] font-medium text-gray-900">{m.name.split(" ")[0]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 mt-2.5">Book · {pod.activeAccts.length} active</div>
                        {pod.activeAccts.length === 0 ? <div className="text-[11px] text-gray-300 italic">No accounts yet</div> : (
                          <div className="flex flex-wrap gap-1.5">
                            {pod.activeAccts.map(a => (
                              <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className="text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 cursor-pointer hover:bg-gray-100">{a.name} <span className="text-gray-400">{fmtK(acctVal(a))}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {/* Retainers still to place into a pod — the real gap to close */}
              {retainersToPlace.length > 0 && pods.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="text-[11px] font-semibold text-amber-700 mb-2.5">Retainers to place · {retainersToPlace.length} <span className="font-normal text-amber-600">— active Symphony accounts not yet owned by a pod</span></div>
                  <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
                    {retainersToPlace.map(a => (
                      <div key={a.id} className="flex items-center gap-2 py-1.5">
                        <div className="flex-1 min-w-0"><span className="text-xs font-medium text-gray-900">{a.name}</span> <span className="text-[10px] text-gray-400">{fmtK(acctVal(a))}/mo</span></div>
                        <select value="" onChange={e => e.target.value && assignToPod("account", a.id, e.target.value)} className="bg-white border border-amber-200 rounded-md px-2 py-1 text-[10px] text-gray-700 outline-none">
                          <option value="">Add to pod…</option>
                          {pods.map(pd => <option key={pd.id} value={pd.id}>{pd.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Division 2 — the Studio Bench (permanent home, not an error state) */}
              <div className="mt-2">
                <div className="flex items-baseline gap-2.5 mb-1">
                  <span className="text-xl font-semibold text-gray-900">Studio Bench</span>
                  <span className="text-[11px] text-gray-400">— specialists, PMs & producer the pods pull from · {benchPeople.length}</span>
                </div>
                <div className="text-xs text-gray-400 mb-4">Deep-craft project work that isn't tied to one pod. Flat-rate projects live here by design.</div>
                {benchPeople.length === 0 ? (
                  <div className="text-[11px] text-gray-300 italic">Everyone is on a pod.</div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {benchPeople.map(p => (
                        <div key={p.id} className="flex items-center gap-2 pl-1 pr-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                          <Av name={p.name} size={26} sl={p.sl} lead={p.lead} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{p.name}</div>
                            <div className="text-[9px] text-gray-400 truncate">{p.role || p.sl}</div>
                          </div>
                          {pods.length > 0 && (
                            <select value="" onChange={e => e.target.value && assignToPod("person", p.id, e.target.value)} className="bg-white border border-gray-200 rounded-md px-1.5 py-1 text-[10px] text-gray-500 outline-none ml-1">
                              <option value="">→ pod</option>
                              {pods.map(pd => <option key={pd.id} value={pd.id}>{pd.name}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ INVOICES VIEW (Mercury) ══════════ */}
          {view === "invoices" && (() => {
            const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";
            const acctByName: Record<string, any> = {};
            accounts.forEach(a => { acctByName[a.name.toLowerCase().replace(/[^a-z0-9]/g, "")] = a; });
            const matchAcct = (name: string) => acctByName[(name || "").toLowerCase().replace(/[^a-z0-9]/g, "")];
            const statusStyle: Record<string, string> = {
              Paid: "bg-emerald-50 text-emerald-600",
              Unpaid: "bg-amber-50 text-amber-600",
              Processing: "bg-blue-50 text-blue-600",
              Cancelled: "bg-gray-100 text-gray-400",
            };
            const invoices = mercury?.invoices || [];
            // Every unpaid invoice past its due date, oldest debt first
            const todayISO = new Date().toISOString().slice(0, 10);
            const overdueInvoices = invoices
              .filter((i: any) => (i.status === "Unpaid" || i.status === "Processing") && i.dueDate && i.dueDate < todayISO)
              .map((i: any) => ({ ...i, daysLate: Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000) }))
              .sort((a: any, b: any) => b.daysLate - a.daysLate);
            const overdueTotal = overdueInvoices.reduce((s: number, i: any) => s + i.amount, 0);
            // Where each overdue invoice sits in the tracker
            const acctById: Record<string, any> = {};
            accounts.forEach(a => { acctById[a.id] = a; });
            const placeOf = (inv: any) => {
              const a = inv.accountId ? acctById[inv.accountId] : null;
              if (!a) return { label: "not in tracker", tone: "text-gray-300", acct: null };
              const active = ["Active", "Launch", "Growth"].includes(a.status);
              const kind = a.type === "Retainer" ? "retainer" : active ? "active project" : "archived project";
              return { label: kind, tone: active ? "text-gray-500" : "text-amber-600", acct: a };
            };
            const inFlight = invoices.filter((i: any) => i.status === "Unpaid" || i.status === "Processing");
            const paidInv = invoices.filter((i: any) => i.status === "Paid");
            const sorted = [...invoices].sort((a, b) => {
              const rank = (s: string) => (s === "Unpaid" ? 0 : s === "Processing" ? 1 : s === "Paid" ? 2 : 3);
              return rank(a.status) - rank(b.status);
            });

            return (
              <div className="p-8 pb-12">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900 mb-1">Invoices</div>
                    <div className="text-xs text-gray-400">Live from Mercury — invoices in flight vs. paid. {mercury?.stale ? "Showing the last successful sync." : mercury?.fetchedAt ? `Synced ${new Date(mercury.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : ""}</div>
                  </div>
                  <button onClick={loadMercury} disabled={mercuryLoading}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {mercuryLoading ? "Syncing…" : "↻ Refresh"}
                  </button>
                </div>

                {mercuryLoading && mercury === null && <div className="text-sm text-gray-400">Connecting to Mercury…</div>}

                {/* Not connected — setup instructions */}
                {mercury && mercury.connected === false && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 max-w-2xl">
                    <div className="text-base font-semibold text-gray-900 mb-1">Mercury isn't connected yet</div>
                    <div className="text-xs text-gray-500 mb-4">Add a read-only Mercury token and this tab fills with live invoice status. The token stays server-side — it's never exposed in the browser.</div>
                    <ol className="text-[13px] text-gray-600 space-y-2 list-decimal ml-4">
                      <li>In Mercury: <span className="font-medium">Settings → Tokens</span> → create a <span className="font-medium">read-only</span> token.</li>
                      <li>In Vercel: <span className="font-medium">Project → Settings → Environment Variables</span> → add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">MERCURY_API_TOKEN</code> = your token (include the <code className="bg-gray-100 px-1 rounded text-[11px]">secret-token:</code> prefix).</li>
                      <li>Redeploy (any push, or Vercel → Deployments → Redeploy), then hit Refresh here.</li>
                    </ol>
                  </div>
                )}

                {/* Errored with no snapshot to fall back on */}
                {mercury && mercury.connected && mercury.error && !mercury.stale && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 max-w-2xl">
                    <div className="text-[13px] font-semibold text-red-600 mb-1">Couldn't reach Mercury</div>
                    <div className="text-[11px] text-red-500 font-mono break-all">{mercury.error}</div>
                    <div className="text-[11px] text-gray-500 mt-2">Usually a bad or expired token, or the <code className="bg-gray-100 px-1 rounded">secret-token:</code> prefix is missing. Regenerate a read-only token in Mercury and update the Vercel env var.</div>
                  </div>
                )}

                {/* Serving the last good snapshot because Mercury is unreachable */}
                {mercury && mercury.stale && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-start gap-3">
                    <span className="text-amber-500 text-sm leading-none mt-0.5">⚠</span>
                    <div>
                      <div className="text-[12px] font-semibold text-amber-700">Mercury is unreachable — showing the last successful sync{mercury.snapshotAt ? ` from ${new Date(mercury.snapshotAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</div>
                      <div className="text-[11px] text-amber-600/80 mt-0.5">Figures may be out of date. <span className="font-mono">{mercury.error}</span></div>
                    </div>
                  </div>
                )}

                {/* Connected + data (fresh or from snapshot) */}
                {mercury && mercury.connected && mercury.byCustomer && (
                  <>
                    <div className="flex gap-4 flex-wrap mb-8">
                      <KpiCard label="In Flight" value={fmt(Math.round(mercury.totals?.inFlight || 0))} sub={`${mercury.counts?.inFlight ?? inFlight.length} unpaid / processing`} color="text-amber-600" />
                      <KpiCard label="Paid" value={fmt(Math.round(mercury.totals?.paid || 0))} sub={`${mercury.counts?.paid ?? paidInv.length} collected${mercury.truncated ? "+" : ""}`} color="text-emerald-600" />
                      <KpiCard label="Invoices" value={`${mercury.counts?.total || 0}${mercury.truncated ? "+" : ""}`} sub="from Mercury AR" />
                    </div>

                    {/* sub-tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-max mb-6">
                      {([["overview", "Overview"], ["overdue", "Overdue"], ["monthly", "Monthly Paid"]] as const).map(([id, label]) => {
                        const n = id === "overdue" ? overdueInvoices.length : 0;
                        return (
                        <button key={id} onClick={() => setInvoiceTab(id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${invoiceTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                          {label}
                          {n > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${invoiceTab === id ? "bg-red-50 text-red-500" : "text-red-400"}`}>{n}</span>}
                        </button>
                      );})}
                    </div>

                    {invoiceTab === "overview" && (<>
                    {invoices.length === 0 ? (
                      <div className="text-sm text-gray-400 italic">No invoices in Mercury yet. (Invoices you send through Ignition appear via the Ignition sync, not here.)</div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1.4fr" }}>
                          {["Client", "Invoice #", "Amount", "Status", "Due / matched account"].map(h => (
                            <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                          ))}
                        </div>
                        {sorted.map((inv: any, i: number) => {
                          const acct = matchAcct(inv.customer);
                          return (
                            <div key={inv.id || i} className="grid px-5 py-3 border-b border-gray-100 items-center" style={{ gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1.4fr" }}>
                              <div className="text-[13px] font-medium text-gray-900">{inv.customer}</div>
                              <div className="text-[11px] text-gray-400">{inv.number || "—"}</div>
                              <div className="text-[13px] font-semibold text-gray-900">{fmt(inv.amount)}</div>
                              <div><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusStyle[inv.status] || "bg-gray-100 text-gray-500"}`}>{inv.status}</span></div>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-gray-400">{inv.status === "Paid" ? `paid ${fmtDate(inv.paidAt)}` : `due ${fmtDate(inv.dueDate)}`}</span>
                                {acct ? <span className="text-gray-300">·</span> : null}
                                {acct ? <SlTags a={acct} small /> : <span className="text-[9px] text-amber-500">no match</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-3">Showing all in-flight invoices{mercury.recentPaidShown < (mercury.counts?.paid || 0) ? ` + the ${mercury.recentPaidShown} most recent paid` : ""}. Read-only Mercury connection · invoices sent through Ignition are tracked separately.</div>
                    </>)}

                    {invoiceTab === "overdue" && (
                      overdueInvoices.length === 0 ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-[13px] text-emerald-700 font-medium">Nothing overdue — every invoice is inside its terms.</div>
                      ) : (<>
                        <div className="flex items-center gap-4 mb-5 px-5 py-3 rounded-xl bg-red-50 border border-red-200">
                          <div>
                            <div className="text-2xl font-semibold text-red-500 leading-none">{fmt(Math.round(overdueTotal))}</div>
                            <div className="text-[11px] text-red-500/80 mt-1">{overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? "s" : ""} past due</div>
                          </div>
                          <div className="ml-auto text-right text-[11px] text-gray-500">
                            Oldest: <span className="font-semibold text-red-500">{overdueInvoices[0].daysLate} days</span> — {overdueInvoices[0].customer}
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "1.6fr 0.8fr 1fr 0.9fr 0.8fr 1.5fr" }}>
                            {["Client", "Invoice #", "Amount", "Due", "Late", "Where it sits"].map(h => (
                              <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                            ))}
                          </div>
                          {overdueInvoices.map((inv: any, i: number) => {
                            const place = placeOf(inv);
                            const severe = inv.daysLate >= 60;
                            return (
                              <div key={inv.id || i} onClick={() => place.acct && setSelected({ type: "account", data: place.acct })}
                                className={`grid px-5 py-3 border-b border-gray-100 items-center ${place.acct ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`} style={{ gridTemplateColumns: "1.6fr 0.8fr 1fr 0.9fr 0.8fr 1.5fr" }}>
                                <div className="text-[13px] font-medium text-gray-900">{inv.customer}</div>
                                <div className="text-[11px] text-gray-400">{inv.number || "—"}</div>
                                <div className={`text-[13px] font-semibold ${severe ? "text-red-500" : "text-gray-900"}`}>{fmt(inv.amount)}</div>
                                <div className="text-[11px] text-gray-400">{fmtDate(inv.dueDate)}</div>
                                <div className={`text-[13px] font-semibold ${severe ? "text-red-500" : inv.daysLate >= 30 ? "text-amber-600" : "text-gray-500"}`}>{inv.daysLate}d</div>
                                <div className="text-[11px] flex items-center gap-1.5 min-w-0">
                                  <span className="text-gray-700 truncate">{place.acct ? place.acct.name : "—"}</span>
                                  <span className={`text-[9px] shrink-0 ${place.tone}`}>· {place.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-3">Sorted oldest-debt first. Amber rows sit on archived projects — completed work that was never fully collected.</div>
                      </>)
                    )}

                    {invoiceTab === "monthly" && (() => {
                      const months = Object.entries(mercury.paidByMonth || {}).sort((a, b) => b[0].localeCompare(a[0]));
                      if (months.length === 0) return <div className="text-sm text-gray-400 italic">No paid invoices yet.</div>;
                      const max = Math.max(1, ...months.map(([, v]: any) => v.total));
                      const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); };
                      const now = new Date(), thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          {months.map(([ym, v]: any) => (
                            <div key={ym} className="px-5 py-3.5 border-b border-gray-100 last:border-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="text-[13px] font-semibold text-gray-900">{fmtMonth(ym)} {ym === thisYM && <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-1">this month</span>}<span className="text-[10px] font-normal text-gray-400 ml-1">· {v.count} invoice{v.count !== 1 ? "s" : ""}</span></div>
                                <div className="text-[15px] font-semibold text-emerald-600">{fmt(Math.round(v.total))}</div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(v.total / max) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                          <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Paid invoices grouped by invoice month{mercury.truncated ? " (recent history)" : ""}</span>
                            <span className="text-[12px] font-semibold text-gray-700">{fmt(Math.round(mercury.totals?.paid || 0))} all-time</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })()}

          {/* ══════════ COSTS VIEW (external / vendor spend) ══════════ */}
          {view === "costs" && (() => {
            const fmtMonth = (ym: string) => { const [y, m] = ym.split("-"); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" }); };
            const months = costStats.months;
            const max = Math.max(1, ...months.map(m => costStats.byMonth[m]));
            const thisYear = new Date().getFullYear().toString();
            const ytd = months.filter(m => m.startsWith(thisYear)).reduce((s, m) => s + costStats.byMonth[m], 0);
            const blank = { id: null, vendor: "", category: "Development", amount: 0, month: new Date().toISOString().slice(0, 8) + "01", accountId: null, notes: "" };
            return (
              <div className="p-8 pb-12">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900 mb-1">External Costs</div>
                    <div className="text-xs text-gray-400">Spend on people who aren’t on the roster — Upwork developers, agencies, software. Roster salaries live in Team.</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setImportRows(importRows ? null : []); setImportText(""); }}
                      className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors">
                      {importRows ? "Cancel import" : "↑ Import Upwork CSV"}
                    </button>
                    <button onClick={() => setModal({ type: "cost", data: blank })}
                      className="bg-gray-900 rounded-lg px-4 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ Add Cost</button>
                  </div>
                </div>

                {/* CSV import: paste → auto-map via saved rules → assign the rest */}
                {importRows !== null && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
                    {importRows.length === 0 ? (<>
                      <div className="text-[13px] font-semibold text-gray-900 mb-1">Import from Upwork</div>
                      <div className="text-[11px] text-gray-500 mb-3">
                        In Upwork go to <span className="font-medium">Reports → Transaction History</span>, set the date range, and download the CSV — that report includes the
                        freelancer and contract on each row, which is what lets spend attach to a project. Paste the whole file below.
                      </div>
                      <textarea value={importText} onChange={e => setImportText(e.target.value)}
                        placeholder="Paste the CSV contents here…"
                        className="w-full h-36 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700 outline-none resize-y" />
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => { const r = parseCsv(importText); r.length ? setImportRows(r) : setSaveError("Couldn't find date and amount columns in that CSV."); }}
                          disabled={!importText.trim()}
                          className={`rounded-lg px-4 py-2 text-[11px] font-semibold transition-colors ${importText.trim() ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
                          Preview
                        </button>
                        <span className="text-[10px] text-gray-400">Safe to re-upload the full export each month — transactions match on Upwork’s reference ID, so existing rows update and your project assignments are kept.</span>
                      </div>
                    </>) : (<>
                      {(() => {
                        const byWho: Record<string, any> = {};
                        importRows.forEach((r, i) => {
                          const g = byWho[r.who] || (byWho[r.who] = { who: r.who, total: 0, n: 0, idxs: [], accountId: r.accountId, remember: r.remember });
                          g.total += r.amount; g.n++; g.idxs.push(i);
                        });
                        const groups = Object.values(byWho).sort((a: any, b: any) => b.total - a.total);
                        const months = [...new Set(importRows.map(r => r.month))].sort();
                        const assigned = importRows.filter(r => r.accountId).reduce((s, r) => s + r.amount, 0);
                        const totalAmt = importRows.reduce((s, r) => s + r.amount, 0);
                        const setGroup = (g: any, patch: any) =>
                          setImportRows(rows => rows!.map((r, i) => g.idxs.includes(i) ? { ...r, ...patch } : r));
                        return (<>
                          {(() => {
                            const fresh = importRows.filter(r => r.isNew).length;
                            const kept = importRows.filter(r => r.alreadyAssigned).length;
                            return (
                              <div className="flex items-baseline justify-between mb-3">
                                <div>
                                  <div className="text-[13px] font-semibold text-gray-900">{importRows.length} transactions · {fmt(Math.round(totalAmt))}</div>
                                  <div className="text-[11px] text-gray-400">
                                    {months[0]?.slice(0, 7)} → {months[months.length - 1]?.slice(0, 7)} ·{" "}
                                    <span className="text-emerald-600 font-medium">{fresh} new</span>
                                    {importRows.length - fresh > 0 && <> · {importRows.length - fresh} already imported</>}
                                    {kept > 0 && <> · <span className="text-emerald-600 font-medium">{kept} keep their project</span></>}
                                  </div>
                                </div>
                                <button onClick={runImport} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-[11px] font-semibold hover:bg-gray-800 transition-colors">Import</button>
                              </div>
                            );
                          })()}
                          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                            <div className="grid px-4 py-2 bg-gray-100 sticky top-0" style={{ gridTemplateColumns: "2fr 0.7fr 1fr 1.6fr 0.9fr" }}>
                              {["Freelancer / contract", "Rows", "Amount", "Project", "Remember"].map(h => (
                                <div key={h} className="text-[9px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                              ))}
                            </div>
                            {groups.map((g: any) => (
                              <div key={g.who} className="grid px-4 py-2 border-b border-gray-100 items-center" style={{ gridTemplateColumns: "2fr 0.7fr 1fr 1.6fr 0.9fr" }}>
                                <div className="text-[11px] text-gray-900 truncate pr-2" title={g.who}>{g.who}</div>
                                <div className="text-[11px] text-gray-400">{g.n}</div>
                                <div className="text-[11px] font-semibold text-gray-900">{fmt(Math.round(g.total))}</div>
                                <select value={g.accountId || ""} onChange={e => setGroup(g, { accountId: e.target.value || null })}
                                  className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700 outline-none mr-2">
                                  <option value="">— unattributed —</option>
                                  <CostTargetOptions />
                                </select>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={!!g.remember} disabled={!g.accountId}
                                    onChange={e => setGroup(g, { remember: e.target.checked })} />
                                  <span className="text-[10px] text-gray-400">save rule</span>
                                </label>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-2">Tick “save rule” and that freelancer auto-maps to the same project on every future import.</div>
                        </>);
                      })()}
                    </>)}
                  </div>
                )}

                {costs.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-14 text-center">
                    <div className="text-sm text-gray-500 font-medium mb-1">No external costs recorded</div>
                    <div className="text-xs text-gray-400 mb-4">Add vendor spend by month — it’ll roll into the studio P&L.</div>
                    <button onClick={() => setModal({ type: "cost", data: blank })} className="bg-gray-900 rounded-lg px-4 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ Add the first one</button>
                  </div>
                ) : (<>
                  <div className="flex gap-4 flex-wrap mb-8">
                    <KpiCard label="Run Rate" value={fmt(Math.round(costStats.trailingAvg))} sub="trailing 3-month average" color="text-red-500" />
                    <KpiCard label={`${thisYear} to date`} value={fmt(Math.round(ytd))} sub={`${months.filter(m => m.startsWith(thisYear)).length} months recorded`} />
                    <KpiCard label="All time" value={fmt(Math.round(costStats.total))} sub={`${months.length} months · ${Object.keys(costStats.byVendor).length} vendor${Object.keys(costStats.byVendor).length !== 1 ? "s" : ""}`} color="text-gray-600" />
                  </div>

                  <div className="grid gap-6" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
                    {/* Monthly trend */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">By month</div>
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {months.map(m => (
                          <div key={m} className="px-5 py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[12px] font-medium text-gray-700">{fmtMonth(m)}</span>
                              <span className="text-[13px] font-semibold text-gray-900">{fmt(Math.round(costStats.byMonth[m]))}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${(costStats.byMonth[m] / max) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* By project + line items */}
                    <div>
                      {(() => {
                        const byAcct: Record<string, number> = {}; let untagged = 0;
                        costs.forEach((c: any) => {
                          if (c.accountId) byAcct[c.accountId] = (byAcct[c.accountId] || 0) + Number(c.amount || 0);
                          else untagged += Number(c.amount || 0);
                        });
                        const rows = Object.entries(byAcct).map(([id, v]) => ({ acct: accounts.find(a => a.id === id), v }))
                          .filter(r => r.acct).sort((a, b) => b.v - a.v);
                        const tagged = rows.reduce((s, r) => s + r.v, 0);
                        const all = tagged + untagged;
                        return (
                          <>
                            <div className="flex items-baseline justify-between mb-3">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">By project</div>
                              <div className="text-[10px] text-gray-400">{all > 0 ? `${Math.round((tagged / all) * 100)}% attributed` : ""}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                              {rows.map(r => (
                                <div key={r.acct.id} onClick={() => setCostsFilter(f => f === r.acct.id ? null : r.acct.id)}
                                  title="Show this account's transactions"
                                  className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${costsFilter === r.acct.id ? "bg-gray-900 text-white hover:bg-gray-800" : "hover:bg-gray-50"}`}>
                                  <span className={`text-[12px] font-medium truncate ${costsFilter === r.acct.id ? "text-white" : "text-gray-900"}`}>{r.acct.name}</span>
                                  <span className={`text-[12px] font-semibold shrink-0 ${costsFilter === r.acct.id ? "text-white" : "text-gray-900"}`}>{fmt(Math.round(r.v))}</span>
                                </div>
                              ))}
                              {untagged > 0 && (
                                <div onClick={() => setCostsFilter(null)}
                                  className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-t border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors">
                                  <span className="text-[12px] font-medium text-amber-700">Not yet attributed</span>
                                  <span className="text-[12px] font-semibold text-amber-700">{fmt(Math.round(untagged))}</span>
                                </div>
                              )}
                              {rows.length === 0 && untagged === 0 && <div className="px-4 py-3 text-[11px] text-gray-300 italic">No costs yet</div>}
                            </div>
                          </>
                        );
                      })()}
                      {(() => {
                        const unassigned = costs.filter((c: any) => !c.accountId);
                        const filterAcct = costsFilter ? accounts.find(a => a.id === costsFilter) : null;
                        const shown = [...costs]
                          .filter((c: any) => filterAcct ? c.accountId === costsFilter : (costsShowAll || !c.accountId))
                          .sort((a: any, b: any) => (b.month || "").localeCompare(a.month || ""));
                        const fmtDay = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";
                        return (<>
                          <div className="flex items-baseline justify-between mb-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              {filterAcct ? <>Transactions · <span className="text-gray-900">{filterAcct.name}</span></>
                                : <>Transactions {unassigned.length > 0 && <span className="text-amber-600 normal-case tracking-normal font-medium">· {unassigned.length} to assign</span>}</>}
                            </div>
                            {filterAcct ? (
                              <button onClick={() => setCostsFilter(null)} className="text-[10px] font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md">✕ Clear filter</button>
                            ) : (
                              <button onClick={() => setCostsShowAll(v => !v)} className="text-[10px] font-semibold text-gray-400 hover:text-gray-700">
                                {costsShowAll ? "Show unassigned only" : `Show all (${costs.length})`}
                              </button>
                            )}
                          </div>
                          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-[560px] overflow-y-auto">
                            {shown.length === 0 && (filterAcct
                              ? <div className="px-4 py-6 text-center text-[11px] text-gray-400">No transactions on {filterAcct.name} anymore.</div>
                              : <div className="px-4 py-6 text-center text-[11px] text-emerald-600 font-medium">Everything is assigned to a project.</div>)}
                            {shown.map((c: any) => (
                              <div key={c.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="w-[70px] shrink-0 text-[10px] text-gray-400">{fmtDay(c.month)}</div>
                                <div className="w-[68px] shrink-0 text-[12px] font-semibold text-gray-900 text-right">{fmt(c.amount)}</div>
                                {/* Inline assignment — saves on change, no modal needed */}
                                <select value={c.accountId || ""} onChange={e => saveCost({ ...c, accountId: e.target.value || null })}
                                  className={`flex-1 min-w-0 rounded-md px-2 py-1 text-[11px] outline-none border ${c.accountId ? "bg-white border-gray-200 text-gray-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                  <option value="">— assign to account —</option>
                                  <CostTargetOptions />
                                </select>
                                <button onClick={() => setModal({ type: "cost", data: c })} title="Edit or split"
                                  className="text-gray-300 hover:text-gray-600 text-xs px-1 shrink-0">&#9998;</button>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-2">Pick a project to assign — it saves immediately. Click a "By project" row to see and reassign its transactions; use ✎ to split one payment across several projects.</div>
                        </>);
                      })()}
                    </div>
                  </div>
                </>)}
              </div>
            );
          })()}

          {/* ══════════ P&L DASHBOARD VIEW ══════════ */}
          {view === "pnl" && (
            <div className="p-8 pb-12">
              <div className="mb-9">
                <div className="text-2xl font-semibold text-gray-900 mb-5">Studio Overview</div>
                <div className="flex gap-4 flex-wrap">
                  <KpiCard label="Monthly Revenue" value={fmt(totals.rev)} sub={`${fmt(totals.rev * 12)} annualized`} color="text-emerald-600" />
                  <KpiCard label="Monthly Cost" value={fmt(totals.cost)} sub={totals.vendor > 0 ? `${fmt(Math.round(totals.people))} team + ${fmt(Math.round(totals.vendor))} external` : `${fmt(totals.cost * 12)} annualized`} color="text-red-500" />
                  <KpiCard label="Monthly Margin" value={fmt(totals.margin)} sub={`${pct(totals.pct)} margin`} color={totals.margin >= 0 ? "text-emerald-600" : "text-red-500"} />
                  <KpiCard label="Headcount" value={totals.heads} sub={`${totals.active} active accounts`} />
                  <KpiCard label="Revenue / Head" value={fmt(Math.round(totals.rev / (totals.heads || 1)))} sub="per person per month" color="text-gray-600" />
                </div>
              </div>

              {/* ── Revenue Mix: recurring vs flat-rate (Kyle request) ── */}
              {(() => {
                const active = accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status));
                const retMRR = active.reduce((s, a) => s + a.retainer, 0);
                const retCount = active.filter(a => a.retainer > 0).length;
                // Calendar-month basis: includes projects whose window closed
                // earlier this month (they still earned revenue this month)
                const nowD = new Date();
                const projMRR = active.reduce((s, a) => s + projRevInMonth(a, nowD.getFullYear(), nowD.getMonth()), 0);
                const projCount = active.filter(a => projRevInMonth(a, nowD.getFullYear(), nowD.getMonth()) > 0).length;
                const total = retMRR + projMRR;
                const retPct = total > 0 ? retMRR / total : 0;
                const now = new Date();
                const months = [0, 1, 2].map(off => {
                  const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
                  const proj = active.reduce((s, a) => s + projRevInMonth(a, d.getFullYear(), d.getMonth()), 0);
                  return { label: d.toLocaleDateString("en-US", { month: "short" }), proj, total: retMRR + proj };
                });
                return (
                  <div className="mb-9">
                    <div className="text-xl font-semibold text-gray-900 mb-1">Revenue Mix</div>
                    <div className="text-xs text-gray-400 mb-4">Recurring retainers vs. amortized flat-rate work — and where the mix heads as project windows close (assumes the retainer book holds).</div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      {/* Two headline cards — each metric grouped under its own label */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-5 py-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <span className="text-[12px] font-semibold text-gray-700">Symphony / Retainers</span>
                          </div>
                          <div className="text-3xl font-semibold text-gray-900 leading-none">{fmt(retMRR)}<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                          <div className="text-[11px] text-gray-500 mt-2">{pct(retPct)} of revenue · {retCount} accounts</div>
                          <div className="text-[11px] text-gray-400">{fmt(retMRR * 12)} annualized</div>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-5 py-4">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                            <span className="text-[12px] font-semibold text-gray-700">Flat Rate</span>
                          </div>
                          <div className="text-3xl font-semibold text-gray-900 leading-none">{fmt(Math.round(projMRR))}<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                          <div className="text-[11px] text-gray-500 mt-2">{pct(1 - retPct)} of revenue · {projCount} projects earning</div>
                          <div className="text-[11px] text-gray-400">amortized across project windows</div>
                        </div>
                      </div>

                      {/* Proportion bar */}
                      <div className="mt-4 h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                        <div className="bg-emerald-400 h-full" style={{ width: `${retPct * 100}%` }} />
                        <div className="bg-violet-400 h-full" style={{ width: `${(1 - retPct) * 100}%` }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                        <span className="text-gray-900">{fmt(retMRR + Math.round(projMRR))}<span className="text-gray-400 font-normal">/mo total this month</span></span>
                      </div>

                      {/* 3-month outlook — flat-rate rolls off as windows close */}
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">3-Month Outlook <span className="font-normal normal-case text-gray-400">— retainers hold, flat-rate revenue rolls off as project windows close</span></div>
                        <div className="grid grid-cols-3 gap-3">
                          {months.map((mo, i) => {
                            const flatPct = mo.total > 0 ? mo.proj / mo.total : 0;
                            return (
                            <div key={mo.label} className={`rounded-lg px-4 py-3 border ${i === 0 ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50"}`}>
                              <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{mo.label}{i === 0 ? " · now" : ""}</span>
                                <span className="text-lg font-semibold text-gray-900">{fmtK(mo.total)}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden flex bg-gray-100 mb-1.5">
                                <div className="bg-emerald-400 h-full" style={{ width: `${(1 - flatPct) * 100}%` }} />
                                <div className="bg-violet-400 h-full" style={{ width: `${flatPct * 100}%` }} />
                              </div>
                              <div className="text-[10px] text-gray-400">{fmtK(retMRR)} ret <span className="text-gray-300">·</span> <span className="text-violet-500">{fmtK(mo.proj)} flat</span></div>
                            </div>
                          )})}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="h-px bg-gray-200 w-full" />

              {/* Service Line P&L Table */}
              <div className="mt-8 mb-9">
                <div className="text-xl font-semibold text-gray-900 mb-5">Service Line P&L</div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 1fr 2fr" }}>
                    {["Service Line", "People", "Revenue", "Cost", "Margin", "Margin %", "Health"].map(h => (
                      <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                    ))}
                  </div>
                  {slPods.map(pd => (
                    <div key={pd.id} className="grid px-5 py-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 1fr 2fr" }}>
                      <div className="flex items-center gap-2.5">
                        <SlTag sl={pd.id} />
                      </div>
                      <div className="text-[13px] text-gray-500">{pd.members.length}</div>
                      <div className="text-sm font-semibold text-emerald-600">{fmtK(pd.rev)}</div>
                      <div className="text-sm font-semibold text-red-500" title={`Direct: ${fmtK(pd.directCost)} + Overhead: ${fmtK(pd.overheadAlloc)}`}>{fmtK(pd.cost)}</div>
                      <div className={`text-sm font-semibold ${pd.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtK(pd.margin)}</div>
                      <div className={`text-[13px] font-semibold ${pd.marginPct >= 0.3 ? "text-emerald-600" : pd.marginPct >= 0 ? "text-amber-500" : "text-red-500"}`}>{pd.rev > 0 ? pct(pd.marginPct) : "—"}</div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-400 ${pd.marginPct >= 0.3 ? "bg-emerald-500" : pd.marginPct >= 0 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${Math.max(0, Math.min(100, pd.marginPct * 100))}%` }} />
                        </div>
                        <Tag small variant={pd.marginPct >= 0.3 ? "green" : pd.marginPct >= 0 ? "amber" : "red"}>
                          {pd.marginPct >= 0.3 ? "Healthy" : pd.marginPct >= 0 ? "At Risk" : "Under"}
                        </Tag>
                      </div>
                    </div>
                  ))}
                  <div className="grid px-5 py-4 bg-gray-100" style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 1fr 2fr" }}>
                    <div className="text-xs font-bold text-gray-900">Studio Total</div>
                    <div className="text-xs font-bold text-gray-900">{totals.heads}</div>
                    <div className="text-sm font-bold text-emerald-600">{fmtK(totals.rev)}</div>
                    <div className="text-sm font-bold text-red-500">{fmtK(totals.cost)}</div>
                    <div className={`text-sm font-bold ${totals.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtK(totals.margin)}</div>
                    <div className={`text-[13px] font-bold ${totals.pct >= 0.3 ? "text-emerald-600" : "text-amber-500"}`}>{pct(totals.pct)}</div>
                    <div />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 w-full" />

              {/* Revenue per Person */}
              <div className="mt-8">
                <div className="text-xl font-semibold text-gray-900 mb-5">Revenue per Person</div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {team.filter(p => p.sl !== "leadership").map(p => {
                    const c = cost(p);
                    const isOps = p.sl === "ops";
                    if (isOps) {
                      // PMs: revenue attribution stays with designers — a PM's row
                      // shows the monthly value of the book they oversee vs. their cost
                      const book = accounts.filter(a => a.pmId === p.id && ["Active", "Launch", "Growth"].includes(a.status));
                      const oversee = book.reduce((s, a) => s + acctVal(a), 0);
                      const leverage = c > 0 ? oversee / c : 0;
                      return (
                        <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-3.5 px-5 py-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                          <Av name={p.name} size={32} sl={p.sl} lead={p.lead} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold flex items-center gap-1.5">{p.name} <Tag small variant="amber">PM</Tag></div>
                            <div className="text-[10px] text-gray-400">{p.role}</div>
                          </div>
                          <SlTag sl={p.sl} small />
                          <div className="text-right w-20">
                            <div className="text-[10px] text-gray-400">Accounts</div>
                            <div className="text-xs text-gray-900">{book.length} managed</div>
                          </div>
                          <div className="text-right w-24">
                            <div className="text-[10px] text-gray-400">Oversees</div>
                            <div className="text-sm font-semibold text-amber-600">{fmt(Math.round(oversee))}</div>
                            <div className="text-[9px] text-gray-400">/mo book value</div>
                          </div>
                          <div className="text-right w-20">
                            <div className="text-[10px] text-gray-400">Cost</div>
                            <div className="text-[13px] text-red-500">{fmt(Math.round(c))}</div>
                          </div>
                          <div className="text-center w-14">
                            <div className="text-[10px] text-gray-400">Leverage</div>
                            <div className={`text-base font-semibold ${leverage >= 1 ? "text-amber-600" : "text-red-500"}`}>{leverage.toFixed(1)}x</div>
                          </div>
                        </div>
                      );
                    }
                    const exp = personExposure(p.id, accounts);
                    const leadRev = exp.asLead;
                    const supRev = exp.asSupport + exp.asDev;
                    const totalExp = exp.total;
                    const ratio = c > 0 ? totalExp / c : 0;
                    const acctCount = accounts.filter(a => a.leadId === p.id).length;
                    const supCount = accounts.filter(a => a.supportIds.includes(p.id) || a.devId === p.id).length;
                    return (
                      <div key={p.id} onClick={() => setSelected({ type: "person", data: p })} className="flex items-center gap-3.5 px-5 py-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                        <Av name={p.name} size={32} sl={p.sl} lead={p.lead} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold">{p.name}</div>
                          <div className="text-[10px] text-gray-400">{p.role}</div>
                        </div>
                        <SlTag sl={p.sl} small />
                        <div className="text-right w-20">
                          <div className="text-[10px] text-gray-400">Accounts</div>
                          <div className="text-xs text-gray-900">{acctCount} lead · {supCount} sup</div>
                        </div>
                        <div className="text-right w-24">
                          <div className="text-[10px] text-gray-400">Exposure</div>
                          <div className="text-sm font-semibold text-emerald-600">{fmt(totalExp)}</div>
                          {supRev > 0 && <div className="text-[9px] text-gray-400">{fmtK(leadRev)} + {fmtK(supRev)} sup</div>}
                        </div>
                        <div className="text-right w-20">
                          <div className="text-[10px] text-gray-400">Cost</div>
                          <div className="text-[13px] text-red-500">{fmt(Math.round(c))}</div>
                        </div>
                        <div className="text-center w-14">
                          <div className="text-[10px] text-gray-400">Ratio</div>
                          <div className={`text-base font-semibold ${ratio >= 1 ? "text-emerald-600" : "text-red-500"}`}>{ratio.toFixed(1)}x</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <Sidebar selected={selected} team={team} accounts={accounts} onClose={() => setSelected(null)} onEdit={(type, data) => setModal({ type, data })} onAssign={assignAccount} />
      </div>

      {/* Edit modals */}
      {modal?.type === "person" && (
        <Modal title={modal.data.id ? modal.data.name : "New Team Member"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3.5">
            <Inp label="Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} ph="Full name" />
            <Inp label="Role" value={modal.data.role} onChange={v => setModal({ ...modal, data: { ...modal.data, role: v } })} ph="Job title" />
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Service Line" value={modal.data.sl} onChange={v => setModal({ ...modal, data: { ...modal.data, sl: v } })} opts={slOpts} />
              <Inp label="Type" value={modal.data.type} onChange={v => setModal({ ...modal, data: { ...modal.data, type: v } })} opts={["Partner", "Full-Time", "Contractor", "Project-Based"]} />
            </div>
            <Inp label="Annual CAD" value={modal.data.cadY} onChange={v => setModal({ ...modal, data: { ...modal.data, cadY: v } })} type="number" ph="85000" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Monthly CAD</div>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-500">
                  {modal.data.cadY ? fmt(Math.round(Number(modal.data.cadY) / 12)) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Monthly USD</div>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-500">
                  {modal.data.cadY ? fmt(Math.round((Number(modal.data.cadY) / 12) * CAD_TO_USD)) : "—"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Hours/Month" value={modal.data.hrs} onChange={v => setModal({ ...modal, data: { ...modal.data, hrs: v } })} type="number" />
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modal.data.lead} onChange={e => setModal({ ...modal, data: { ...modal.data, lead: e.target.checked } })} />
                  <span className="text-[13px] text-gray-500">Pod Lead</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => save("person", modal.data)} className="flex-1 bg-gray-900 text-white rounded-lg py-3 font-semibold text-[13px] hover:bg-gray-800 transition-colors">Save</button>
              {modal.data.id && <button onClick={() => del("person", modal.data.id)} className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-4 py-3 font-semibold text-xs hover:bg-red-100 transition-colors">Remove</button>}
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === "account" && (
        <Modal title={modal.data.id ? modal.data.name : "New Account"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3.5">
            <Inp label="Client Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} ph="Acme Corp" />
            {/* Service lines — multi-select (revenue splits evenly across lines in pod P&L) */}
            {(() => {
              const curSls = acctSls(modal.data);
              const setSls = (v: string[]) => setModal({ ...modal, data: { ...modal.data, sls: v, sl: v[0] || "" } });
              return (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Service Lines</label>
                  <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                    {curSls.map((s: string) => (
                      <div key={s} className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-white rounded-full border border-gray-200">
                        <SlTag sl={s} small />
                        <button onClick={() => setSls(curSls.filter((x: string) => x !== s))} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                      </div>
                    ))}
                    {curSls.length === 0 && <span className="text-[11px] text-gray-300 italic py-0.5">No service line yet</span>}
                  </div>
                  <select value="" onChange={e => { if (e.target.value && !curSls.includes(e.target.value)) setSls([...curSls, e.target.value]); }}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none">
                    <option value="">+ Add service line...</option>
                    {SERVICE_LINES.filter(s => !curSls.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              );
            })()}
            <Inp label="Status" value={modal.data.status} onChange={v => setModal({ ...modal, data: { ...modal.data, status: v } })} opts={["Launch", "Growth", "Active", "Pipeline", "Paused", "Closed"]} />
            {/* If the current holder is no longer eligible, keep them visible in the
                dropdown (tagged) so the field shows the truth and can be cleared */}
            {(() => {
              const withCurrent = (opts, id, note) =>
                id && !opts.some(o => o.value === id) ? [...opts, { value: id, label: `${getName(id)} (${note})` }] : opts;
              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Account Lead (Designer)" value={modal.data.leadId} onChange={v => setModal({ ...modal, data: { ...modal.data, leadId: v || null } })} opts={withCurrent(leadOpts, modal.data.leadId, "not lead-tagged")} />
                    <Inp label="Project Manager" value={modal.data.pmId} onChange={v => setModal({ ...modal, data: { ...modal.data, pmId: v || null } })} opts={withCurrent(pmOpts, modal.data.pmId, "not ops")} />
                  </div>
                  <Inp label="Developer (optional)" value={modal.data.devId} onChange={v => setModal({ ...modal, data: { ...modal.data, devId: v || null } })} opts={withCurrent(devOpts, modal.data.devId, "not in Web Dev")} />
                </>
              );
            })()}
            {/* Support members multi-select */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Support Members</label>
              <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                {(modal.data.supportIds || []).map(sid => {
                  const m = team.find(p => p.id === sid);
                  if (!m) return null;
                  return (
                    <div key={sid} className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-white rounded-full border border-gray-200">
                      <Av name={m.name} size={20} sl={m.sl} />
                      <span className="text-[11px] font-medium text-gray-900">{m.name.split(" ")[0]}</span>
                      <button onClick={() => setModal({ ...modal, data: { ...modal.data, supportIds: modal.data.supportIds.filter(id => id !== sid) } })} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                    </div>
                  );
                })}
              </div>
              <select value="" onChange={e => { if (e.target.value && !(modal.data.supportIds || []).includes(e.target.value)) { setModal({ ...modal, data: { ...modal.data, supportIds: [...(modal.data.supportIds || []), e.target.value] } }); } }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none">
                <option value="">+ Add support member...</option>
                {team.filter(p => p.id !== modal.data.leadId && !(modal.data.supportIds || []).includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* Designer weight */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Designer Weight (1–5 pts)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={5} step={1} value={modal.data.weight ?? 3}
                  onChange={e => setModal({ ...modal, data: { ...modal.data, weight: Number(e.target.value) } })}
                  className="flex-1 accent-gray-800" />
                <span className="text-sm font-semibold text-gray-900 w-6 text-center">{modal.data.weight ?? 3}</span>
              </div>
              <div className="flex justify-between text-[9px] text-gray-300 px-0.5">
                <span>Light</span><span>Medium</span><span>Heavy</span>
              </div>
            </div>
            <Inp label="Contract Type" value={modal.data.type} onChange={v => setModal({ ...modal, data: { ...modal.data, type: v } })} opts={["Retainer", "Project", "Hybrid"]} />
            {/* Retainer field — shown for Retainer and Hybrid */}
            {(modal.data.type === "Retainer" || modal.data.type === "Hybrid") && (
              <Inp label="Monthly Retainer (USD)" value={modal.data.retainer} onChange={v => setModal({ ...modal, data: { ...modal.data, retainer: v } })} type="number" />
            )}
            {/* Flat fee + dates — shown for Project and Hybrid */}
            {(modal.data.type === "Project" || modal.data.type === "Hybrid") && (() => {
              const missingDates = !modal.data.startDate || !modal.data.endDate;
              return (
                <>
                  <Inp label="Flat Fee (USD)" value={modal.data.project} onChange={v => setModal({ ...modal, data: { ...modal.data, project: v } })} type="number" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Inp label="Start Date *" value={modal.data.startDate || ""} onChange={v => setModal({ ...modal, data: { ...modal.data, startDate: v || null } })} type="date" />
                    </div>
                    <div>
                      <Inp label="End Date *" value={modal.data.endDate || ""} onChange={v => setModal({ ...modal, data: { ...modal.data, endDate: v || null } })} type="date" />
                    </div>
                  </div>
                  {missingDates && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-700">
                      Start and end dates are required for flat rate projects — without them the revenue won't show in MRR.
                    </div>
                  )}
                  {modal.data.project > 0 && modal.data.startDate && modal.data.endDate && (
                    <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5 text-[12px] text-violet-700">
                      <span className="font-semibold">{fmt(Math.round(modal.data.project / monthsBetween(modal.data.startDate, modal.data.endDate)))}/mo</span>
                      <span className="text-violet-400 ml-1">· {monthsBetween(modal.data.startDate, modal.data.endDate)} month project</span>
                    </div>
                  )}
                  <Inp label="Mercury Invoice #s (optional)" value={modal.data.mercuryInvoices || ""}
                    onChange={v => setModal({ ...modal, data: { ...modal.data, mercuryInvoices: v } })}
                    ph="e.g. INV-549, INV-612" />
                  <div className="text-[11px] text-gray-400">
                    Collections read from Mercury, matched by client name — any deposit split (25%, 50%, …) is tracked automatically.
                    Only set invoice numbers when one Mercury client covers several engagements (e.g. a retainer <em>and</em> this project);
                    claimed invoices are then excluded from the client’s other accounts.
                  </div>
                </>
              );
            })()}
            <Inp label="Notes" value={modal.data.notes} onChange={v => setModal({ ...modal, data: { ...modal.data, notes: v } })} ph="Scope, deliverables, etc." />
            <div className="flex gap-2 mt-2">
              {(() => {
                const needsDates = (modal.data.type === "Project" || modal.data.type === "Hybrid") && (!modal.data.startDate || !modal.data.endDate);
                return (
                  <button
                    onClick={() => { if (!needsDates) save("account", modal.data); }}
                    disabled={needsDates}
                    className={`flex-1 rounded-lg py-3 font-semibold text-[13px] transition-colors ${needsDates ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                  >
                    {needsDates ? "Add dates to save" : "Save"}
                  </button>
                );
              })()}
              {modal.data.id && <button onClick={() => del("account", modal.data.id)} className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-4 py-3 font-semibold text-xs hover:bg-red-100 transition-colors">Remove</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Department edit modal */}
      {modal?.type === "cost" && (
        <Modal title={modal.data.id ? `Edit: ${modal.data.vendor}` : "New External Cost"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3.5">
            <Inp label="Vendor" value={modal.data.vendor} onChange={v => setModal({ ...modal, data: { ...modal.data, vendor: v } })} ph="e.g. Upwork" />
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Category" value={modal.data.category} onChange={v => setModal({ ...modal, data: { ...modal.data, category: v } })} opts={["Development", "Design", "Software", "Agency", "Other"]} />
              <Inp label="Amount (USD)" value={modal.data.amount} onChange={v => setModal({ ...modal, data: { ...modal.data, amount: v } })} type="number" />
            </div>
            <Inp label="Month" value={(modal.data.month || "").slice(0, 10)} onChange={v => setModal({ ...modal, data: { ...modal.data, month: v ? v.slice(0, 8) + "01" : null } })} type="date" />
            {!modal.data._splits ? (<>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Attribute to an account (optional)</label>
                <select value={modal.data.accountId || ""} onChange={e => setModal({ ...modal, data: { ...modal.data, accountId: e.target.value || null } })}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none">
                  <option value="">— none —</option>
                  <CostTargetOptions />
                </select>
              </div>
              {modal.data.id && (
                <button onClick={() => setModal({ ...modal, data: { ...modal.data, _splits: [{ accountId: modal.data.accountId || "", amount: modal.data.amount }] } })}
                  className="self-start text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors">
                  ⑂ Split across projects
                </button>
              )}
            </>) : (() => {
              const splits = modal.data._splits;
              const allocated = splits.reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
              const left = Math.round((Number(modal.data.amount) - allocated) * 100) / 100;
              const setSplits = (v: any[]) => setModal({ ...modal, data: { ...modal.data, _splits: v } });
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Split across projects</label>
                    <span className={`text-[11px] font-semibold ${Math.abs(left) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                      {Math.abs(left) < 0.01 ? "fully allocated" : `${fmt(left)} left`}
                    </span>
                  </div>
                  {splits.map((s: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={s.accountId} onChange={e => setSplits(splits.map((x: any, j: number) => j === i ? { ...x, accountId: e.target.value } : x))}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none">
                        <option value="">— pick a project —</option>
                        <CostTargetOptions />
                      </select>
                      <input type="number" value={s.amount} onChange={e => setSplits(splits.map((x: any, j: number) => j === i ? { ...x, amount: e.target.value === "" ? "" : Number(e.target.value) } : x))}
                        className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none" />
                      <button onClick={() => setSplits(splits.filter((_: any, j: number) => j !== i))} className="text-gray-400 hover:text-gray-600 text-sm px-1">✕</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => setSplits([...splits, { accountId: "", amount: left > 0 ? left : 0 }])}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors">+ Add project</button>
                    <button onClick={() => setModal({ ...modal, data: { ...modal.data, _splits: null } })}
                      className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 px-2.5 py-1.5 rounded-md transition-colors">Cancel split</button>
                  </div>
                </div>
              );
            })()}
            <Inp label="Notes" value={modal.data.notes} onChange={v => setModal({ ...modal, data: { ...modal.data, notes: v } })} ph="optional" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => {
                const d = modal.data;
                if (!d.vendor?.trim() || !d.month) return;
                if (d._splits) { applySplit(d); return; }
                saveCost(d);
              }}
                className="flex-1 bg-gray-900 text-white rounded-lg py-3 font-semibold text-[13px] hover:bg-gray-800 transition-colors">
                {modal.data._splits ? `Save ${modal.data._splits.filter((s: any) => s.accountId && Number(s.amount) > 0).length} split rows` : "Save"}
              </button>
              {modal.data.id && !modal.data._splits && <button onClick={() => removeCost(modal.data.id)} className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-4 py-3 font-semibold text-xs hover:bg-red-100 transition-colors">Delete</button>}
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === "pod" && (() => {
        const podMembers = team.filter(p => p.podId === modal.data.id);
        const podAccts = accounts.filter(a => a.podId === modal.data.id);
        const memberOpts = team.filter(p => p.sl !== "leadership" && p.podId !== modal.data.id);
        const acctOpts = accounts.filter(a => a.status !== "Closed" && a.podId !== modal.data.id);
        return (
        <Modal title={modal.data.id ? `Edit: ${modal.data.name}` : "New Pod"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3.5">
            <Inp label="Pod Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} ph="e.g. Pod A" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Color</label>
              <div className="flex flex-wrap gap-2">
                {DEPT_COLORS.map(c => (
                  <button key={c} onClick={() => setModal({ ...modal, data: { ...modal.data, color: c } })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${c.split(" ")[0]} ${modal.data.color === c ? "border-gray-900 scale-110" : "border-transparent hover:border-gray-300"}`} />
                ))}
              </div>
            </div>
            <Inp label="Pod Lead" value={modal.data.leadId} onChange={v => setModal({ ...modal, data: { ...modal.data, leadId: v || null } })} opts={teamOpts} />
            {modal.data.id ? (
              <>
                {/* Members — assign immediately (exclusive membership) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Members · {podMembers.length}</label>
                  <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                    {podMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-white rounded-full border border-gray-200">
                        <Av name={m.name} size={20} sl={m.sl} /><span className="text-[11px] font-medium text-gray-900">{m.name.split(" ")[0]}</span>
                        <button onClick={() => assignToPod("person", m.id, null)} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                      </div>
                    ))}
                    {podMembers.length === 0 && <span className="text-[11px] text-gray-300 italic py-0.5">No members yet</span>}
                  </div>
                  <select value="" onChange={e => e.target.value && assignToPod("person", e.target.value, modal.data.id)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none">
                    <option value="">+ Add member...</option>
                    {memberOpts.map(p => <option key={p.id} value={p.id}>{p.name}{p.podId ? " (moving from another pod)" : ""}</option>)}
                  </select>
                </div>
                {/* Accounts */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Account Book · {podAccts.length}</label>
                  <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                    {podAccts.map(a => (
                      <div key={a.id} className="flex items-center gap-1 pr-1.5 py-0.5 pl-2 bg-white rounded-full border border-gray-200">
                        <span className="text-[11px] font-medium text-gray-900">{a.name}</span>
                        <button onClick={() => assignToPod("account", a.id, null)} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                      </div>
                    ))}
                    {podAccts.length === 0 && <span className="text-[11px] text-gray-300 italic py-0.5">No accounts yet</span>}
                  </div>
                  <select value="" onChange={e => e.target.value && assignToPod("account", e.target.value, modal.data.id)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none">
                    <option value="">+ Add account...</option>
                    {acctOpts.map(a => <option key={a.id} value={a.id}>{a.name}{a.podId ? " (moving from another pod)" : ""}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">Save the pod first, then assign members and accounts.</div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={() => { if (modal.data.name.trim()) savePod(modal.data); }} className="flex-1 bg-gray-900 text-white rounded-lg py-3 font-semibold text-[13px] hover:bg-gray-800 transition-colors">Save</button>
              {modal.data.id && <button onClick={() => removePod(modal.data.id)} className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-4 py-3 font-semibold text-xs hover:bg-red-100 transition-colors">Delete</button>}
            </div>
          </div>
        </Modal>
        );
      })()}

      {modal?.type === "dept" && (
        <Modal title={modal.data.id ? `Edit: ${modal.data.name}` : "New Department"} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3.5">
            <Inp label="Department Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} ph="e.g. Web Development" />

            {/* Color picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Color</label>
              <div className="flex flex-wrap gap-2">
                {DEPT_COLORS.map(c => (
                  <button key={c} onClick={() => setModal({ ...modal, data: { ...modal.data, color: c } })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${c.split(" ")[0]} ${modal.data.color === c ? "border-gray-900 scale-110" : "border-transparent hover:border-gray-300"}`} />
                ))}
              </div>
            </div>

            {/* Members multi-select */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Members</label>
              <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                {(modal.data.memberIds || []).map(mid => {
                  const m = team.find(p => p.id === mid);
                  if (!m) return null;
                  return (
                    <div key={mid} className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-white rounded-full border border-gray-200">
                      <Av name={m.name} size={20} sl={m.sl} />
                      <span className="text-[11px] font-medium text-gray-900">{m.name.split(" ")[0]}</span>
                      <button onClick={() => setModal({ ...modal, data: { ...modal.data, memberIds: modal.data.memberIds.filter(id => id !== mid) } })} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                    </div>
                  );
                })}
              </div>
              <select value="" onChange={e => {
                if (e.target.value && !(modal.data.memberIds || []).includes(e.target.value)) {
                  setModal({ ...modal, data: { ...modal.data, memberIds: [...(modal.data.memberIds || []), e.target.value] } });
                }
              }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none">
                <option value="">+ Add member...</option>
                {team.filter(p => p.sl !== "leadership" && p.sl !== "ops" && !(modal.data.memberIds || []).includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.role}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={async () => {
                let d = modal.data;
                if (!d.name.trim()) return;
                if (d.id) {
                  setDepts(prev => prev.map(dept => dept.id === d.id ? d : { ...dept, memberIds: dept.memberIds.filter(mid => !d.memberIds.includes(mid)) }));
                } else {
                  const newId = `d${deptNid}`;
                  setDeptNid(n => n + 1);
                  d = { ...d, id: newId };
                  setDepts(prev => [...prev.map(dept => ({ ...dept, memberIds: dept.memberIds.filter(mid => !d.memberIds.includes(mid)) })), d]);
                }
                try { await upsertDepartment(d); } catch (e) { console.error("Save dept failed:", e); }
                setModal(null);
              }} className="flex-1 bg-gray-900 text-white rounded-lg py-3 font-semibold text-[13px] hover:bg-gray-800 transition-colors">Save</button>
              {modal.data.id && <button onClick={async () => {
                setDepts(prev => prev.filter(d => d.id !== modal.data.id));
                try { await deleteDepartment(modal.data.id); } catch (e) { console.error("Delete dept failed:", e); }
                setModal(null);
              }} className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-4 py-3 font-semibold text-xs hover:bg-red-100 transition-colors">Delete</button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
