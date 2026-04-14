import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${BACKEND_URL}/providers/appointments${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(buildAuthHeaders(request) ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}


