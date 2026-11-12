import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { AiAgentService } from "@/services/ai-agent.service";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  // Save User message
  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "user",
      content: message,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "AI_TOOL_INVOKED",
    resourceType: "AI_AGENT",
    outcome: "PENDING",
    metadata: { userPrompt: message.substring(0, 100) },
  });

  try {
    const agentResponse = await AiAgentService.processMessage({
      userId: user.id,
      userEmail: user.email,
      message,
    });

    // Save Assistant reply
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: agentResponse.reply,
        toolCalls: agentResponse.toolCalls
          ? JSON.stringify(agentResponse.toolCalls)
          : null,
        authorizationRequestId: agentResponse.pendingAuthorization?.id || null,
      },
    });

    return NextResponse.json({
      message: assistantMsg,
      reply: agentResponse.reply,
      toolCalls: agentResponse.toolCalls,
      pendingAuthorization: agentResponse.pendingAuthorization,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("AI Agent error:", err);
    return NextResponse.json(
      { error: `Agent processing error: ${errorMsg}` },
      { status: 500 }
    );
  }
}
