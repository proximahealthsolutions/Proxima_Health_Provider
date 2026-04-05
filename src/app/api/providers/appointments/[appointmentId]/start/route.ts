import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://proxima-health-backend.onrender.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

type RouteContext = {
  params: Promise<{ appointmentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { appointmentId } = await context.params;
  const response = await fetch(
    `${BACKEND_URL}/providers/appointments/${appointmentId}/start`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(buildAuthHeaders(request) ?? {}),
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}


