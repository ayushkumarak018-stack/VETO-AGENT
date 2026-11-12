import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const execution = await prisma.agentExecution.findUnique({
    where: { id },
    include: {
      authorizationRequest: true,
    },
  });

  if (!execution || execution.userId !== user.id) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  return NextResponse.json({ execution });
}
