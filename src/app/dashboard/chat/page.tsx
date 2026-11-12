"use client";

import { useEffect, useState, useRef } from "react";
import {
  Send,
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface PendingAuth {
  id: string;
  cibaRequestId: string;
  actionType: string;
  summary: string;
  riskLevel: string;
  approvalUrl: string;
  rejectionUrl: string;
  expiresInSeconds?: number;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result?: any;
    status: string;
  }>;
  pendingAuthorization?: PendingAuth;
  authorizationRequestId?: string;
}

export default function ChatAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadChatHistory() {
    try {
      const res = await fetch("/api/agent/history");
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
          authorizationRequestId: m.authorizationRequestId,
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }

  async function sendMessage(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    setInput("");
    const newMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Agent communication failed");
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        toolCalls: data.toolCalls,
        pendingAuthorization: data.pendingAuthorization,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${errorMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleInlineDecision(
    authId: string,
    decision: "approve" | "reject"
  ) {
    setDecisionLoading(authId);
    try {
      const res = await fetch(`/api/authorization/${authId}/${decision}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${decision}`);
      }

      // Add feedback message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            decision === "approve"
              ? `✅ **Authorization Granted:** Action successfully approved! The background execution worker resumed and completed the Google Calendar operation.`
              : `🛑 **Action Vetoed:** You rejected the authorization request. No changes were applied to your calendar.`,
        },
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Decision error: ${errorMsg}`);
    } finally {
      setDecisionLoading(null);
    }
  }

  async function handleResetChat() {
    if (!confirm("Are you sure you want to clear the conversation history?")) return;
    await fetch("/api/agent/reset", { method: "POST" });
    setMessages([]);
  }

  const promptSuggestions = [
    {
      label: "Show today's meetings",
      prompt: "Show me my meetings for today.",
      badge: "LOW RISK (READ)",
    },
    {
      label: "Find open time slots",
      prompt: "Find an available slot tomorrow.",
      badge: "LOW RISK (READ)",
    },
    {
      label: "Schedule CEO Meeting (CIBA Demo)",
      prompt:
        "Schedule a project review with the CEO tomorrow at 3 PM and invite ceo@example.com.",
      badge: "HIGH RISK (PAUSE & CIBA)",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">VETO AI Assistant</h2>
            <p className="text-[11px] text-slate-500">
              Autonomous execution protected by Token Vault & RFC 8693 CIBA
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          title="Clear Chat History"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-200">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Ready to automate with complete control
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Ask questions about your calendar, find open slots, or prepare sensitive meetings.
              Notice how read actions execute smoothly, while high-impact actions pause for your final veto!
            </p>

            <div className="mt-6 w-full space-y-2 text-left">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Click a prompt to test:
              </p>
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(item.prompt)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      item.badge.includes("HIGH")
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100/80 text-slate-900 border border-slate-200/60"
                }`}
              >
                {/* Tool Badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {msg.toolCalls.map((tool, tIdx) => (
                      <div
                        key={tIdx}
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-white border border-slate-200 text-slate-600 mr-2"
                      >
                        <span className="text-slate-400">tool:</span>
                        <span className="font-semibold text-blue-600">{tool.name}</span>
                        <span className="text-slate-300">→</span>
                        <span
                          className={`font-bold ${
                            tool.status.includes("PAUSED")
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {tool.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* PENDING AUTHORIZATION CARD (The Core Hackathon Feature!) */}
                {msg.pendingAuthorization && (
                  <div className="mt-4 p-4 rounded-xl bg-white border-2 border-amber-300 shadow-md space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <div className="flex items-center space-x-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>Authorization Required (CIBA)</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                        HIGH RISK
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <p>
                        <strong>Target Action:</strong> {msg.pendingAuthorization.actionType}
                      </p>
                      <p>
                        <strong>Description:</strong> {msg.pendingAuthorization.summary}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        <strong>Target Service:</strong> Google Calendar (Token Vault Isolated)
                      </p>
                      <p className="text-amber-800 text-[11px] font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Execution Paused. Awaiting out-of-band user decision.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                      <a
                        href={msg.pendingAuthorization.approvalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <span>Open Mobile Approval Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <div className="flex w-full sm:w-auto gap-2">
                        <button
                          onClick={() =>
                            handleInlineDecision(msg.pendingAuthorization!.id, "approve")
                          }
                          disabled={Boolean(decisionLoading)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Run</span>
                        </button>
                        <button
                          onClick={() =>
                            handleInlineDecision(msg.pendingAuthorization!.id, "reject")
                          }
                          disabled={Boolean(decisionLoading)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Veto (Reject)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-100 rounded-2xl text-xs text-slate-500 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing request & evaluating execution permissions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Bar (quick chips) */}
      <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Try:</span>
        {promptSuggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(item.prompt)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask VETO AGENT (e.g. Schedule review with CEO tomorrow at 3 PM)..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center space-x-1.5"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
