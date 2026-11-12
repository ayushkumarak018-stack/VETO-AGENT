import { NextRequest, NextResponse } from "next/server";
import { CibaAuthorizationService } from "@/services/ciba.service";

/**
 * Standard CIBA Token Polling Endpoint
 * Responds with authorization_pending, slow_down, access_denied, or approved token
 */
export async function POST(req: NextRequest) {
  let authReqId: string | undefined;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    authReqId = formData.get("auth_req_id") as string;
  } else {
    const body = await req.json().catch(() => ({}));
    authReqId = body.auth_req_id;
  }

  if (!authReqId) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing auth_req_id" },
      { status: 400 }
    );
  }

  const poll = await CibaAuthorizationService.pollCibaStatus(authReqId);

  if (poll.status === "authorization_pending") {
    return NextResponse.json(
      {
        error: "authorization_pending",
        error_description: "The end-user authorization is still pending.",
      },
      { status: 400 }
    );
  }

  if (poll.status === "rejected") {
    return NextResponse.json(
      {
        error: "access_denied",
        error_description: "The end-user rejected the authorization request (VETO).",
      },
      { status: 403 }
    );
  }

  if (poll.status === "expired") {
    return NextResponse.json(
      {
        error: "expired_token",
        error_description: "The auth_req_id has expired.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: "approved",
    auth_req_id: authReqId,
    token_type: "Bearer",
    scope: "ciba:approved",
  });
}
