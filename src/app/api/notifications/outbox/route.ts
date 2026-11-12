import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notificationOutbox.findMany({
    where: { userId: user.id },
    orderBy: { sentAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ notifications });
}
