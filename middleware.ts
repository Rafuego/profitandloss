// Password gate for the whole app (pages + API routes) via HTTP Basic Auth.
// Set APP_PASSWORD in Vercel env to turn it on; when unset (e.g. local dev),
// the gate is open. The browser shows its native sign-in prompt once and
// remembers the credential for the session. Username is ignored — only the
// password matters, so the team shares one secret.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const expected = (process.env.APP_PASSWORD || "").trim();
  if (!expected) return NextResponse.next();

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const [, pass = ""] = atob(header.slice(6)).split(":");
      if (pass === expected) return NextResponse.next();
    } catch { /* malformed header → fall through to 401 */ }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Interlude Tracker"' },
  });
}

// Everything except Next.js internals and static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
