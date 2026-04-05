import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://proxima-health-backend.onrender.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

export async function GET(request: Request) {
  const response = await fetch(`${BACKEND_URL}/providers/prescriptions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(buildAuthHeaders(request) ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await fetch(`${BACKEND_URL}/providers/prescriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(buildAuthHeaders(request) ?? {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}


