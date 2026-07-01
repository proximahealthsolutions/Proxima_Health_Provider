import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";
const REQUIRED_ROLE = "PROVIDER";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function getTokenRole(token?: string) {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const parsed = JSON.parse(decodeBase64Url(payload));
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

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
      pathname.startsWith("/complete-profile") ||
      pathname.startsWith("/otp-login");
    const token = request.cookies.get("token")?.value;
    const hasToken = Boolean(token);
    const role = getTokenRole(token);

    if (!isAsset && !isAuthRoute && !hasToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!isAsset && !isAuthRoute && hasToken && role !== REQUIRED_ROLE) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      const response = NextResponse.redirect(url);
      response.cookies.set("token", "", { path: "/", maxAge: 0 });
      return response;
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


