import { prisma } from "./prisma";

export interface LogAuditParams {
  userId: string;
  action:
    | "VAULT_TOKEN_STORED"
    | "VAULT_TOKEN_RETRIEVED"
    | "VAULT_TOKEN_REFRESHED"
    | "VAULT_TOKEN_REVOKED"
    | "OAUTH_CONNECTED"
    | "OAUTH_DISCONNECTED"
    | "CIBA_AUTH_REQUEST_CREATED"
    | "CIBA_AUTH_APPROVED"
    | "CIBA_AUTH_REJECTED"
    | "CIBA_AUTH_EXPIRED"
    | "ACTION_EXECUTED"
    | "REPLAY_ATTEMPT_BLOCKED"
    | "CROSS_USER_ACCESS_BLOCKED"
    | "AI_TOOL_INVOKED"
    | "AI_RISK_EVALUATED";
  provider?: string;
  resourceType:
    | "TOKEN_VAULT"
    | "AUTHORIZATION_REQUEST"
    | "AGENT_EXECUTION"
    | "GOOGLE_CALENDAR"
    | "AI_AGENT"
    | "USER_SESSION";
  resourceId?: string;
  outcome: "SUCCESS" | "FAILURE" | "BLOCKED" | "PENDING";
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an immutable audit log entry.
 * Sanitizes metadata so no passwords, access tokens, or refresh tokens can ever be stored.
 */
export async function logAuditEvent(params: LogAuditParams) {
  try {
    const sanitizedMeta = params.metadata
      ? JSON.stringify(params.metadata, (key, value) => {
          if (
            /token|secret|password|key|authorization/i.test(key) &&
            typeof value === "string"
          ) {
            return "[REDACTED]";
          }
          return value;
        })
      : null;

    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        provider: params.provider || null,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        outcome: params.outcome,
        metadata: sanitizedMeta,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error("[AuditLog Error] Failed to write audit event:", err);
    return null;
  }
}
