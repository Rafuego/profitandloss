// Password gate for the whole app (pages + API routes) via HTTP Basic Auth.
// Two tiers:
//   APP_PASSWORD  — full access to every page and API route
//   PODS_PASSWORD — access to /pods ONLY (the shared single-view board);
//                   every other path answers 401 even with this password
// Unset APP_PASSWORD (e.g. local dev) leaves the gate open. The browser shows
// its native sign-in prompt once; username is ignored, only the password counts.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const expected = (process.env.APP_PASSWORD || "").trim();
  if (!expected) return NextResponse.next();

  const podsPass = (process.env.PODS_PASSWORD || "").trim();
  const path = req.nextUrl.pathname;

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const [, pass = ""] = atob(header.slice(6)).split(":");
      if (pass === expected) return NextResponse.next();
      // Pods-only password: the /pods page itself plus Next's own page assets.
      if (podsPass && pass === podsPass && (path === "/pods" || path === "/pods/" || path.startsWith("/_next"))) {
        return NextResponse.next();
      }
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
