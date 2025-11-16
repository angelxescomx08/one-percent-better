import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/server/better-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const startPathPrivateRoutes = "/panel";

  if (!pathname.startsWith(startPathPrivateRoutes)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Middleware corre en TODAS las rutas
export const config = {
  matcher: [
    /*
     * Match all request paths except for files with a file extension (e.g., .js, .css, .png)
     * and the _next directory (Next.js internals).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
