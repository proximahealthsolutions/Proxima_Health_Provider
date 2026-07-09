import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

export async function POST(request: Request) {
  const body = await request.text();

  const response = await fetch(`${BACKEND_URL}/auth/providers/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { message: "Unable to reach signup service. Please try again later." },
      { status: 502 },
    );
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
