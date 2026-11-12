import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signSessionToken, sessionCookieOptions } from "@/lib/session";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isDemoQuickLogin } = body;

    let user;

    if (isDemoQuickLogin) {
      // Find or create demo user
      const demoEmail = "alex.builder@vetoagent.local";
      user = await prisma.user.findUnique({
        where: { email: demoEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: "Alex Builder (Demo User)",
            email: demoEmail,
            role: "user",
            authProviderId: "demo",
          },
        });
      }
    } else {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required." },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }
    }

    const token = signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAuditEvent({
      userId: user.id,
      action: "OAUTH_CONNECTED",
      resourceType: "USER_SESSION",
      resourceId: user.id,
      outcome: "SUCCESS",
      metadata: { method: isDemoQuickLogin ? "demo_quick_login" : "local_password" },
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set(
      sessionCookieOptions.name,
      token,
      sessionCookieOptions.options
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
