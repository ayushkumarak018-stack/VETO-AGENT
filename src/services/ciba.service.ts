import { prisma } from "@/lib/prisma";
import { generateSecureNonce } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";
import { NotificationService } from "./notification.service";
import { ExecutionWorkerService } from "./execution-worker.service";

export interface InitiateCibaParams {
  userId: string;
  userEmail: string;
  provider: string; // e.g. "google_calendar"
  actionType: string; // e.g. "create_calendar_event"
  actionDescription: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionPayload: Record<string, any>;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  expiresInSeconds?: number;
}

export interface CibaPollResponse {
  status: "authorization_pending" | "slow_down" | "approved" | "rejected" | "expired";
  authReqId: string;
  expiresIn?: number;
  interval?: number;
  error?: string;
}

export class CibaAuthorizationService {
  /**
   * STEP 4: Initiate CIBA Authorization.
   * Pauses agent execution and creates an immutable, expiring authorization request.
   */
  static async initiateAuthorization(params: InitiateCibaParams) {
    const {
      userId,
      userEmail,
      provider,
      actionType,
      actionDescription,
      actionPayload,
      riskLevel,
      expiresInSeconds = 900, // 15 minutes default
    } = params;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const authReqId = generateSecureNonce("ciba_req");
    const approvalNonce = generateSecureNonce("appr");

    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const approvalUrl = `${baseUrl}/approve/${authReqId}?token=${approvalNonce}&action=approve`;
    const rejectionUrl = `${baseUrl}/approve/${authReqId}?token=${approvalNonce}&action=reject`;

    // Create persistent AuthorizationRequest in SQLite/PostgreSQL
    const authRequest = await prisma.authorizationRequest.create({
      data: {
        userId,
        provider,
        actionType,
        actionDescription,
        actionPayload: JSON.stringify(actionPayload),
        riskLevel,
        status: "PENDING_APPROVAL",
        cibaRequestId: authReqId,
        approvalNonce,
        externalNotificationSent: true,
        notificationType: "OUT_OF_BAND_EMAIL",
        notificationRecipient: userEmail,
        expiresAt,
      },
    });

    // Create paired AgentExecution entry in PENDING_APPROVAL state
    const idempotencyKey = `exec_${authRequest.id}_${Date.now()}`;
    await prisma.agentExecution.create({
      data: {
        userId,
        authorizationRequestId: authRequest.id,
        actionType,
        executionStatus: "PENDING_APPROVAL",
        idempotencyKey,
      },
    });

    // Dispatch Out-of-Band Notification
    await NotificationService.sendOutOfBandNotification({
      userId,
      authorizationRequestId: authRequest.id,
      userEmail,
      actionSummary: actionDescription,
      actionDetails: {
        service: provider === "google_calendar" ? "Google Calendar" : provider,
        action: actionType,
        summary: actionPayload.summary,
        startTime: actionPayload.startTime,
        endTime: actionPayload.endTime,
        invitees: actionPayload.attendees,
        riskLevel,
        expiresAt,
      },
      approvalUrl,
      rejectionUrl,
    });

    await logAuditEvent({
      userId,
      action: "CIBA_AUTH_REQUEST_CREATED",
      provider,
      resourceType: "AUTHORIZATION_REQUEST",
      resourceId: authRequest.id,
      outcome: "PENDING",
      metadata: {
        cibaRequestId: authReqId,
        riskLevel,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      authReqId,
      authorizationRequestId: authRequest.id,
      approvalNonce,
      expiresIn: expiresInSeconds,
      interval: 3,
      approvalUrl,
      rejectionUrl,
    };
  }

  /**
   * STEP 6: External Approval
   * Invoked when the user clicks APPROVE on the out-of-band page or via CIBA token endpoint
   */
  static async approveRequest(params: {
    cibaRequestId?: string;
    authorizationRequestId?: string;
    token?: string;
    actorUserId?: string;
  }) {
    const { cibaRequestId, authorizationRequestId, token, actorUserId } = params;

    const request = await prisma.authorizationRequest.findFirst({
      where: {
        OR: [
          cibaRequestId ? { cibaRequestId } : undefined,
          authorizationRequestId ? { id: authorizationRequestId } : undefined,
        ].filter(Boolean) as Array<{ cibaRequestId?: string } | { id?: string }>,
      },
      include: {
        user: true,
      },
    });

    if (!request) {
      throw new Error("Authorization request not found.");
    }

    // Security Check: Token validation if out-of-band link used
    if (token && request.approvalNonce !== token) {
      await logAuditEvent({
        userId: request.userId,
        action: "REPLAY_ATTEMPT_BLOCKED",
        provider: request.provider,
        resourceType: "AUTHORIZATION_REQUEST",
        resourceId: request.id,
        outcome: "BLOCKED",
        metadata: { reason: "Invalid approval nonce" },
      });
      throw new Error("Invalid or corrupted approval token.");
    }

    // Security Check: Cross-user authorization prevention
    if (actorUserId && actorUserId !== request.userId) {
      await logAuditEvent({
        userId: actorUserId,
        action: "CROSS_USER_ACCESS_BLOCKED",
        provider: request.provider,
        resourceType: "AUTHORIZATION_REQUEST",
        resourceId: request.id,
        outcome: "BLOCKED",
        metadata: { targetUserId: request.userId },
      });
      throw new Error("Unauthorized: You cannot approve an action belonging to another user.");
    }

    // Expiration check
    if (new Date() > request.expiresAt) {
      await prisma.authorizationRequest.update({
        where: { id: request.id },
        data: { status: "EXPIRED" },
      });
      await logAuditEvent({
        userId: request.userId,
        action: "CIBA_AUTH_EXPIRED",
        provider: request.provider,
        resourceType: "AUTHORIZATION_REQUEST",
        resourceId: request.id,
        outcome: "BLOCKED",
      });
      throw new Error("This authorization request has expired. No changes were made.");
    }

    // Idempotency / Double-approval check
    if (request.status === "APPROVED") {
      return {
        alreadyProcessed: true,
        status: "APPROVED",
        message: "This request was already approved and processed.",
      };
    }

    if (request.status !== "PENDING_APPROVAL") {
      throw new Error(`Cannot approve request in status: ${request.status}`);
    }

    // Invalidate single-use nonce & mark APPROVED
    const updatedRequest = await prisma.authorizationRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: actorUserId || request.userId,
        approvalNonce: generateSecureNonce("used"), // rotate nonce so it cannot be re-used
      },
    });

