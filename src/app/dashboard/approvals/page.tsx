"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Calendar,
  User,
} from "lucide-react";

interface ApprovalReq {
  id: string;
  provider: string;
  actionType: string;
  actionDescription: string;
  actionPayload: string;
  riskLevel: string;
  status: string;
  cibaRequestId: string;
  approvalNonce: string;
  expiresAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  agentExecution?: {
    id: string;
    executionStatus: string;
    result?: string;
  };
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadRequests() {
    try {
      const res = await fetch("/api/authorization/pending");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to load approvals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(id: string, decision: "approve" | "reject") {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/authorization/${id}/${decision}`, {
        method: "POST",
      });
      if (res.ok) {
        await loadRequests();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Authorization Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review and grant explicit authorization for sensitive AI operations via CIBA protocol.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EXPIRED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === st
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "PENDING_APPROVAL"
                ? "Pending"
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Checking pending authorizations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No requests in this category</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When you ask the AI assistant to perform high-impact operations like booking external meetings, authorization requests will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const isPending = req.status === "PENDING_APPROVAL";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let payload: any = {};
            try {
              payload = JSON.parse(req.actionPayload);
            } catch {
              // ignore
            }

            const approvalUrl = `/approve/${req.cibaRequestId}?token=${req.approvalNonce}&action=approve`;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  isPending ? "border-amber-300 ring-2 ring-amber-400/10" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : req.status === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                            : req.status === "REJECTED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {req.status === "PENDING_APPROVAL" ? "Awaiting Decision" : req.status}
                      </span>

                      <span className="text-[10px] font-mono uppercase bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                        {req.riskLevel} Risk
                      </span>

                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        Requested: {new Date(req.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 pt-1">
                      {req.actionDescription}
                    </h3>

                    <p className="text-xs text-slate-500 font-mono">
                      auth_req_id: {req.cibaRequestId}
                    </p>
                  </div>

                  {/* Action Controls for Pending requests */}
                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={approvalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Mobile Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDecision(req.id, "approve")}
                        disabled={Boolean(actionLoading)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, "reject")}
                        disabled={Boolean(actionLoading)}
                        className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Veto (Reject)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stored Payload Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Scheduled Time:</span>
                      <span className="font-semibold">
                        {payload.startTime ? new Date(payload.startTime).toLocaleString() : "Not specified"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">External Invitees:</span>
                      <span className="font-semibold text-blue-700">
                        {payload.attendees?.join(", ") || "None"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Execution Status:</span>
                      <span className="font-semibold">
                        {req.agentExecution?.executionStatus || "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
