import { NextResponse } from "next/server";
import { buildAuthHeaders } from "../../../../_utils/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api-prod.proximahealthng.com/api";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await context.params;
  const body = await request.text();

  const response = await fetch(`${BACKEND_URL}/providers/prescriptions/change-requests/${requestId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...((await buildAuthHeaders(request)) ?? {}),
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
