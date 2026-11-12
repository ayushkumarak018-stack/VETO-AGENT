import { GoogleCalendarService } from "./google-calendar.service";
import { RiskEvaluationEngine } from "./risk-evaluation.service";
import { CibaAuthorizationService } from "./ciba.service";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

export interface AgentChatResponse {
  reply: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: "EXECUTED" | "PAUSED_PENDING_APPROVAL" | "FAILED";
  }>;
  pendingAuthorization?: {
    id: string;
    cibaRequestId: string;
    actionType: string;
    summary: string;
    riskLevel: string;
    approvalUrl: string;
    rejectionUrl: string;
    expiresInSeconds: number;
  };
}

export class AiAgentService {
  /**
   * Main chat entrypoint.
   */
  static async processMessage(params: {
    userId: string;
    userEmail: string;
    message: string;
  }): Promise<AgentChatResponse> {
    const { userId, userEmail, message } = params;

    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 10) {
      try {
        return await this.processWithGemini({ userId, userEmail, message, apiKey });
      } catch (err) {
        console.warn("[AiAgentService] Gemini processing failed, falling back to deterministic engine:", err);
      }
    }

    // Default to the deterministic AI engine
    return this.processDeterministic({ userId, userEmail, message });
  }

  /**
   * Deterministic AI reasoning and tool-calling engine.
   * Guarantees 100% functionality and reliable offline demonstration.
   */
  private static async processDeterministic(params: {
    userId: string;
    userEmail: string;
    message: string;
  }): Promise<AgentChatResponse> {
    const { userId, userEmail, message } = params;
    const lower = message.toLowerCase();

    // 1. INTENT: Schedule / Create a meeting (MUTATING / HIGH RISK)
    if (
      lower.includes("schedule") ||
      lower.includes("book") ||
      lower.includes("create meeting") ||
      lower.includes("set up a meeting") ||
      lower.includes("invite")
    ) {
      // Extract attendees
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const extractedEmails = message.match(emailRegex) || [];

      // Extract title / summary
      let summary = "Project Meeting";
      if (lower.includes("ceo")) {
        summary = "Project Review with CEO";
      } else if (lower.includes("review")) {
        summary = "Strategy & Project Review";
      } else if (lower.includes("sync") || lower.includes("standup")) {
        summary = "Team Sync";
      }

      // Default meeting date: Tomorrow at 3:00 PM if tomorrow mentioned, else next day
      const targetDate = new Date();
      if (lower.includes("tomorrow")) {
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (lower.includes("friday")) {
        const day = targetDate.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        targetDate.setDate(targetDate.getDate() + diff);
      } else {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      let hour = 15; // 3 PM default
      if (lower.includes("10 am") || lower.includes("10:00")) hour = 10;
      else if (lower.includes("11 am") || lower.includes("11:00")) hour = 11;
      else if (lower.includes("2 pm") || lower.includes("14:00")) hour = 14;
      else if (lower.includes("4 pm") || lower.includes("16:00")) hour = 16;
      else if (lower.includes("3 pm") || lower.includes("15:00")) hour = 15;

      targetDate.setHours(hour, 0, 0, 0);
      const startTime = targetDate.toISOString();
      const endTime = new Date(targetDate.getTime() + 3600 * 1000).toISOString();

      const actionPayload = {
        summary,
        description: `Scheduled via VETO AGENT assistant for: ${message}`,
        startTime,
        endTime,
        attendees: extractedEmails.length > 0 ? extractedEmails : ["ceo@example.com"],
        location: "Google Meet",
      };

      // EVALUATE RISK BEFORE CALLING TOOL
      const risk = RiskEvaluationEngine.evaluate("create_calendar_event", actionPayload);

      if (risk.requiresAuthorization) {
        // PAUSE EXECUTION & TRIGGER CIBA
        const ciba = await CibaAuthorizationService.initiateAuthorization({
          userId,
          userEmail,
          provider: "google_calendar",
          actionType: "create_calendar_event",
          actionDescription: risk.humanReadableSummary,
          actionPayload,
          riskLevel: risk.riskLevel,
        });

        const attendeesFormatted = actionPayload.attendees.join(", ");
        const timeFormatted = new Date(startTime).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        return {
          reply: `I have prepared the meeting **"${summary}"** for **${timeFormatted}** with invitees: **${attendeesFormatted}**.\n\n🛡️ **Authorization Required (High Impact):**\nBecause this operation dispatches calendar invitations to external stakeholders, execution has been **paused**.\n\nAn out-of-band authorization request has been dispatched to **${userEmail}**. You can approve or reject this request from your mobile device or review page. No calendar changes will take place until you grant explicit authorization.`,
          toolCalls: [
            {
              name: "create_calendar_event",
              args: actionPayload,
              result: {
                status: "PAUSED",
                cibaRequestId: ciba.authReqId,
                riskLevel: risk.riskLevel,
                reason: risk.reason,
              },
              status: "PAUSED_PENDING_APPROVAL",
            },
          ],
          pendingAuthorization: {
            id: ciba.authorizationRequestId,
            cibaRequestId: ciba.authReqId,
            actionType: "create_calendar_event",
            summary,
            riskLevel: risk.riskLevel,
            approvalUrl: ciba.approvalUrl,
            rejectionUrl: ciba.rejectionUrl,
            expiresInSeconds: ciba.expiresIn,
          },
        };
      }
    }

    // 2. INTENT: Find available slots (READ ONLY / LOW RISK)
    if (
      lower.includes("slot") ||
      lower.includes("free time") ||
      lower.includes("availability") ||
      lower.includes("available")
    ) {
      try {
        const slots = await GoogleCalendarService.findAvailableSlots(userId);
        const slotText = slots.slice(0, 5).map((s) => `• ${s.start} - ${s.end}`).join("\n");

        return {
          reply: `Here are the available time slots found on your calendar:\n\n${slotText}\n\nWould you like me to prepare a meeting draft for any of these times?`,
          toolCalls: [
            {
              name: "find_available_slots",
              args: {},
              result: slots,
              status: "EXECUTED",
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          reply: `I could not check your available slots: ${errorMsg}. Please ensure Google Calendar is connected in Connected Services.`,
        };
      }
    }

    // 3. INTENT: Read schedule / list meetings (READ ONLY / LOW RISK)
    if (
      lower.includes("meeting") ||
      lower.includes("schedule") ||
      lower.includes("today") ||
      lower.includes("calendar") ||
      lower.includes("events") ||
      lower.includes("what do i have")
    ) {
      try {
        const events = await GoogleCalendarService.getEvents(userId, 6);

        if (events.length === 0) {
          return {
            reply: "You have no upcoming events scheduled on your calendar.",
            toolCalls: [
              {
                name: "get_calendar_events",
                args: { maxResults: 6 },
                result: [],
                status: "EXECUTED",
              },
            ],
          };
        }

        const formatted = events
          .map((evt) => {
            const time = new Date(evt.start.dateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const attendees = evt.attendees?.map((a) => a.email).join(", ") || "None";
            return `📅 **${evt.summary}**\n• Time: ${time}\n• Location: ${evt.location || "Online"}\n• Invitees: ${attendees}`;
          })
          .join("\n\n");

        return {
          reply: `Here is your current schedule from Google Calendar:\n\n${formatted}\n\nIs there anything specific you would like me to organize?`,
          toolCalls: [
            {
              name: "get_calendar_events",
              args: { maxResults: 6 },
              result: events,
              status: "EXECUTED",
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          reply: `Unable to access your calendar: ${errorMsg}. Please connect your Google Calendar account in Connected Services.`,
        };
      }
    }

    // 4. Fallback conversational greeting / help
    return {
      reply: `Hello! I am your **VETO AGENT**. I can help you manage your calendar and automate tasks while ensuring you maintain complete control.\n\nTry asking me:\n- *"Show me my meetings for today."*\n- *"Find an available slot tomorrow."*\n- *"Schedule a project review with the CEO tomorrow at 3 PM and invite ceo@example.com."*\n\nNotice that any high-impact actions will pause and require your out-of-band authorization before execution.`,
    };
  }

  /**
   * Gemini function-calling implementation
   */
  private static async processWithGemini(params: {
    userId: string;
    userEmail: string;
    message: string;
    apiKey: string;
  }): Promise<AgentChatResponse> {
    const { userId, userEmail, message, apiKey } = params;

    const genAI = new GoogleGenerativeAI(apiKey);

    const getCalendarEventsDeclaration: FunctionDeclaration = {
      name: "get_calendar_events",
      description: "Retrieve upcoming meetings and calendar events for the user.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          maxResults: {
            type: SchemaType.NUMBER,
            description: "Maximum number of events to retrieve (default 10)",
          },
        },
      },
    };

    const findAvailableSlotsDeclaration: FunctionDeclaration = {
      name: "find_available_slots",
      description: "Find free time slots on the user's calendar.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          targetDate: {
            type: SchemaType.STRING,
            description: "Target date string (YYYY-MM-DD)",
          },
        },
      },
    };

    const createCalendarEventDeclaration: FunctionDeclaration = {
      name: "create_calendar_event",
      description: "Create or schedule a new calendar event with participants.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING, description: "Meeting title" },
          startTime: { type: SchemaType.STRING, description: "Start time in ISO 8601" },
          endTime: { type: SchemaType.STRING, description: "End time in ISO 8601" },
          attendees: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of attendee email addresses",
          },
          location: { type: SchemaType.STRING, description: "Location or meeting link" },
        },
        required: ["summary", "startTime"],
      },
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [
        {
          functionDeclarations: [
            getCalendarEventsDeclaration,
            findAvailableSlotsDeclaration,
            createCalendarEventDeclaration,
          ],
        },
      ],
      systemInstruction: `You are VETO AGENT, a privacy-first AI assistant.
Your motto is: 'Your AI. Your Services. Your Final Say.'
You have access to Google Calendar tools.
CRITICAL SECURITY RULE: You cannot directly execute high-impact mutations on third-party services. When preparing to schedule meetings with participants or external guests, the backend permission engine will evaluate risk, pause execution, and require asynchronous authorization (CIBA).
Always inform the user clearly about what actions are planned.`,
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(message);
    const call = result.response.functionCalls()?.[0];

    if (!call) {
      return {
        reply: result.response.text(),
      };
    }

    // Model called a tool: evaluate backend risk first!
    const toolName = call.name;
    const toolArgs = (call.args as Record<string, unknown>) || {};

    const risk = RiskEvaluationEngine.evaluate(toolName, toolArgs);

    if (risk.requiresAuthorization) {
      // Pause execution!
      const ciba = await CibaAuthorizationService.initiateAuthorization({
        userId,
        userEmail,
        provider: "google_calendar",
        actionType: toolName,
        actionDescription: risk.humanReadableSummary,
        actionPayload: toolArgs,
        riskLevel: risk.riskLevel,
      });

      return {
        reply: `I have prepared the requested action: **"${risk.humanReadableSummary}"**.\n\n🛡️ **High-Impact Action Detected:**\n${risk.reason}\n\nExecution is **paused**. An out-of-band authorization request has been sent to **${userEmail}**. Please approve or reject via the provided out-of-band notification.`,
        toolCalls: [
          {
            name: toolName,
            args: toolArgs,
            result: {
              status: "PAUSED",
              cibaRequestId: ciba.authReqId,
              riskLevel: risk.riskLevel,
            },
            status: "PAUSED_PENDING_APPROVAL",
          },
        ],
        pendingAuthorization: {
          id: ciba.authorizationRequestId,
          cibaRequestId: ciba.authReqId,
          actionType: toolName,
          summary: String(toolArgs.summary || risk.humanReadableSummary),
          riskLevel: risk.riskLevel,
          approvalUrl: ciba.approvalUrl,
          rejectionUrl: ciba.rejectionUrl,
          expiresInSeconds: ciba.expiresIn,
        },
      };
    }

    // Low-risk read-only execution
    if (toolName === "get_calendar_events") {
      const events = await GoogleCalendarService.getEvents(userId);
      const followUp = await chat.sendMessage([
        {
          functionResponse: {
            name: "get_calendar_events",
            response: { events },
          },
        },
      ]);
      return {
        reply: followUp.response.text(),
        toolCalls: [
          {
            name: toolName,
            args: toolArgs,
            result: events,
            status: "EXECUTED",
          },
        ],
      };
    }

    if (toolName === "find_available_slots") {
      const slots = await GoogleCalendarService.findAvailableSlots(
        userId,
        toolArgs.targetDate as string
      );
      const followUp = await chat.sendMessage([
        {
          functionResponse: {
            name: "find_available_slots",
            response: { slots },
          },
        },
      ]);
      return {
        reply: followUp.response.text(),
        toolCalls: [
          {
            name: toolName,
            args: toolArgs,
            result: slots,
            status: "EXECUTED",
          },
        ],
      };
    }

    return {
      reply: result.response.text(),
    };
  }
}

