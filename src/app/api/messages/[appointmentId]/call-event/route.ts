import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://proxima-health-backend.onrender.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const response = await fetch(
    `${BACKEND_URL}/providers/messages/${appointmentId}/call-event`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(buildAuthHeaders(request) ?? {}),
      },
      body: JSON.stringify(body ?? {}),
    }
  );

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}


