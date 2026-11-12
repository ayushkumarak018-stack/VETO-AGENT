import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { CibaAuthorizationService } from "@/services/ciba.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getSessionUser(req);

  let body: { token?: string; reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const { searchParams } = new URL(req.url);
  const token = body.token || searchParams.get("token") || undefined;
  const reason = body.reason || "Vetoed by user via out-of-band authorization.";

  try {
    const result = await CibaAuthorizationService.rejectRequest({
      cibaRequestId: id.startsWith("ciba_req_") ? id : undefined,
      authorizationRequestId: !id.startsWith("ciba_req_") ? id : undefined,
      token,
      actorUserId: user?.id,
      reason,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

