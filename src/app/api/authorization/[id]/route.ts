import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const user = await getSessionUser(req);

  // Search by either ID or cibaRequestId
  const authReq = await prisma.authorizationRequest.findFirst({
    where: {
      OR: [{ id }, { cibaRequestId: id }],
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      agentExecution: true,
    },
  });

  if (!authReq) {
    return NextResponse.json(
      { error: "Authorization request not found" },
      { status: 404 }
    );
  }

  // Authorization check: either user is the owner, OR a valid approval nonce token is presented
  const isOwner = user && user.id === authReq.userId;
  const hasValidToken = token && authReq.approvalNonce === token;

  if (!isOwner && !hasValidToken) {
    return NextResponse.json(
      { error: "Unauthorized access to this authorization request" },
      { status: 403 }
    );
  }

  const isExpired = new Date() > authReq.expiresAt;

  return NextResponse.json({
    request: {
      id: authReq.id,
      cibaRequestId: authReq.cibaRequestId,
      provider: authReq.provider,
      actionType: authReq.actionType,
      actionDescription: authReq.actionDescription,
      actionPayload: JSON.parse(authReq.actionPayload || "{}"),
      riskLevel: authReq.riskLevel,
      status: isExpired && authReq.status === "PENDING_APPROVAL" ? "EXPIRED" : authReq.status,
      expiresAt: authReq.expiresAt,
      approvedAt: authReq.approvedAt,
      rejectedAt: authReq.rejectedAt,
      rejectionReason: authReq.rejectionReason,
      createdAt: authReq.createdAt,
      user: authReq.user,
      execution: authReq.agentExecution,
    },
  });
}
