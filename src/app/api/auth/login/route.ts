import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

