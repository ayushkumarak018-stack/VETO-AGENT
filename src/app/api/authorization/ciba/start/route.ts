import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { CibaAuthorizationService } from "@/services/ciba.service";

/**
 * Standard CIBA Backchannel Authentication Request endpoint
 * Returns auth_req_id, expires_in, and polling interval
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized_client" }, { status: 401 });
  }

  const body = await req.json();
  const { actionType, actionPayload, actionDescription, riskLevel = "HIGH", provider = "google_calendar" } = body;

  if (!actionType || !actionPayload) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing actionType or actionPayload" },
      { status: 400 }
    );
  }

  const result = await CibaAuthorizationService.initiateAuthorization({
    userId: user.id,
    userEmail: user.email,
    provider,
    actionType,
    actionDescription: actionDescription || `Execute ${actionType}`,
    actionPayload,
    riskLevel,
  });

  return NextResponse.json({
    auth_req_id: result.authReqId,
    expires_in: result.expiresIn,
    interval: result.interval,
    approval_url: result.approvalUrl,
  });
}
