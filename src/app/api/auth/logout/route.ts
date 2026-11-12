import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieOptions.name, "", {
    ...sessionCookieOptions.options,
    maxAge: 0,
  });
  return response;
}

