import { TokenVaultService } from "./token-vault.service";
import { logAuditEvent } from "@/lib/audit";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  status?: string;
  htmlLink?: string;
}

// In-memory / dynamic store for demo events per user so created events persist across the demo session
const demoCalendarStore = new Map<string, CalendarEvent[]>();

function getInitialDemoEvents(): CalendarEvent[] {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const tomorrowDd = String(today.getDate() + 1).padStart(2, "0");

  return [
    {
      id: "demo_evt_1",
      summary: "Daily Team Standup & Sync",
      description: "Engineering team daily standup call.",
      start: { dateTime: `${yyyy}-${mm}-${dd}T10:00:00Z` },
      end: { dateTime: `${yyyy}-${mm}-${dd}T10:30:00Z` },
      attendees: [
        { email: "team@company.internal", displayName: "Engineering Team" },
      ],
      location: "Google Meet",
    },
    {
      id: "demo_evt_2",
      summary: "Q4 Roadmap & Infrastructure Review",
      description: "Quarterly review of platform architecture and cloud security.",
      start: { dateTime: `${yyyy}-${mm}-${dd}T14:00:00Z` },
      end: { dateTime: `${yyyy}-${mm}-${dd}T15:00:00Z` },
      attendees: [
        { email: "lead-architect@company.internal", displayName: "Chief Architect" },
      ],
      location: "Conference Room A",
    },
    {
      id: "demo_evt_3",
      summary: "Coffee with Product Design",
      description: "Review new UX design components for VETO AGENT.",
      start: { dateTime: `${yyyy}-${mm}-${tomorrowDd}T11:00:00Z` },
      end: { dateTime: `${yyyy}-${mm}-${tomorrowDd}T11:45:00Z` },
      attendees: [
        { email: "design@company.internal", displayName: "Design Lead" },
      ],
      location: "Virtual",
    },
  ];
}

export class GoogleCalendarService {
  /**
   * Fetch upcoming calendar events for the user
   */
  static async getEvents(userId: string, maxResults = 10): Promise<CalendarEvent[]> {
    const cred = await TokenVaultService.getToken(userId, "google_calendar");
    if (!cred) {
      throw new Error(
        "Google Calendar is not connected. Please connect your Google Calendar account in Connected Services."
      );
    }

    if (cred.isDemo) {
      let events = demoCalendarStore.get(userId);
      if (!events) {
        events = getInitialDemoEvents();
        demoCalendarStore.set(userId, events);
      }
      return events.slice(0, maxResults);
    }

    // Real Google Calendar API
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${new Date().toISOString()}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${cred.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      // Check if expired and attempt auto-refresh
      if (res.status === 401) {
        const refreshed = await TokenVaultService.refreshToken(userId, "google_calendar");
        if (refreshed) {
          return this.getEvents(userId, maxResults);
        }
      }
      const errorText = await res.text();
      throw new Error(`Google Calendar API Error: ${errorText}`);
    }

    const data = await res.json();
    return data.items || [];
  }

  /**
   * Search calendar events by text
   */
  static async searchEvents(userId: string, query: string): Promise<CalendarEvent[]> {
    const allEvents = await this.getEvents(userId, 50);
    const q = query.toLowerCase();
    return allEvents.filter(
      (evt) =>
        (evt.summary && evt.summary.toLowerCase().includes(q)) ||
        (evt.description && evt.description.toLowerCase().includes(q)) ||
        (evt.attendees &&
          evt.attendees.some((a) => a.email.toLowerCase().includes(q)))
    );
  }

  /**
   * Find available time slots for a given target day
   */
  static async findAvailableSlots(
    userId: string,
    targetDateStr?: string
  ): Promise<Array<{ start: string; end: string }>> {
    const events = await this.getEvents(userId, 20);
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

    // Standard business hours: 9:00 AM to 5:00 PM (8 slots of 1 hour)
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");

    const slots: Array<{ start: string; end: string }> = [];

    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(`${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:00:00`);
      const slotEnd = new Date(`${yyyy}-${mm}-${dd}T${String(hour + 1).padStart(2, "0")}:00:00`);

      const hasConflict = events.some((evt) => {
        const evtStart = new Date(evt.start.dateTime);
        const evtEnd = new Date(evt.end.dateTime);
        return evtStart < slotEnd && evtEnd > slotStart;
      });

      if (!hasConflict) {
        slots.push({
          start: slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          end: slotEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    }

    return slots;
  }

  /**
   * Create a new calendar event.
   * CRITICAL: This method must ONLY be called when authorized by the execution worker!
   */
  static async createEvent(
    userId: string,
    params: {
      summary: string;
      description?: string;
      startTime: string;
      endTime?: string;
      attendees?: string[];
      location?: string;
    }
  ): Promise<CalendarEvent> {
    const cred = await TokenVaultService.getToken(userId, "google_calendar");
    if (!cred) {
      throw new Error("Google Calendar account is not connected.");
    }

    // Default duration: 1 hour if endTime is omitted
    const startIso = params.startTime
      ? new Date(params.startTime).toISOString()
      : new Date().toISOString();
    const endIso = params.endTime
      ? new Date(params.endTime).toISOString()
      : new Date(new Date(startIso).getTime() + 3600 * 1000).toISOString();

    const attendeesList = (params.attendees || []).map((email) => ({
      email: email.trim(),
    }));

    if (cred.isDemo) {
      let events = demoCalendarStore.get(userId);
      if (!events) {
        events = getInitialDemoEvents();
        demoCalendarStore.set(userId, events);
      }

      const newEvent: CalendarEvent = {
        id: `demo_created_${Date.now()}`,
        summary: params.summary,
        description: params.description || "Created via VETO AGENT with verified CIBA authorization.",
        start: { dateTime: startIso },
        end: { dateTime: endIso },
        attendees: attendeesList,
        location: params.location || "Google Meet",
        status: "confirmed",
        htmlLink: "https://calendar.google.com/calendar/u/0/r",
      };

      events.unshift(newEvent);
      demoCalendarStore.set(userId, events);

      await logAuditEvent({
        userId,
        action: "ACTION_EXECUTED",
        provider: "google_calendar",
        resourceType: "GOOGLE_CALENDAR",
        resourceId: newEvent.id,
        outcome: "SUCCESS",
        metadata: {
          summary: newEvent.summary,
          attendees: params.attendees,
          isDemo: true,
        },
      });

      return newEvent;
    }

    // Real Google Calendar API
    const requestBody = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      attendees: attendeesList,
      location: params.location,
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cred.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Calendar Event Creation Failed: ${err}`);
    }

    const createdEvent = await res.json();

    await logAuditEvent({
      userId,
      action: "ACTION_EXECUTED",
      provider: "google_calendar",
      resourceType: "GOOGLE_CALENDAR",
      resourceId: createdEvent.id,
      outcome: "SUCCESS",
      metadata: {
        summary: createdEvent.summary,
        attendees: params.attendees,
        isDemo: false,
      },
    });

    return createdEvent;
  }

  /**
   * Delete calendar event
   */
  static async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const cred = await TokenVaultService.getToken(userId, "google_calendar");
    if (!cred) throw new Error("Google Calendar account is not connected.");

    if (cred.isDemo) {
      const events = demoCalendarStore.get(userId) || getInitialDemoEvents();
      const updated = events.filter((e) => e.id !== eventId);
      demoCalendarStore.set(userId, updated);
      return true;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${cred.accessToken}`,
        },
      }
    );

    return res.ok;
  }
}
