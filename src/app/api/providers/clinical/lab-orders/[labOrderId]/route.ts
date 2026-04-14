import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

function buildAuthHeaders(request: Request) {
  const auth = request.headers.get("authorization");
  return auth ? { Authorization: auth } : undefined;
}

type RouteContext = {
  params: Promise<{ labOrderId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { labOrderId } = await context.params;
  const body = await request.text();
  const response = await fetch(`${BACKEND_URL}/providers/clinical/lab-orders/${labOrderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(buildAuthHeaders(request) ?? {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}


