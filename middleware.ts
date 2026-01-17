import { boho } from "@/lib/boho";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default function middleware(req: any) {
  // CVE-2025-29927: Reject middleware bypass attempts via x-middleware-subrequest header
  const middlewareSubrequest = req.headers.get("x-middleware-subrequest");
  if (middlewareSubrequest === "middleware-request") {
    // Legitimate middleware subrequests will have this set by Next.js internally
    // but we should verify the request is coming from an internal source
    const forwarded = req.headers.get("x-forwarded-host");
    const host = req.headers.get("host");

    // If the subrequest header is present but forwarded headers don't match,
    // it's likely a bypass attempt
    if (forwarded && forwarded !== host) {
      return new NextResponse("Invalid request", { status: 400 });
    }
  }

  const { pathname } = req.nextUrl;

  // Admin routes use bohoauth
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return boho.middleware(req);
  }

  // User routes use NextAuth
  if (pathname.startsWith("/dashboard")) {
    return withAuth({
      callbacks: {
        authorized: ({ token }) => !!token,
      },
      pages: {
        signIn: "/auth/login",
      },
    })(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/admin/:path*"],
};
