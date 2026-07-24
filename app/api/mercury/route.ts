// Mercury invoicing sync — SERVER-SIDE ONLY.
// The Mercury API token is a banking credential: it lives in the
// MERCURY_API_TOKEN env var (set in Vercel), is read here on the server, and is
// NEVER sent to the browser. Use a READ-ONLY Mercury token — this route only
// ever issues GETs; it can never move money.
import { NextResponse } from "next/server";

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
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) return NextResponse.json({ connected: false });

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
        if (norm.status === "Unpaid" || norm.status === "Processing") {
          inFlight.push(norm); inFlightTotal += norm.amount;
        } else if (norm.status === "Paid") {
          paidCount++; paidTotal += norm.amount;
          if (recentPaid.length < RECENT_PAID) recentPaid.push(norm);
        } else if (norm.status === "Cancelled") {
          cancelled++;
        }
      }
      cursor = res.page?.nextPage ?? null;
      if (!cursor) break;
      if (p === MAX_PAGES - 1) truncated = true;
    }

    return NextResponse.json({
      connected: true,
      fetchedAt: new Date().toISOString(),
      counts: { total, inFlight: inFlight.length, paid: paidCount, cancelled },
      totals: { inFlight: inFlightTotal, paid: paidTotal },
      // table data: every in-flight invoice + the most recent paid ones
      invoices: [...inFlight, ...recentPaid],
      recentPaidShown: recentPaid.length,
      truncated,
    });
  } catch (e: any) {
    return NextResponse.json({ connected: true, error: e?.message || "Mercury request failed" });
  }
}
