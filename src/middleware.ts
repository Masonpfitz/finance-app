import { NextResponse, type NextRequest } from "next/server";

/**
 * There is no sign-in because the app is meant to be reachable from this computer only.
 * This makes that true even if something tries a trick: it refuses any request whose Host
 * is not localhost (blocks DNS-rebinding), and refuses writes that come from another website.
 */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!LOCAL.test(host)) return new NextResponse("This app only answers on localhost.", { status: 403 });
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (!LOCAL.test(new URL(origin).host)) return new NextResponse("Blocked: request came from another website.", { status: 403 });
      } catch {
        return new NextResponse("Blocked.", { status: 403 });
      }
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico).*)"] };
