// Ignition → Zapier → Tracker webhook: creates an account the moment a deal
// closes, instead of waiting for the next scheduled sync. Zapier POSTs here
// (same Zap that posts "NEW ACCOUNT WON" to #12-closed-won) with the deal
// name + value and a shared secret in the x-webhook-secret header.
//
// Conservative by design, mirroring the Data Sync Rules in CLAUDE.md:
//   - only ever CREATES accounts; an existing name match is skipped untouched
//     (re-signs like Anti Entropy/Superintelligence must not make duplicates)
//   - "Symphony" in the deal name = retainer, value is ANNUAL → ÷12
//   - $0 value = Zapier glitch → create at $0 with a FEE TBD note
//   - signed_date = today (drives the dashboard's "Signed in <month>")
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// "Substrate — Brand + Digital (LP)" → client "Substrate", scope "Brand + Digital (LP)"
const splitName = (full: string) => {
  const m = full.split(/\s+[—–-]\s+/);
  return { client: (m[0] || full).trim(), scope: m.slice(1).join(" — ").trim() };
};

const todayNY = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD

export async function POST(req: Request) {
  const secret = (process.env.IGNITION_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "webhook not configured" }, { status: 503 });
  }
  if ((req.headers.get("x-webhook-secret") || "").trim() !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const fullName = String(body.name ?? body.Name ?? body.deal_name ?? "").trim();
  if (!fullName) {
    return NextResponse.json({ ok: false, error: "missing deal name" }, { status: 400 });
  }
  const value = num(body.value ?? body.Value ?? body.amount);
  const proposal = String(body.proposal_url ?? body.link ?? "").trim();

  const { client, scope } = splitName(fullName);
  const isRetainer = /symphony/i.test(fullName);

  // Never create a duplicate: any account whose name matches the client (or the
  // full deal name) means this is a re-sign, scope change, or existing client —
  // the 2-hourly sync and Rafay decide those, not the webhook.
  const { data: existing, error: lookupErr } = await supabase
    .from("accounts")
    .select("id,name,signed_date")
    .or(`name.ilike.%${client.replace(/[%,()]/g, "")}%`);
  if (lookupErr) {
    return NextResponse.json({ ok: false, error: lookupErr.message }, { status: 500 });
  }
  if (existing && existing.length) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `matches existing account "${existing[0].name}" — left untouched for the scheduled sync to review`,
    });
  }

  const signed = todayNY();
  const noteBits = [
    scope ? `${scope},` : "",
    isRetainer
      ? `$${Math.round(value / 12).toLocaleString()}/mo retainer ($${value.toLocaleString()}/yr).`
      : value > 0
        ? `$${value.toLocaleString()} flat.`
        : "FEE TBD (Zapier sent $0 — check the win thread).",
    `Signed via Ignition ${signed} (auto-created by webhook).`,
    "Dates/lead/PM TBD.",
    proposal ? `Proposal: ${proposal}` : "",
  ].filter(Boolean);

  const row = {
    id: crypto.randomUUID(),
    name: client,
    type: isRetainer ? "Retainer" : "Project",
    status: "Active",
    retainer: isRetainer ? Math.round(value / 12) : 0,
    project: isRetainer ? 0 : value,
    weight: 3,
    signed_date: signed,
    notes: noteBits.join(" "),
  };

  const { error: insertErr } = await supabase.from("accounts").insert(row);
  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: row.name, type: row.type, signed_date: signed });
}
