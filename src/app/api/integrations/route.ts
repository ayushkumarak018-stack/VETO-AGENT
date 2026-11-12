import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const googleStatus = await TokenVaultService.getConnectionStatus(
    user.id,
    "google_calendar"
  );

  const integrations = [
    {
      id: "google_calendar",
      name: "Google Calendar",
      category: "Productivity & Scheduling",
      description: "Allows the AI agent to read your schedule, find open slots, and draft meetings. High-impact operations pause for your final veto.",
      connected: googleStatus.connected,
      accountEmail: googleStatus.accountEmail,
      scopes: googleStatus.scopes,
      isDemo: googleStatus.isDemo,
      isExpired: googleStatus.isExpired,
      lastSyncAt: googleStatus.lastSyncAt,
      supportedActions: [
        { name: "Read Schedule & Events", risk: "LOW", requiresAuth: false },
        { name: "Find Free Time Slots", risk: "LOW", requiresAuth: false },
        { name: "Schedule Meetings with Invitees", risk: "HIGH", requiresAuth: true },
        { name: "Delete Events", risk: "HIGH", requiresAuth: true },
      ],
    },
    {
      id: "github",
      name: "GitHub (Coming Soon)",
      category: "Developer Tools",
      description: "Manage repositories, pull requests, and issues with Token Vault isolation.",
      connected: false,
      isPlaceholder: true,
      supportedActions: [
        { name: "List Issues & PRs", risk: "LOW", requiresAuth: false },
        { name: "Merge Pull Request", risk: "HIGH", requiresAuth: true },
        { name: "Delete Repository", risk: "HIGH", requiresAuth: true },
      ],
    },
    {
      id: "slack",
      name: "Slack (Coming Soon)",
      category: "Communications",
      description: "Search messages and post channel updates with CIBA approval before broad announcements.",
      connected: false,
      isPlaceholder: true,
      supportedActions: [
        { name: "Read Channels", risk: "LOW", requiresAuth: false },
        { name: "Broadcast @channel Announcement", risk: "HIGH", requiresAuth: true },
      ],
    },
  ];

  return NextResponse.json({ integrations });
}
