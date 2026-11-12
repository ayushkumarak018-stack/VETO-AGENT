import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { CibaAuthorizationService } from "@/services/ciba.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getSessionUser(req);

  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional if session exists
  }

  const { searchParams } = new URL(req.url);
  const token = body.token || searchParams.get("token") || undefined;

  try {
    const result = await CibaAuthorizationService.approveRequest({
      cibaRequestId: id.startsWith("ciba_req_") ? id : undefined,
      authorizationRequestId: !id.startsWith("ciba_req_") ? id : undefined,
      token,
      actorUserId: user?.id,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const status = errorMsg.includes("Unauthorized")
      ? 403
      : errorMsg.includes("expired")
      ? 410
      : errorMsg.includes("not found")
      ? 404
      : 400;

    return NextResponse.json({ error: errorMsg }, { status });
  }
}

