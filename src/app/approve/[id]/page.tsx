"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

interface RequestDetail {
  id: string;
  cibaRequestId: string;
  provider: string;
  actionType: string;
  actionDescription: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionPayload: any;
  riskLevel: string;
  status: string;
  expiresAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function OutOfBandApprovalPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params.id as string;
  const token = searchParams.get("token") || "";
  const initialAction = searchParams.get("action"); // 'approve' or 'reject' from link

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<string | null>(null);

  useEffect(() => {
    loadRequest();
  }, [id, token]);

  async function loadRequest() {
    setLoading(true);
    try {
      const res = await fetch(`/api/authorization/${id}?token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load authorization request");
      }
      setRequest(data.request);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(decision: "approve" | "reject") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/authorization/${id}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${decision} request`);
      }

      setDecisionOutcome(decision);
      await loadRequest();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              VETO<span className="text-blue-600">AGENT</span>
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Out-of-Band Asynchronous Authorization (RFC 8693 CIBA)
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-xs text-slate-500 font-medium">Verifying authorization token & parameters...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Authorization Link Invalid or Expired</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">{error}</p>
              <div className="pt-2">
                <a
                  href="/dashboard/approvals"
                  className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Return to Dashboard
                </a>
              </div>
            </div>
          ) : request ? (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    request.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : request.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : request.status === "EXPIRED"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-amber-100 text-amber-800 animate-pulse"
                  }`}
                >
                  {request.status === "PENDING_APPROVAL" ? "Awaiting Your Decision" : request.status}
                </span>

                <span className="text-xs font-mono text-slate-400">
                  ID: {request.cibaRequestId.substring(0, 16)}...
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {request.actionDescription}
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Your AI assistant is attempting to perform this high-impact action on your connected{" "}
                  <strong>Google Calendar</strong>. Execution is currently <strong>paused</strong>. No changes will take place without your explicit approval.
                </p>
              </div>

              {/* Action Details Grid */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700 font-sans">
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400">Target Service:</span>
                  <span className="font-semibold text-slate-900">Google Calendar</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400">Scheduled Time:</span>
                  <span className="font-semibold text-slate-900">
                    {request.actionPayload?.startTime
                      ? new Date(request.actionPayload.startTime).toLocaleString("en-US", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })
                      : "Not specified"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400">External Invitees:</span>
                  <span className="font-semibold text-blue-700">
                    {request.actionPayload?.attendees?.join(", ") || "None"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400">Risk Level:</span>
                  <span className="font-bold text-red-700 uppercase">{request.riskLevel}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Expires At:</span>
                  <span className="font-medium text-slate-600">
                    {new Date(request.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Decision Section */}
              {request.status === "PENDING_APPROVAL" ? (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleDecision("approve")}
                    disabled={submitting}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 text-sm transition-all transform hover:-translate-y-0.5"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>✓ APPROVE ACTION & EXECUTE</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDecision("reject")}
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold rounded-2xl border border-slate-300/80 flex items-center justify-center space-x-2 text-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>✗ VETO (REJECT OPERATION)</span>
                  </button>
                </div>
              ) : request.status === "APPROVED" ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">Operation Successfully Approved</h4>
                  <p className="text-xs text-emerald-700">
                    The background execution worker was resumed, and the calendar event was created.
                  </p>
                </div>
              ) : request.status === "REJECTED" ? (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                  <h4 className="text-sm font-bold text-red-900">Operation Vetoed by User</h4>
                  <p className="text-xs text-red-700">
                    The pending action has been cancelled permanently. No third-party APIs were called.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-100 text-center text-xs text-slate-600">
                  This request has expired.
                </div>
              )}

              {/* Security notice footer */}
              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  🔒 Single-use cryptographic token • VETO AGENT Zero-Trust Security Protocol
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
