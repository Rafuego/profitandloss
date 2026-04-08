// @ts-nocheck
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  fetchTeam, fetchAccounts, fetchDepartments,
  upsertTeamMember, deleteTeamMember,
  upsertAccount, deleteAccount,
  upsertDepartment, deleteDepartment,
} from "@/lib/supabase";

const CAD_TO_USD = 0.69;

const SERVICE_LINES = [
  { id: "deck", name: "Deck", color: "bg-amber-100 text-amber-700" },
  { id: "site", name: "Site", color: "bg-teal-100 text-teal-700" },
  { id: "brand", name: "Brand", color: "bg-rose-100 text-rose-700" },
  { id: "product", name: "Product", color: "bg-blue-100 text-blue-700" },
  { id: "symphony", name: "Symphony", color: "bg-violet-100 text-violet-700" },
  { id: "ops", name: "Operations", color: "bg-stone-200 text-stone-600" },
  { id: "leadership", name: "Leadership", color: "bg-gray-800 text-white" },
];
const SL = Object.fromEntries(SERVICE_LINES.map(s => [s.id, s]));

const INIT_TEAM = [
  { id: "t1", name: "Rafay Iqbal", role: "Partner", sl: "leadership", type: "Partner", cadY: 110000, usdM: null, hrs: 160, lead: true },
  { id: "t2", name: "Matthew Good", role: "Partner", sl: "leadership", type: "Partner", cadY: 110000, usdM: null, hrs: 160, lead: true },
  { id: "t3", name: "Vicky Huynh", role: "Senior Project Manager", sl: "ops", type: "Full-Time", cadY: 90000, usdM: null, hrs: 160, lead: true },
  { id: "t4", name: "Andrew del Rizzo", role: "Digital Site Designer / Animations", sl: "site", type: "Full-Time", cadY: 100000, usdM: null, hrs: 160, lead: true },
  { id: "t5", name: "Sylvia Han", role: "Senior Digital Designer (Brand & Decks)", sl: "deck", type: "Full-Time", cadY: 120000, usdM: null, hrs: 160, lead: true },
  { id: "t6", name: "Nicole Chou", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: 85000, usdM: null, hrs: 160, lead: true },
  { id: "t7", name: "Robyn Dang", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: 80000, usdM: null, hrs: 160, lead: false },
  { id: "t8", name: "Sabrina Wen", role: "Staff Product Designer", sl: "product", type: "Full-Time", cadY: 75000, usdM: null, hrs: 160, lead: false },
  { id: "t9", name: "Deseree Lau", role: "Digital Designer", sl: "brand", type: "Full-Time", cadY: 85000, usdM: null, hrs: 160, lead: false },
  { id: "t10", name: "Victor Wong", role: "Junior Digital Designer", sl: "brand", type: "Full-Time", cadY: 85000, usdM: null, hrs: 160, lead: false },
  { id: "t11", name: "Emily Chung", role: "Contractor", sl: "brand", type: "Contractor", cadY: 102000, usdM: null, hrs: 40, lead: true },
  { id: "t12", name: "Vencho", role: "Brand Lead", sl: "brand", type: "Contractor", cadY: null, usdM: 3500, hrs: 40, lead: false },
  { id: "t13", name: "Candy Cho", role: "Contractor", sl: "symphony", type: "Contractor", cadY: null, usdM: 1800, hrs: 40, lead: false },
  { id: "t14", name: "Ivy", role: "Contractor", sl: "symphony", type: "Contractor", cadY: null, usdM: 1800, hrs: 40, lead: false },
  { id: "t15", name: "Joshua Ramkhelawan", role: "Webflow Developer", sl: "site", type: "Contractor", cadY: 24000, usdM: null, hrs: 40, lead: false },
  { id: "t16", name: "Igor Katcha", role: "Webflow Developer", sl: "site", type: "Contractor", cadY: null, usdM: 2000, hrs: 40, lead: false },
  { id: "t17", name: "Talha", role: "Webflow Developer", sl: "site", type: "Project-Based", cadY: null, usdM: 0, hrs: 0, lead: false },
];

