import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Ensure user owns the credential
  const credential = await prisma.vaultCredential.findUnique({
    where: { id },
    include: { connectedAccount: true },
  });

  if (!credential || credential.connectedAccount.userId !== user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  await prisma.connectedAccount.delete({
    where: { id: credential.connectedAccountId },
  });

  return NextResponse.json({ success: true, deleted: true });
}