    await logAuditEvent({
      userId: request.userId,
      action: "CIBA_AUTH_APPROVED",
      provider: request.provider,
      resourceType: "AUTHORIZATION_REQUEST",
      resourceId: request.id,
      outcome: "SUCCESS",
    });

    // STEP 7: Resume background execution worker
    const executionResult = await ExecutionWorkerService.resumeExecution(request.id);

    return {
      status: "APPROVED",
      authorizationRequestId: request.id,
      executionResult,
    };
  }

  /**
   * STEP 6 (Alternative): External Rejection / VETO
   */
  static async rejectRequest(params: {
    cibaRequestId?: string;
    authorizationRequestId?: string;
    token?: string;
    actorUserId?: string;
    reason?: string;
  }) {
    const { cibaRequestId, authorizationRequestId, token, actorUserId, reason } = params;

    const request = await prisma.authorizationRequest.findFirst({
      where: {
        OR: [
          cibaRequestId ? { cibaRequestId } : undefined,
          authorizationRequestId ? { id: authorizationRequestId } : undefined,
        ].filter(Boolean) as Array<{ cibaRequestId?: string } | { id?: string }>,
      },
    });

    if (!request) {
      throw new Error("Authorization request not found.");
    }

    if (token && request.approvalNonce !== token) {
      throw new Error("Invalid or corrupted rejection token.");
    }

    if (actorUserId && actorUserId !== request.userId) {
      throw new Error("Unauthorized: You cannot reject another user's request.");
    }

    if (request.status !== "PENDING_APPROVAL") {
      return {
        alreadyProcessed: true,
        status: request.status,
        message: `Request is already in '${request.status}' state.`,
      };
    }

    // Update status to REJECTED
    await prisma.authorizationRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason || "User vetoed the action via out-of-band authorization.",
        approvalNonce: generateSecureNonce("vetoed"),
      },
    });

    // Cancel execution in background worker
    await ExecutionWorkerService.cancelExecution(request.id, "User rejected authorization");

    await logAuditEvent({
      userId: request.userId,
      action: "CIBA_AUTH_REJECTED",
      provider: request.provider,
      resourceType: "AUTHORIZATION_REQUEST",
      resourceId: request.id,
      outcome: "SUCCESS",
      metadata: { reason },
    });

    return {
      status: "REJECTED",
      authorizationRequestId: request.id,
      message: "Action vetoed. No external changes will be performed.",
    };
  }

  /**
   * Polling endpoint for CIBA client polling
   */
  static async pollCibaStatus(cibaRequestId: string): Promise<CibaPollResponse> {
    const request = await prisma.authorizationRequest.findUnique({
      where: { cibaRequestId },
    });

    if (!request) {
      return {
        status: "expired",
        authReqId: cibaRequestId,
        error: "invalid_grant",
      };
    }

    if (new Date() > request.expiresAt) {
      if (request.status === "PENDING_APPROVAL") {
        await prisma.authorizationRequest.update({
          where: { id: request.id },
          data: { status: "EXPIRED" },
        });
      }
      return {
        status: "expired",
        authReqId: cibaRequestId,
        error: "expired_token",
      };
    }

    if (request.status === "PENDING_APPROVAL") {
      return {
        status: "authorization_pending",
        authReqId: cibaRequestId,
        interval: 3,
      };
    }

    if (request.status === "APPROVED") {
      return {
        status: "approved",
        authReqId: cibaRequestId,
      };
    }

    if (request.status === "REJECTED") {
      return {
        status: "rejected",
        authReqId: cibaRequestId,
        error: "access_denied",
      };
    }

    return {
      status: "expired",
      authReqId: cibaRequestId,
      error: "cancelled",
    };
  }

  /**
   * Routine to clean up expired pending requests
   */
  static async cleanupExpiredRequests() {
    const now = new Date();
    const expired = await prisma.authorizationRequest.updateMany({
      where: {
        status: "PENDING_APPROVAL",
        expiresAt: { lt: now },
      },
      data: {
        status: "EXPIRED",
      },
    });

    if (expired.count > 0) {
      await prisma.agentExecution.updateMany({
        where: {
          executionStatus: "PENDING_APPROVAL",
          authorizationRequest: {
            status: "EXPIRED",
          },
        },
        data: {
          executionStatus: "EXPIRED",
          errorMessage: "Authorization window expired without user approval.",
        },
      });
    }

    return expired.count;
  }
}

