import { NextResponse, type NextRequest } from "next/server";

/**
 * There is no sign-in because the app is meant to be reachable from this computer only.
 * Three checks make that hold even when another page on this computer, or on the web, tries a trick:
 *
 * 1. The Host header must be localhost, 127.0.0.1 or [::1] (blocks DNS rebinding).
 * 2. A write (anything but GET or HEAD) must come from this app's own origin: same scheme, host and
 *    port. A page on another localhost port, such as a dev server, counts as another origin. A write
 *    with no Origin header is allowed only when the browser says Sec-Fetch-Site: same-origin, or when
 *    the caller is a command-line tool that sets Origin itself (npm run sync does).
 * 3. API writes must be JSON. A web page can't send a JSON write to another origin without a CORS
 *    preflight, and the app answers no preflight, because it sends no CORS headers at all.
 */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const refuse = (why: string, status = 403) => new NextResponse(why, { status });

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!LOCAL_HOST.test(host)) return refuse("This app only answers on localhost.");

  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      let o: URL;
      try {
        o = new URL(origin);
      } catch {
        return refuse("Blocked: unreadable Origin.");
      }
      if (o.host !== host || o.protocol !== req.nextUrl.protocol) return refuse("Blocked: request came from a different origin.");
    } else if (req.headers.get("sec-fetch-site") !== "same-origin") {
      return refuse("Blocked: this write doesn't say where it came from.");
    }

    if (req.nextUrl.pathname.startsWith("/api/") && !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return refuse("API writes must be JSON.", 415);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico).*)"] };
