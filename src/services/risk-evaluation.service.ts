export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskEvaluationResult {
  riskLevel: RiskLevel;
  requiresAuthorization: boolean;
  reason: string;
  humanReadableSummary: string;
  impactDetails: {
    externalPartiesInvolved?: string[];
    actionType: string;
    resourceName?: string;
    irreversible: boolean;
  };
}

export class RiskEvaluationEngine {
  /**
   * Evaluates the risk and impact of an intended agent action before execution.
   */
  static evaluate(
    actionType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): RiskEvaluationResult {
    // 1. Read-only operations are LOW risk
    if (
      [
        "get_calendar_events",
        "search_calendar_events",
        "find_available_slots",
        "summarize_calendar",
        "get_today_schedule",
      ].includes(actionType)
    ) {
      return {
        riskLevel: "LOW",
        requiresAuthorization: false,
        reason: "Read-only inspection of calendar data has no external or mutating impact.",
        humanReadableSummary: "Retrieve and read calendar schedule",
        impactDetails: {
          actionType,
          irreversible: false,
        },
      };
    }

    // 2. Draft preparation is MEDIUM risk
    if (actionType === "prepare_calendar_event") {
      return {
        riskLevel: "MEDIUM",
        requiresAuthorization: false,
        reason: "Draft preparation stages an action without applying changes to the live service.",
        humanReadableSummary: `Prepare draft: "${payload.summary || "New Meeting"}"`,
        impactDetails: {
          actionType,
          resourceName: payload.summary,
          irreversible: false,
        },
      };
    }

    // 3. Deletion operations are HIGH risk
    if (actionType === "delete_calendar_event") {
      return {
        riskLevel: "HIGH",
        requiresAuthorization: true,
        reason: "Event deletion is an irreversible destructive operation.",
        humanReadableSummary: `Delete calendar event "${payload.summary || payload.eventId || "Event"}"`,
        impactDetails: {
          actionType,
          resourceName: payload.summary || payload.eventId,
          irreversible: true,
        },
      };
    }

    // 4. Creation or update operations with external invitees or sensitive roles are HIGH risk
    if (actionType === "create_calendar_event" || actionType === "update_calendar_event") {
      const attendees = Array.isArray(payload.attendees)
        ? payload.attendees
        : typeof payload.attendees === "string"
        ? [payload.attendees]
        : [];

      const hasExternalAttendees = attendees.length > 0;
      const title = (payload.summary || "").toLowerCase();
      const isExecutiveOrSensitive =
        title.includes("ceo") ||
        title.includes("board") ||
        title.includes("investor") ||
        title.includes("audit") ||
        title.includes("confidential");

      if (hasExternalAttendees || isExecutiveOrSensitive) {
        const attendeeList = attendees.join(", ");
        return {
          riskLevel: "HIGH",
          requiresAuthorization: true,
          reason: `High impact: ${
            isExecutiveOrSensitive ? "Executive/sensitive stakeholder involved. " : ""
          }${
            hasExternalAttendees
              ? `Action will dispatch notifications/invitations to external recipients (${attendeeList}).`
              : "Significant schedule modification."
          }`,
          humanReadableSummary: `Create meeting "${payload.summary}" with invitees: ${attendeeList || "None"}`,
          impactDetails: {
            externalPartiesInvolved: attendees,
            actionType,
            resourceName: payload.summary,
            irreversible: true,
          },
        };
      }

      // If internal only without external guests, we still classify as HIGH for hackathon safety
      // and user control over calendar modifications.
      return {
        riskLevel: "HIGH",
        requiresAuthorization: true,
        reason: "Creating a calendar event modifies your schedule and claims calendar time.",
        humanReadableSummary: `Create calendar event "${payload.summary || "New Event"}"`,
        impactDetails: {
          actionType,
          resourceName: payload.summary,
          irreversible: false,
        },
      };
    }

    // Default unknown write actions to HIGH
    return {
      riskLevel: "HIGH",
      requiresAuthorization: true,
      reason: `Unrecognized or mutating action '${actionType}' defaults to high risk for security.`,
      humanReadableSummary: `Execute action: ${actionType}`,
      impactDetails: {
        actionType,
        irreversible: true,
      },
    };
  }
}
