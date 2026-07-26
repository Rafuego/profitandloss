// Mercury invoicing sync — SERVER-SIDE ONLY.
// The Mercury API token is a banking credential: it lives in the
// MERCURY_API_TOKEN env var (set in Vercel), is read here on the server, and is
// NEVER sent to the browser. Use a READ-ONLY Mercury token — this route only
// ever issues GETs; it can never move money.
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic"; // always fresh, never statically cached
export const runtime = "nodejs";

const BASE = "https://api.mercury.com/api/v1";
const PAGE = 500;      // Mercury's max page size
const MAX_PAGES = 8;   // safety cap: 4000 invoices, newest-first
const RECENT_PAID = 40; // how many paid invoices to send to the client for the table

async function mget(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercury ${res.status} on ${path}${body ? ` — ${body.slice(0, 160)}` : ""}`);
  }
  return res.json();
}

export async function GET() {
  const token = (process.env.MERCURY_API_TOKEN || "").trim();
  if (!token) return NextResponse.json({ connected: false });

  // Guard against a token that was copied from an abbreviated display (e.g. one
  // containing "…") — non-Latin1 chars can't go in an HTTP header and produce a
  // cryptic ByteString error. Give a clear message instead.
  if (/[^\x00-\xFF]/.test(token)) {
    return NextResponse.json({
      connected: true,
      error: "The token contains invalid characters (e.g. a “…” ellipsis). It looks like an abbreviated copy — paste the FULL token, starting with 'secret-token:' and ending in '_yrucrem', with no '…'.",
    });
  }
  if (!token.startsWith("secret-token:")) {
    return NextResponse.json({
      connected: true,
      error: "The token is missing the 'secret-token:' prefix. Paste the full token including that prefix.",
    });
  }

  try {
    // Customers (188-ish) → resolve customerId to a client name
    const custRes = await mget("/ar/customers?limit=500", token);
    const custName: Record<string, string> = {};
    for (const c of custRes.customers ?? []) {
      if (c?.id) custName[c.id] = c.name || c.email || c.id;
    }

    // Paginate invoices newest-first so current unpaid/processing surface first
    const inFlight: any[] = [];
    const recentPaid: any[] = [];
    let paidCount = 0, paidTotal = 0, inFlightTotal = 0, total = 0, cancelled = 0;
    let cursor: string | null = null, truncated = false;

    // Per-client payment rollup (keyed by normalized name) — the tracker matches
    // accounts to this to show a paid/owed/overdue status per account.
    const nkey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    // Mercury customer name → tracker account name (same client, different spelling)
    const ALIAS: Record<string, string> = {
      highriseai: "highrise",
      lumenenergy: "lumen",
      portalsystemsspace: "portalspace",
      roundbarnlabs: "rbl",
      atlasroad: "atlasrd",
      inferenceresearchincblairai: "inferencehealth",
      giantstep: "giantstepvc",
      "1921ai": "1921",
      atriavc: "atria",
      neruhealth: "neruhealth",
    };
    const akey = (s: string) => { const k = nkey(s); return ALIAS[k] || k; };
    const today = new Date().toISOString().slice(0, 10);
    const byCustomer: Record<string, any> = {};
    const paidByMonth: Record<string, any> = {}; // "YYYY-MM" -> { total, count }
    const bump = (name: string, inv: any) => {
      const k = akey(name);
      if (!k) return;
      const b = byCustomer[k] || (byCustomer[k] = { name, outstanding: 0, overdue: 0, oldestDue: null, paid: 0, lastPaid: null, unpaid: 0, total: 0 });
      b.total++;
      if (inv.status === "Unpaid" || inv.status === "Processing") {
        b.outstanding += inv.amount; b.unpaid++;
        if (inv.dueDate && inv.dueDate < today) {
          b.overdue += inv.amount;
          if (!b.oldestDue || inv.dueDate < b.oldestDue) b.oldestDue = inv.dueDate;
        }
      } else if (inv.status === "Paid") {
        b.paid += inv.amount;
        const d = inv.invoiceDate || inv.dueDate;
        if (d && (!b.lastPaid || d > b.lastPaid)) b.lastPaid = d;
      }
    };

    for (let p = 0; p < MAX_PAGES; p++) {
      const q = `/ar/invoices?limit=${PAGE}&order=desc${cursor ? `&start_after=${cursor}` : ""}`;
      const res = await mget(q, token);
      const batch = res.invoices ?? [];
      for (const i of batch) {
        total++;
        const norm = {
          id: i.id ?? i.slug ?? null,
          number: i.invoiceNumber ?? null,
          customer: (i.customerId && custName[i.customerId]) || i.customerId || "—",
          amount: Number(i.amount ?? 0),
          status: i.status ?? "Unknown", // Unpaid | Processing | Paid | Cancelled
          dueDate: i.dueDate ?? null,
          invoiceDate: i.invoiceDate ?? null,
          slug: i.slug ?? null,
        };
        bump(norm.customer, norm);
        if (norm.status === "Unpaid" || norm.status === "Processing") {
          inFlight.push(norm); inFlightTotal += norm.amount;
        } else if (norm.status === "Paid") {
          paidCount++; paidTotal += norm.amount;
          const m = (norm.invoiceDate || norm.dueDate || "").slice(0, 7); // YYYY-MM
          if (m) {
            const pm = paidByMonth[m] || (paidByMonth[m] = { total: 0, count: 0 });
            pm.total += norm.amount; pm.count++;
          }
          if (recentPaid.length < RECENT_PAID) recentPaid.push(norm);
        } else if (norm.status === "Cancelled") {
          cancelled++;
        }
      }
      cursor = res.page?.nextPage ?? null;
      if (!cursor) break;
      if (p === MAX_PAGES - 1) truncated = true;
    }

    const payload = {
      connected: true,
      fetchedAt: new Date().toISOString(),
      counts: { total, inFlight: inFlight.length, paid: paidCount, cancelled },
      totals: { inFlight: inFlightTotal, paid: paidTotal },
      // table data: every in-flight invoice + the most recent paid ones
      invoices: [...inFlight, ...recentPaid],
      recentPaidShown: recentPaid.length,
      byCustomer, // per-client rollup for account-level payment status
      paidByMonth, // { "YYYY-MM": { total, count } } — paid invoices by invoice month
      truncated,
    };

    // Persist as the fallback snapshot. Never let a snapshot failure break the
    // live response — the fresh data is what matters here.
    try {
      await supabase.from("mercury_snapshot").upsert({
        id: "latest", data: payload, fetched_at: payload.fetchedAt,
      });
    } catch { /* snapshot is best-effort */ }

    return NextResponse.json(payload);
  } catch (e: any) {
    const msg = e?.message || "Mercury request failed";
    // Mercury is unreachable — serve the last good sync so collections data
    // never goes blank, clearly flagged as stale.
    try {
      const { data } = await supabase
        .from("mercury_snapshot").select("data, fetched_at").eq("id", "latest").single();
      if (data?.data) {
        return NextResponse.json({
          ...data.data, stale: true, snapshotAt: data.fetched_at, error: msg,
        });
      }
    } catch { /* no snapshot yet — fall through */ }
    return NextResponse.json({ connected: true, error: msg });
  }
}
