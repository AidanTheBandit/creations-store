import { boho } from "@/lib/boho";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default function middleware(req: any) {
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