const INIT_ACCOUNTS = [
  { id: "a1", name: "1AU Technologies", sl: "symphony", leadId: "t15", supportIds: [], status: "Launch", type: "Retainer", retainer: 3000, project: 0, notes: "" },
  { id: "a2", name: "Attio", sl: "symphony", leadId: "t13", supportIds: [], status: "Launch", type: "Retainer", retainer: 2750, project: 0, notes: "" },
  { id: "a3", name: "Basis", sl: "symphony", leadId: "t10", supportIds: [], status: "Growth", type: "Retainer", retainer: 4500, project: 0, notes: "" },
  { id: "a4", name: "Envoy", sl: "symphony", leadId: "t10", supportIds: [], status: "Launch", type: "Retainer", retainer: 1500, project: 0, notes: "" },
  { id: "a5", name: "Highrise", sl: "symphony", leadId: "t15", supportIds: [], status: "Launch", type: "Retainer", retainer: 2750, project: 0, notes: "" },
  { id: "a6", name: "Lumen", sl: "symphony", leadId: "t13", supportIds: [], status: "Growth", type: "Retainer", retainer: 4500, project: 0, notes: "" },
  { id: "a7", name: "Portal Space", sl: "symphony", leadId: "t10", supportIds: [], status: "Growth", type: "Retainer", retainer: 4500, project: 0, notes: "" },
  { id: "a8", name: "Vuecason", sl: "symphony", leadId: "t9", supportIds: [], status: "Growth", type: "Retainer", retainer: 3000, project: 0, notes: "" },
  { id: "a9", name: "Applecart", sl: "symphony", leadId: "t15", supportIds: [], status: "Launch", type: "Retainer", retainer: 2750, project: 0, notes: "" },
  { id: "a10", name: "Cytora", sl: "symphony", leadId: "t13", supportIds: [], status: "Launch", type: "Retainer", retainer: 2250, project: 0, notes: "" },
  { id: "a11", name: "Goody", sl: "symphony", leadId: "t9", supportIds: [], status: "Growth", type: "Retainer", retainer: 4800, project: 0, notes: "" },
  { id: "a12", name: "Raspberry Ai", sl: "symphony", leadId: "t8", supportIds: [], status: "Growth", type: "Retainer", retainer: 8750, project: 0, notes: "" },
  { id: "a13", name: "RBL", sl: "symphony", leadId: "t10", supportIds: [], status: "Launch", type: "Retainer", retainer: 3000, project: 0, notes: "" },
];

