import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";
export const runtime = "nodejs";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  return {
    ...(auth ? { Authorization: auth } : {}),
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export async function POST(request: Request) {
  const init = {
    method: "POST",
    headers: buildAuthHeaders(request),
    body: request.body,
    duplex: "half" as const,
  } as RequestInit & { duplex: "half" };

  const response = await fetch(`${BACKEND_URL}/providers/me/profile-image`, {
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
