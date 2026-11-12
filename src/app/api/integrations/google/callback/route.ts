import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { TokenVaultService } from "@/services/token-vault.service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?error=${encodeURIComponent(
        error || "No authorization code returned"
      )}`
    );
  }

  // Validate state
  const cookieState = req.cookies.get("google_oauth_state")?.value;
  const codeVerifier = req.cookies.get("google_code_verifier")?.value;

  if (!state || state !== cookieState) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?error=state_mismatch`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/google/callback";

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        code,
        code_verifier: codeVerifier || "",
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(
        `${baseUrl}/dashboard/integrations?error=${encodeURIComponent(errText)}`
      );
    }

    const tokenData = await tokenRes.json();

    // Fetch user info for account email
    let accountEmail: string | undefined;
    try {
      const userRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      if (userRes.ok) {
        const u = await userRes.json();
        accountEmail = u.email;
      }
    } catch {
      // ignore
    }

    // Encrypt and store in Token Vault
    await TokenVaultService.storeToken({
      userId: user.id,
      provider: "google_calendar",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresInSeconds: tokenData.expires_in,
      scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
      accountEmail,
      providerAccountId: accountEmail || `google_${user.id}`,
      isDemo: false,
    });

    const response = NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?connected=google_calendar`
    );

    // Clear one-time oauth cookies
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_code_verifier");

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?error=${encodeURIComponent(errorMsg)}`
    );
  }
}

