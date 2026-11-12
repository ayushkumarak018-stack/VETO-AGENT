"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  Code,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface ExecutionItem {
  id: string;
  actionType: string;
  executionStatus: string;
  idempotencyKey: string;
  result?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  authorizationRequest?: {
    actionDescription: string;
    riskLevel: string;
    status: string;
    provider: string;
  };
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
    const interval = setInterval(loadExecutions, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadExecutions() {
    try {
      const res = await fetch("/api/executions");
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.executions || []);
      }
    } catch (err) {
      console.error("Failed to load executions:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Background Execution Worker
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Durable, database-backed job runner. High-impact operations pause safely in PENDING_APPROVAL and resume only when explicit CIBA authorization is verified.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Loading worker jobs...</p>
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Activity className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No background executions recorded</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Operations triggered by the AI assistant will be tracked here with idempotency verification and state machine tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {executions.map((exec) => (
            <div
              key={exec.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      exec.executionStatus === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : exec.executionStatus === "PENDING_APPROVAL"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : exec.executionStatus === "CANCELLED"
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {exec.executionStatus}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">
                    {exec.authorizationRequest?.actionDescription || exec.actionType}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Started: {new Date(exec.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">IDEMPOTENCY KEY</span>
                  <span className="truncate block font-semibold text-slate-800">
                    {exec.idempotencyKey}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TARGET PROVIDER</span>
                  <span className="truncate block font-semibold text-slate-800">
                    {exec.authorizationRequest?.provider || "google_calendar"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">COMPLETED AT</span>
                  <span className="truncate block font-semibold text-slate-800">
                    {exec.completedAt
                      ? new Date(exec.completedAt).toLocaleTimeString()
                      : "Awaiting approval"}
                  </span>
                </div>
              </div>

              {exec.result && (
                <div className="pt-2">
                  <button
                    onClick={() =>
                      setSelectedResult(
                        selectedResult === exec.id ? null : exec.id
                      )
                    }
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>
                      {selectedResult === exec.id
                        ? "Hide execution payload"
                        : "Inspect third-party API result (JSON)"}
                    </span>
                  </button>

                  {selectedResult === exec.id && (
                    <pre className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] overflow-x-auto font-mono">
                      {JSON.stringify(JSON.parse(exec.result), null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
