import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const response = await fetch(
    `${BACKEND_URL}/providers/schedule/date-slots${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(buildAuthHeaders(request) ?? {}),
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const response = await fetch(`${BACKEND_URL}/providers/schedule/date-slots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(buildAuthHeaders(request) ?? {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
