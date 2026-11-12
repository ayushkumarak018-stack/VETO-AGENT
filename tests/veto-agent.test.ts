import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { encryptToken, decryptToken, generateSecureNonce } from "../src/lib/crypto";
import { TokenVaultService } from "../src/services/token-vault.service";
import { RiskEvaluationEngine } from "../src/services/risk-evaluation.service";
import { CibaAuthorizationService } from "../src/services/ciba.service";
import { GoogleCalendarService } from "../src/services/google-calendar.service";
import { ExecutionWorkerService } from "../src/services/execution-worker.service";
import { AiAgentService } from "../src/services/ai-agent.service";

describe("VETO AGENT — Full Security & CIBA Verification Suite", () => {
  let testUser: { id: string; email: string; name: string };
  let secondUser: { id: string; email: string; name: string };

  beforeAll(async () => {
    // Setup test users
    testUser = await prisma.user.upsert({
      where: { email: "test.agent@vetoagent.local" },
      update: {},
      create: {
        name: "Test User",
        email: "test.agent@vetoagent.local",
        role: "user",
      },
    });

    secondUser = await prisma.user.upsert({
      where: { email: "attacker@vetoagent.local" },
      update: {},
      create: {
        name: "Second User",
        email: "attacker@vetoagent.local",
        role: "user",
      },
    });

    // Seed test Google Calendar in Token Vault
    await TokenVaultService.storeToken({
      userId: testUser.id,
      provider: "google_calendar",
      accessToken: "mock_test_token_12345",
      refreshToken: "mock_test_refresh_67890",
      expiresInSeconds: 3600,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      accountEmail: testUser.email,
      providerAccountId: `google_${testUser.id}`,
      isDemo: true,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1 — AES-256-GCM Token Vault Encryption Integrity
  it("Encrypts and decrypts OAuth tokens using AES-256-GCM with tamper detection", () => {
    const secretOAuthToken = "ya29.a0AfH6SMD_ultra_sensitive_google_oauth_token";
    const encrypted = encryptToken(secretOAuthToken);

    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.encrypted).not.toEqual(secretOAuthToken);

    // Decrypt accurately
    const decrypted = decryptToken({
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    });
    expect(decrypted).toBe(secretOAuthToken);

    // Tampering test: modify 1 byte of encrypted ciphertext -> must throw error
    const tampered = Buffer.from(encrypted.encrypted, "base64");
    tampered[0] ^= 1;
    expect(() =>
      decryptToken({
        encrypted: tampered.toString("base64"),
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      })
    ).toThrow();
  });

  // TEST 2 — Normal Read Operation (No CIBA Request Created)
  it("Test 1: Read operation retrieves schedule without requiring CIBA authorization", async () => {
    const risk = RiskEvaluationEngine.evaluate("get_calendar_events", {});
    expect(risk.riskLevel).toBe("LOW");
    expect(risk.requiresAuthorization).toBe(false);

    const response = await AiAgentService.processMessage({
      userId: testUser.id,
      userEmail: testUser.email,
      message: "Show me my meetings for today.",
    });

    expect(response.reply).toBeDefined();
    expect(response.pendingAuthorization).toBeUndefined();
    expect(response.toolCalls?.[0].status).toBe("EXECUTED");
  });

  // TEST 3 — High-Impact Operation Pauses and Generates CIBA Request
  it("Test 2: High-impact operation pauses execution, triggers CIBA, and creates NO calendar event", async () => {
    const response = await AiAgentService.processMessage({
      userId: testUser.id,
      userEmail: testUser.email,
      message: "Schedule a meeting with the CEO tomorrow at 3 PM and invite ceo@example.com",
    });

    expect(response.pendingAuthorization).toBeDefined();
    expect(response.pendingAuthorization?.riskLevel).toBe("HIGH");
    expect(response.pendingAuthorization?.summary).toContain("CEO");
    expect(response.toolCalls?.[0].status).toBe("PAUSED_PENDING_APPROVAL");

    // Verify in database that it is in PENDING_APPROVAL and NO calendar event has been executed
    const authReq = await prisma.authorizationRequest.findUnique({
      where: { id: response.pendingAuthorization!.id },
      include: { agentExecution: true },
    });

    expect(authReq?.status).toBe("PENDING_APPROVAL");
    expect(authReq?.agentExecution?.executionStatus).toBe("PENDING_APPROVAL");
    expect(authReq?.agentExecution?.result).toBeNull();
  });

  // TEST 4 — User Approves Outside Chat -> Background Worker Resumes and Executes
  it("Test 3: External approval resumes execution and creates the event", async () => {
    // Initiate an action
    const init = await CibaAuthorizationService.initiateAuthorization({
      userId: testUser.id,
      userEmail: testUser.email,
      provider: "google_calendar",
      actionType: "create_calendar_event",
      actionDescription: "Strategy Review with Board",
      actionPayload: {
        summary: "Strategy Review with Board",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        attendees: ["board@example.com"],
      },
      riskLevel: "HIGH",
    });

    // Approve using single-use token
    const approval = await CibaAuthorizationService.approveRequest({
      cibaRequestId: init.authReqId,
      token: init.approvalNonce,
      actorUserId: testUser.id,
    });

    expect(approval.status).toBe("APPROVED");
    expect(approval.executionResult.success).toBe(true);

    // Verify DB state
    const authReq = await prisma.authorizationRequest.findUnique({
      where: { cibaRequestId: init.authReqId },
      include: { agentExecution: true },
    });

    expect(authReq?.status).toBe("APPROVED");
    expect(authReq?.approvedAt).toBeDefined();
    expect(authReq?.agentExecution?.executionStatus).toBe("COMPLETED");
    expect(authReq?.agentExecution?.result).toContain("Strategy Review with Board");
  });

  // TEST 5 — User Rejects Outside Chat -> VETO Applied and Cancelled
  it("Test 4: External rejection vetoes the action and cancels execution", async () => {
    const init = await CibaAuthorizationService.initiateAuthorization({
      userId: testUser.id,
      userEmail: testUser.email,
      provider: "google_calendar",
      actionType: "create_calendar_event",
      actionDescription: "Emergency System Wipe",
      actionPayload: { summary: "Emergency System Wipe" },
      riskLevel: "HIGH",
    });

    const reject = await CibaAuthorizationService.rejectRequest({
      cibaRequestId: init.authReqId,
      token: init.approvalNonce,
      actorUserId: testUser.id,
      reason: "Unauthorized request. User vetoed.",
    });

    expect(reject.status).toBe("REJECTED");

    const authReq = await prisma.authorizationRequest.findUnique({
      where: { cibaRequestId: init.authReqId },
      include: { agentExecution: true },
    });

    expect(authReq?.status).toBe("REJECTED");
    expect(authReq?.rejectedAt).toBeDefined();
    expect(authReq?.agentExecution?.executionStatus).toBe("CANCELLED");
  });

  // TEST 6 — Expiration Prevents Execution
  it("Test 5: Expired authorization request cannot be approved", async () => {
    const init = await CibaAuthorizationService.initiateAuthorization({
      userId: testUser.id,
      userEmail: testUser.email,
      provider: "google_calendar",
      actionType: "create_calendar_event",
      actionDescription: "Outdated request",
      actionPayload: { summary: "Outdated request" },
      riskLevel: "HIGH",
      expiresInSeconds: -10, // already expired
    });

    await expect(
      CibaAuthorizationService.approveRequest({
        cibaRequestId: init.authReqId,
        token: init.approvalNonce,
        actorUserId: testUser.id,
      })
    ).rejects.toThrow(/expired/i);

    const authReq = await prisma.authorizationRequest.findUnique({
      where: { cibaRequestId: init.authReqId },
    });
    expect(authReq?.status).toBe("EXPIRED");
  });

  // TEST 7 — Security Controls: Cross-User Authorization Block & Replay Prevention
  it("Test 6: Blocks cross-user approval and prevents replay/double execution", async () => {
    const init = await CibaAuthorizationService.initiateAuthorization({
      userId: testUser.id,
      userEmail: testUser.email,
      provider: "google_calendar",
      actionType: "create_calendar_event",
      actionDescription: "Secret Meeting",
      actionPayload: { summary: "Secret Meeting" },
      riskLevel: "HIGH",
    });

    // 1. Cross-user attempt: Attacker attempts to approve testUser's action
    await expect(
      CibaAuthorizationService.approveRequest({
        cibaRequestId: init.authReqId,
        actorUserId: secondUser.id, // different user!
      })
    ).rejects.toThrow(/Unauthorized: You cannot approve an action belonging to another user/i);

    // 2. Legitimate approval
    await CibaAuthorizationService.approveRequest({
      cibaRequestId: init.authReqId,
      token: init.approvalNonce,
      actorUserId: testUser.id,
    });

    // 3. Replay attack: try approving again with same single-use token -> must be rejected
    await expect(
      CibaAuthorizationService.approveRequest({
        cibaRequestId: init.authReqId,
        token: init.approvalNonce,
        actorUserId: testUser.id,
      })
    ).rejects.toThrow(/Invalid or corrupted approval token/i);

    // 4. Verify audit log captured the cross-user block
    const crossUserAudit = await prisma.auditLog.findFirst({
      where: {
        userId: secondUser.id,
        action: "CROSS_USER_ACCESS_BLOCKED",
      },
    });
    expect(crossUserAudit).toBeDefined();
  });
});
