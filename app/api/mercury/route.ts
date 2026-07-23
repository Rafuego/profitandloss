// Mercury invoicing sync — SERVER-SIDE ONLY.
// The Mercury API token is a banking credential: it lives in the
// MERCURY_API_TOKEN env var (set in Vercel), is read here on the server, and is
// NEVER sent to the browser. Use a READ-ONLY Mercury token — this route only
// ever issues GETs; it can never move money.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // always fresh, never statically cached
export const runtime = "nodejs";

const BASE = "https://api.mercury.com/api/v1";

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

// Mercury list endpoints wrap results in a keyed array; be robust to the key.
function pickArray(obj: any, keys: string[]): any[] {
  if (Array.isArray(obj)) return obj;
  for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k];
  if (obj && typeof obj === "object") {
    const firstArr = Object.values(obj).find(Array.isArray);
    if (firstArr) return firstArr as any[];
  }
  return [];
}

export async function GET() {
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) return NextResponse.json({ connected: false });

  try {
    const [custRaw, invRaw] = await Promise.all([
      mget("/ar/customers?limit=500", token),
      mget("/ar/invoices?limit=500", token),
    ]);

    const custName: Record<string, string> = {};
    for (const c of pickArray(custRaw, ["customers", "items", "data"])) {
      if (c?.id) custName[c.id] = c.name || c.companyName || c.email || c.id;
    }

    const invoices = pickArray(invRaw, ["invoices", "items", "data"]).map((i: any) => ({
      id: i.id ?? i.slug ?? null,
      number: i.invoiceNumber ?? null,
      customer: (i.customerId && custName[i.customerId]) || i.customerName || i.customerId || "—",
      amount: Number(i.amount ?? 0),
      status: i.status ?? "Unknown", // Unpaid | Processing | Paid | Cancelled
      dueDate: i.dueDate ?? null,
      paidAt: i.paidAt ?? i.paidDate ?? null,
      slug: i.slug ?? null,
    }));

    const inFlight = invoices.filter((i: any) => i.status === "Unpaid" || i.status === "Processing");
    const paid = invoices.filter((i: any) => i.status === "Paid");
    const sum = (arr: any[]) => arr.reduce((s, i) => s + (i.amount || 0), 0);

    return NextResponse.json({
      connected: true,
      fetchedAt: new Date().toISOString(),
      counts: { total: invoices.length, inFlight: inFlight.length, paid: paid.length },
      totals: { inFlight: sum(inFlight), paid: sum(paid) },
      invoices,
    });
  } catch (e: any) {
    // Token present but the call failed (bad/expired token, network, etc.)
    return NextResponse.json({ connected: true, error: e?.message || "Mercury request failed" });
  }
}
