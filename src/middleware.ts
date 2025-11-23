import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const startPathPrivateRoutes = "/panel";
  const publicRoutes = ["/", "/register"];

  const cookie = req.cookies.get("better-auth.session_token");

  if (
    (!cookie || !cookie.value) &&
    pathname.startsWith(startPathPrivateRoutes)
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (cookie?.value && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/panel", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for files with a file extension (e.g., .js, .css, .png)
     * and the _next directory (Next.js internals).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
