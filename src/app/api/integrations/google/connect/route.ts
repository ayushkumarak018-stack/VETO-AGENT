import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isDemo = searchParams.get("demo") === "true";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/google/callback";

  // If explicitly requested demo mode OR no client ID is set, activate Demo connection
  if (isDemo || !clientId) {
    const mockAccessToken = `demo_tok_${crypto.randomBytes(16).toString("hex")}`;
    const mockRefreshToken = `demo_ref_${crypto.randomBytes(16).toString("hex")}`;

    await TokenVaultService.storeToken({
      userId: user.id,
      provider: "google_calendar",
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      expiresInSeconds: 3600,
      scopes: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      accountEmail: `${user.email.split("@")[0]}@work-calendar.internal`,
      providerAccountId: `google_demo_${user.id}`,
      isDemo: true,
    });

    return NextResponse.json({
      connected: true,
      mode: "demo",
      message: "Connected to Google Calendar in Demo Mode with Token Vault encryption.",
    });
  }

  // Real Google OAuth 2.0 PKCE flow
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.json({
    authUrl: authUrl.toString(),
    mode: "oauth",
  });

  // Store state and codeVerifier in HTTP-only cookies
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("google_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
