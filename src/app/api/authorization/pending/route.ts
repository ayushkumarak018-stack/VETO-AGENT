import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CibaAuthorizationService } from "@/services/ciba.service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up expired items on access
  await CibaAuthorizationService.cleanupExpiredRequests();

  const requests = await prisma.authorizationRequest.findMany({
    where: {
      userId: user.id,
    },
    include: {
      agentExecution: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests });
}
