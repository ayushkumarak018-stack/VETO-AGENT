import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await TokenVaultService.getConnectionStatus(
    user.id,
    "google_calendar"
  );
  return NextResponse.json(status);
}