// ── Org Chart Departments (independent of service lines) ──
const INIT_DEPTS = [
  { id: "d1", name: "Deck", memberIds: ["t5"], color: "bg-amber-100 text-amber-700" },
  { id: "d2", name: "Web Development", memberIds: ["t4", "t15", "t16", "t17"], color: "bg-teal-100 text-teal-700" },
  { id: "d3", name: "Brand", memberIds: ["t9", "t10", "t11", "t12"], color: "bg-rose-100 text-rose-700" },
  { id: "d4", name: "Product", memberIds: ["t6", "t7", "t8"], color: "bg-blue-100 text-blue-700" },
  { id: "d5", name: "Symphony", memberIds: ["t13", "t14"], color: "bg-violet-100 text-violet-700" },
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
  // No dates = treat project fee as a straight monthly amount (backward compat)
  if (!a.startDate || !a.endDate) return a.project;
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

// Revenue attribution: lead gets 50% (or 100% if no support), support splits remaining 50% evenly
const acctVal = (a: any) => a.retainer + monthlyProjectRev(a);
const leadShare = (a: any) => a.supportIds.length > 0 ? acctVal(a) * 0.5 : acctVal(a);
const supShare = (a: any) => a.supportIds.length > 0 ? (acctVal(a) * 0.5) / a.supportIds.length : 0;
const personExposure = (personId: string, accounts: any[]) => {
  let asLead = 0, asSupport = 0;
  accounts.forEach(a => {
    if (a.leadId === personId) asLead += leadShare(a);
    if (a.supportIds.includes(personId)) asSupport += supShare(a);
  });
  return { asLead, asSupport, total: asLead + asSupport };
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
const Sidebar = ({ selected, team, accounts, onClose, onEdit }) => {
  if (!selected) return null;
  const { type, data } = selected;

  if (type === "person") {
    const p = data;
    const c = cost(p);
    const led = accounts.filter(a => a.leadId === p.id);
    const sup = accounts.filter(a => a.supportIds.includes(p.id));
    const exp = personExposure(p.id, accounts);
    const rev = exp.total;
    const leadRev = exp.asLead;
    const supRev = exp.asSupport;
    const ratio = c > 0 ? rev / c : 0;

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
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3.5">Revenue Exposure</div>
          <div className="flex gap-4 mb-3.5">
            <div><div className="text-[10px] text-gray-400">Total Exposure</div><div className="text-2xl font-medium text-emerald-600">{fmt(rev)}</div></div>
            <div><div className="text-[10px] text-gray-400">Exp / Cost</div><div className={`text-2xl font-medium ${ratio >= 1 ? "text-emerald-600" : "text-red-500"}`}>{ratio.toFixed(1)}x</div></div>
          </div>
          {(leadRev > 0 || supRev > 0) && <div className="flex gap-4 mb-3.5">
            <div><div className="text-[10px] text-gray-400">As Lead</div><div className="text-sm font-medium text-gray-900">{fmt(leadRev)}</div></div>
            <div><div className="text-[10px] text-gray-400">As Support</div><div className="text-sm font-medium text-gray-500">{fmt(supRev)}</div></div>
          </div>}
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-400 ${ratio >= 1 ? "bg-emerald-500" : "bg-red-400"}`}
              style={{ width: `${Math.min(100, (ratio / 3) * 100)}%` }} />
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full" />

        <div className="px-6 py-5">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2.5">Accounts</div>
          {[...led.map(a => ({ ...a, _role: "Lead", _share: leadShare(a) })), ...sup.map(a => ({ ...a, _role: "Support", _share: supShare(a) }))].map(a => (
            <div key={a.id + a._role} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-white border border-gray-200 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-gray-900">{a.name}</span>
                <Tag small variant={a._role === "Lead" ? "green" : "default"}>{a._role}</Tag>
              </div>
              <span className="text-xs font-semibold text-emerald-600">{fmt(Math.round(a._share))}</span>
            </div>
          ))}
          {led.length + sup.length === 0 && <div className="text-xs text-gray-400 italic">No accounts assigned</div>}
        </div>

        <div className="px-6 pb-6 pt-3">
          <button onClick={() => onEdit("person", p)} className="w-full bg-gray-900 rounded-lg py-3 text-white text-xs font-semibold tracking-wide hover:bg-gray-800 transition-colors">Edit Person</button>
        </div>
      </div>
    );
  }

  if (type === "account") {
    const a = data;
    const lead = team.find(p => p.id === a.leadId);
    const sups = team.filter(p => a.supportIds.includes(p.id));

    return (
      <div className="w-96 min-w-[384px] border-l border-gray-200 bg-gray-50 overflow-auto h-full">
        <div className="px-6 pt-7 pb-5">
          <div className="flex justify-between">
            <div>
              <div className="text-xl font-medium text-gray-900">{a.name}</div>
              <div className="flex gap-1.5 mt-2.5">
                <SlTag sl={a.sl} />
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
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [nid, setNid] = useState(20);
  const [deptNid, setDeptNid] = useState(10);
  const [view, setView] = useState("workload");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [acctView, setAcctView] = useState<"list" | "pods">("pods");

  useEffect(() => {
    async function load() {
      try {
        const [t, a, d] = await Promise.all([fetchTeam(), fetchAccounts(), fetchDepartments()]);
        if (t.length > 0) setTeam(t);
        if (a.length > 0) setAccounts(a);
        if (d.length > 0) setDepts(d);
      } catch (e) {
        console.error("Failed to load from Supabase, using local data:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const pods = useMemo(() => {
    // Overhead = ops + leadership costs split equally across all active clients
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
        const accts = allActiveAccts.filter(a => a.sl === sl.id);
        const rev = accts.reduce((s, a) => s + a.retainer + a.project, 0);
        const directCost = members.reduce((s, p) => s + cost(p), 0);
        const overheadAlloc = overheadPerClient * accts.length;
        const c = directCost + overheadAlloc;
        return { ...sl, members, accounts: accts, rev, cost: c, directCost, overheadAlloc, margin: rev - c, marginPct: rev > 0 ? (rev - c) / rev : (c > 0 ? -1 : 0) };
      })
      .filter(p => p.members.length > 0 || p.accounts.length > 0);
  }, [team, accounts]);

  const totals = useMemo(() => {
    const r = pods.reduce((s, p) => s + p.rev, 0);
    const c = team.reduce((s, p) => s + cost(p), 0);
    return { rev: r, cost: c, margin: r - c, pct: r > 0 ? (r - c) / r : 0, heads: team.length, active: accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status)).length };
  }, [pods, team, accounts]);

  const save = async (type, d) => {
    setSaveError(null);
    if (type === "person") {
      if (!d.id) { d = { ...d, id: `t${nid}` }; setNid(n => n + 1); }
      setTeam(t => d.id && t.find(x => x.id === d.id) ? t.map(x => x.id === d.id ? d : x) : [...t, d]);
      try { await upsertTeamMember(d); } catch (e: any) {
        console.error("Save person failed:", e);
        setSaveError(`Save failed: ${e?.message || "Supabase error"}`);
      }
    } else {
      if (!d.id) { d = { ...d, id: `a${nid}` }; setNid(n => n + 1); }
      setAccounts(a => d.id && a.find(x => x.id === d.id) ? a.map(x => x.id === d.id ? d : x) : [...a, d]);
      try { await upsertAccount(d); } catch (e: any) {
        console.error("Save account failed:", e);
        setSaveError(`Save failed: ${e?.message || "Supabase error"}`);
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

  const getName = id => team.find(p => p.id === id)?.name || "—";
  const slOpts = SERVICE_LINES.map(s => ({ value: s.id, label: s.name }));
  const teamOpts = team.map(p => ({ value: p.id, label: p.name }));

  const views = [
    { id: "workload", label: "Workload" },
    { id: "org", label: "Org Chart" },
    { id: "team", label: "Team" },
    { id: "accounts", label: "Accounts" },
    { id: "pnl", label: "P&L" },
  ];

  const personPods = useMemo(() => team.filter(p => p.sl !== "ops").map(p => {
    const led = accounts.filter(a => a.leadId === p.id);
    const sup = accounts.filter(a => a.supportIds.includes(p.id));
    const exp = personExposure(p.id, accounts);
    const c = cost(p);
    return { ...p, ledAccounts: led, supAccounts: sup, leadRev: exp.asLead, supRev: exp.asSupport, rev: exp.total, cost: c, ratio: c > 0 ? exp.total / c : 0 };
  }), [team, accounts]);

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
          <span>⚠️ {saveError} — this change won't persist on refresh.</span>
          <button onClick={() => setSaveError(null)} className="ml-4 underline opacity-80 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Nav */}
      <div className="border-b border-gray-200 px-8 py-3 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-6">
          <span className="text-base font-semibold text-gray-900 tracking-tight">Interlude</span>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex gap-1">
            {views.map(v => (
              <button key={v.id} onClick={() => { setView(v.id); setSelected(null); }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${view === v.id ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex gap-4 items-center">
            <div className="text-xs"><span className="text-gray-400">Rev </span><span className="font-semibold text-emerald-600">{fmtK(totals.rev)}</span></div>
            <div className="text-xs"><span className="text-gray-400">Cost </span><span className="font-semibold text-red-500">{fmtK(totals.cost)}</span></div>
            <div className="text-xs"><span className="text-gray-400">Margin </span><span className={`font-semibold ${totals.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtK(totals.margin)} ({pct(totals.pct)})</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: "person", data: { name: "", role: "", sl: "", type: "Full-Time", cadY: null, usdM: null, hrs: 160, lead: false } })}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors">+ Person</button>
          <button onClick={() => setModal({ type: "account", data: { name: "", sl: "", leadId: null, supportIds: [], status: "Active", type: "Retainer", retainer: 0, project: 0, notes: "" } })}
            className="bg-gray-900 rounded-lg px-4 py-2 text-white text-[11px] font-semibold hover:bg-gray-800 transition-colors">+ Account</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">

          {/* ══════════ WORKLOAD VIEW ══════════ */}
          {view === "workload" && (
            <div className="p-8 pb-12">
              <div className="text-2xl font-semibold text-gray-900 mb-1">Workload</div>
              <div className="text-xs text-gray-400 mb-7">Each card is one person — their assigned accounts and the revenue they drive.</div>

              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {personPods.filter(p => p.sl !== "leadership").map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="h-0.5 bg-gray-200" />
                    <div className="px-4 pt-4 pb-3">
                      {/* Person header */}
                      <div className="flex items-center gap-2.5 mb-1 cursor-pointer" onClick={() => setSelected({ type: "person", data: p })}>
                        <Av name={p.name} size={36} sl={p.sl} lead={p.lead} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{p.role}</div>
                        </div>
                        <SlTag sl={p.sl} small />
                      </div>

                      {/* Revenue + cost summary */}
                      <div className="flex mt-3 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        <div className="flex-1 text-center py-2.5 px-2">
                          <div className="text-[8px] font-semibold tracking-wider uppercase text-gray-400">Exposure</div>
                          <div className={`text-base font-medium mt-0.5 ${p.rev > 0 ? "text-emerald-600" : "text-gray-300"}`}>{p.rev > 0 ? fmtK(p.rev) : "—"}</div>
                          {p.supRev > 0 && <div className="text-[9px] text-gray-400 mt-0.5">{fmtK(p.leadRev)} lead · {fmtK(p.supRev)} sup</div>}
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1 text-center py-2.5 px-2">
                          <div className="text-[8px] font-semibold tracking-wider uppercase text-gray-400">Cost</div>
                          <div className="text-base font-medium text-gray-900 mt-0.5">{fmtK(p.cost)}</div>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1 text-center py-2.5 px-2">
                          <div className="text-[8px] font-semibold tracking-wider uppercase text-gray-400">Ratio</div>
                          <div className={`text-base font-semibold mt-0.5 ${p.ratio >= 1 ? "text-emerald-600" : p.ratio > 0 ? "text-amber-500" : "text-gray-300"}`}>{p.rev > 0 ? `${p.ratio.toFixed(1)}x` : "—"}</div>
                        </div>
                      </div>

                      {/* Accounts list */}
                      <div className="border-t border-gray-100 pt-2.5 mt-3">
                        {p.ledAccounts.length === 0 && p.supAccounts.length === 0 ? (
                          <div className="text-[11px] text-gray-300 italic text-center py-2">No accounts assigned</div>
                        ) : (<>
                          {p.ledAccounts.map(a => (
                            <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg mb-1 bg-gray-50 cursor-pointer border border-gray-100 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${a.status === "Growth" ? "bg-emerald-500" : "bg-blue-400"}`} />
                                <span className="text-xs font-medium text-gray-900">{a.name}</span>
                                <Tag small variant="green">Lead</Tag>
                              </div>
                              <span className="text-xs font-semibold text-emerald-600">{fmt(Math.round(leadShare(a)))}</span>
                            </div>
                          ))}
                          {p.supAccounts.map(a => (
                            <div key={a.id} onClick={() => setSelected({ type: "account", data: a })} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                <span className="text-xs text-gray-500">{a.name}</span>
                                <Tag small>Support</Tag>
                              </div>
                              <span className="text-[11px] text-gray-400">{fmt(Math.round(supShare(a)))}</span>
                            </div>
                          ))}
                        </>)}
                      </div>
                    </div>
                  </div>
                ))}
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
                          <SlTag sl={a.sl} small />
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

            if (acctView === "pods") return (
              <div className="p-8 pb-12">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900 mb-1">Accounts</div>
                    <div className="text-xs text-gray-400">Each card is one client — their lead, support, and monthly value.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAcctView("list")} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">List</button>
                    <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white">Pods</button>
                  </div>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status)).map(a => {
                    const lead = team.find(p => p.id === a.leadId);
                    const sups = team.filter(p => a.supportIds.includes(p.id));
                    const mrr = acctVal(a);
                    const live = isProjectLive(a);
                    const hasDates = a.startDate && a.endDate;
                    const slColor = SL[a.sl]?.color || "bg-gray-100 text-gray-600";
                    return (
                      <div key={a.id} onClick={() => setSelected({ type: "account", data: a })}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer">
                        {/* Colour bar from service line */}
                        <div className={`h-1 ${slColor.split(" ")[0]}`} />
                        <div className="px-4 pt-4 pb-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                {a.name}
                                {(a.type === "Project" || a.type === "Hybrid") && !hasDates && (
                                  <span title="Missing dates" className="text-amber-500 text-[10px]">⚠</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <SlTag sl={a.sl} small />
                                <StatusTag status={a.status} small />
                                {a.type !== "Retainer" && <span className="text-[9px] font-semibold px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full">{a.type}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-base font-semibold text-emerald-600">{fmtK(mrr)}</div>
                              <div className="text-[9px] text-gray-400">/mo</div>
                            </div>
                          </div>

                          {/* Project date bar */}
                          {(a.type === "Project" || a.type === "Hybrid") && hasDates && (
                            <div className={`flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${live ? "bg-violet-50 text-violet-600" : "bg-gray-50 text-gray-400"}`}>
                              <span>{fmtDate(a.startDate!)} → {fmtDate(a.endDate!)}</span>
                              {!live && <span className="text-[9px]">· ended</span>}
                            </div>
                          )}

                          {/* Divider */}
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
            <div className="grid overflow-auto" style={{ gridTemplateColumns: "1.5fr 1fr 1.5fr 1.2fr 0.8fr 1fr 1.4fr 1fr 2fr" }}>
              <div className="col-span-9 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
                <span className="text-xs font-semibold text-gray-900">All Accounts</span>
                <div className="flex items-center gap-2">
                  <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">Pods</button>
                  <button onClick={() => setAcctView("pods")} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white">List</button>
                </div>
              </div>
              {["Account", "Service Line", "Lead", "Support", "Status", "Retainer", "Flat Fee", "MRR", "Scope"].map(h => (
                <div key={h} className="px-3 py-2 bg-gray-100 text-[9px] font-semibold tracking-wider uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10">{h}</div>
              ))}
              {accounts.map((a, i) => {
                const bg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                const mpr = monthlyProjectRev(a);
                const live = isProjectLive(a);
                const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "";
                return (
                  <div key={a.id} className="contents cursor-pointer" onClick={() => setSelected({ type: "account", data: a })}>
                    <div className={`px-3 py-2 text-xs font-semibold border-b border-gray-100 flex items-center gap-1.5 ${bg}`}>
                      {a.name}
                      {(a.type === "Project" || a.type === "Hybrid") && (!a.startDate || !a.endDate) && (
                        <span title="Missing start/end dates — revenue not tracked in MRR" className="text-amber-500 text-[10px]">⚠</span>
                      )}
                    </div>
                    <div className={`px-3 py-2 border-b border-gray-100 ${bg}`}><SlTag sl={a.sl} small /></div>
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
              <div className="px-3 py-2 bg-gray-100 text-[11px] font-bold text-gray-900 border-b border-gray-200" style={{ gridColumn: "1 / 6" }}>Total ({accounts.length} accounts · {accounts.filter(a => ["Active", "Launch", "Growth"].includes(a.status)).length} active)</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(accounts.reduce((s, a) => s + a.retainer, 0))}</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(accounts.reduce((s, a) => s + a.project, 0))}</div>
              <div className="px-3 py-2 bg-gray-100 text-right text-xs font-bold text-emerald-600 border-b border-gray-200">{fmt(accounts.reduce((s, a) => s + acctVal(a), 0))}</div>
              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200" />
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
                  <KpiCard label="Monthly Cost" value={fmt(totals.cost)} sub={`${fmt(totals.cost * 12)} annualized`} color="text-red-500" />
                  <KpiCard label="Monthly Margin" value={fmt(totals.margin)} sub={`${pct(totals.pct)} margin`} color={totals.margin >= 0 ? "text-emerald-600" : "text-red-500"} />
                  <KpiCard label="Headcount" value={totals.heads} sub={`${totals.active} active accounts`} />
                  <KpiCard label="Revenue / Head" value={fmt(Math.round(totals.rev / (totals.heads || 1)))} sub="per person per month" color="text-gray-600" />
                </div>
              </div>

              <div className="h-px bg-gray-200 w-full" />

              {/* Pod P&L Table */}
              <div className="mt-8 mb-9">
                <div className="text-xl font-semibold text-gray-900 mb-5">Pod P&L</div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid px-5 py-3 bg-gray-100" style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 1fr 2fr" }}>
                    {["Service Line", "People", "Revenue", "Cost", "Margin", "Margin %", "Health"].map(h => (
                      <div key={h} className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">{h}</div>
                    ))}
                  </div>
                  {pods.map(pd => (
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
                  {team.filter(p => p.sl !== "leadership" && p.sl !== "ops").map(p => {
                    const c = cost(p);
                    const exp = personExposure(p.id, accounts);
                    const leadRev = exp.asLead;
                    const supRev = exp.asSupport;
                    const totalExp = exp.total;
                    const ratio = c > 0 ? totalExp / c : 0;
                    const acctCount = accounts.filter(a => a.leadId === p.id).length;
                    const supCount = accounts.filter(a => a.supportIds.includes(p.id)).length;
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
        <Sidebar selected={selected} team={team} accounts={accounts} onClose={() => setSelected(null)} onEdit={(type, data) => setModal({ type, data })} />
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
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Service Line" value={modal.data.sl} onChange={v => setModal({ ...modal, data: { ...modal.data, sl: v } })} opts={slOpts} />
              <Inp label="Status" value={modal.data.status} onChange={v => setModal({ ...modal, data: { ...modal.data, status: v } })} opts={["Launch", "Growth", "Active", "Pipeline", "Paused", "Closed"]} />
            </div>
            <Inp label="Account Lead" value={modal.data.leadId} onChange={v => setModal({ ...modal, data: { ...modal.data, leadId: v } })} opts={teamOpts} />
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
