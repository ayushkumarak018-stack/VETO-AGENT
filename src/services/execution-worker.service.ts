import { prisma } from "@/lib/prisma";
import { GoogleCalendarService } from "./google-calendar.service";
import { logAuditEvent } from "@/lib/audit";

export class ExecutionWorkerService {
  /**
   * Resumes a paused execution after explicit authorization approval.
   * Guarantees idempotency: will never execute an action twice.
   */
  static async resumeExecution(authorizationRequestId: string) {
    const authRequest = await prisma.authorizationRequest.findUnique({
      where: { id: authorizationRequestId },
      include: {
        agentExecution: true,
      },
    });

    if (!authRequest) {
      throw new Error(`Authorization request ${authorizationRequestId} not found.`);
    }

    if (authRequest.status !== "APPROVED") {
      throw new Error(
        `Cannot execute action: AuthorizationRequest status is '${authRequest.status}', must be 'APPROVED'.`
      );
    }

    const execution = authRequest.agentExecution;
    if (!execution) {
      throw new Error("No linked AgentExecution record found for this authorization request.");
    }

    // Idempotency check: if already EXECUTING or COMPLETED, do not re-run
    if (execution.executionStatus === "COMPLETED") {
      return {
        success: true,
        alreadyCompleted: true,
        result: execution.result ? JSON.parse(execution.result) : null,
      };
    }

    if (execution.executionStatus === "EXECUTING") {
      return {
        success: true,
        alreadyExecuting: true,
      };
    }

    // Mark as EXECUTING
    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        executionStatus: "EXECUTING",
        startedAt: new Date(),
      },
    });

    try {
      const payload = JSON.parse(authRequest.actionPayload);
      let executionResult: unknown = null;

      // Execute according to provider and actionType
      if (authRequest.provider === "google_calendar") {
        if (
          authRequest.actionType === "create_calendar_event" ||
          authRequest.actionType === "schedule_meeting"
        ) {
          executionResult = await GoogleCalendarService.createEvent(authRequest.userId, {
            summary: payload.summary,
            description: payload.description,
            startTime: payload.startTime,
            endTime: payload.endTime,
            attendees: payload.attendees,
            location: payload.location,
          });
        } else if (authRequest.actionType === "delete_calendar_event") {
          executionResult = await GoogleCalendarService.deleteEvent(
            authRequest.userId,
            payload.eventId
          );
        } else {
          throw new Error(`Unsupported calendar action: ${authRequest.actionType}`);
        }
      } else {
        throw new Error(`Unsupported provider: ${authRequest.provider}`);
      }

      // Mark execution as COMPLETED
      const completedExecution = await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          executionStatus: "COMPLETED",
          result: JSON.stringify(executionResult),
          completedAt: new Date(),
        },
      });

      await logAuditEvent({
        userId: authRequest.userId,
        action: "ACTION_EXECUTED",
        provider: authRequest.provider,
        resourceType: "AGENT_EXECUTION",
        resourceId: completedExecution.id,
        outcome: "SUCCESS",
        metadata: {
          actionType: authRequest.actionType,
          summary: payload.summary,
        },
      });

      return {
        success: true,
        executionId: completedExecution.id,
        result: executionResult,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error during execution";

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          executionStatus: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      });

      await logAuditEvent({
        userId: authRequest.userId,
        action: "ACTION_EXECUTED",
        provider: authRequest.provider,
        resourceType: "AGENT_EXECUTION",
        resourceId: execution.id,
        outcome: "FAILURE",
        metadata: { error: errorMessage },
      });

      throw err;
    }
  }

  /**
   * Cancel an execution when the user rejects or vetoes the request.
   */
  static async cancelExecution(authorizationRequestId: string, reason: string) {
    const authRequest = await prisma.authorizationRequest.findUnique({
      where: { id: authorizationRequestId },
      include: { agentExecution: true },
    });

    if (authRequest?.agentExecution) {
      await prisma.agentExecution.update({
        where: { id: authRequest.agentExecution.id },
        data: {
          executionStatus: "CANCELLED",
          errorMessage: reason,
          completedAt: new Date(),
        },
      });
    }
  }
}

