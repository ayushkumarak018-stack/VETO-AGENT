import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider = "google_calendar" } = await req.json();

  try {
    const cred = await TokenVaultService.refreshToken(user.id, provider);
    if (!cred) {
      return NextResponse.json(
        { error: `Could not refresh token for ${provider}. Not connected.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      refreshed: true,
      expiresAt: cred.expiresAt,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
