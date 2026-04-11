import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://proxima-health-backend.onrender.com/api";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith("/api/")) {
    const isPublicFile = /\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml|json|webmanifest)$/i.test(
      pathname
    );
    const isAsset = pathname.startsWith("/_next") || isPublicFile;
    const isAuthRoute =
      pathname === "/" ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/verify") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/under-review") ||
      pathname.startsWith("/complete-profile");
    const hasToken = Boolean(request.cookies.get("token")?.value);

    if (!isAsset && !isAuthRoute && !hasToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const target = new URL(BACKEND_URL);
  const suffix = pathname.replace(/^\/api/, "");
  target.pathname = `${target.pathname.replace(/\/$/, "")}${suffix}`;
  target.search = search;

  return NextResponse.rewrite(target);
}

export const config = {
  matcher: "/:path*",
};

