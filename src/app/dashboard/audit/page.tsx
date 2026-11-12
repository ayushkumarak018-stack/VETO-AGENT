"use client";

import { useEffect, useState } from "react";
import {
  History,
  ShieldCheck,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  provider?: string;
  resourceType: string;
  resourceId?: string;
  outcome: string;
  metadata?: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOutcome, setFilterOutcome] = useState<string>("ALL");

  useEffect(() => {
    loadLogs();
  }, [filterOutcome]);

  async function loadLogs() {
    setLoading(true);
    try {
      const url =
        filterOutcome === "ALL"
          ? "/api/audit"
          : `/api/audit?outcome=${filterOutcome}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Security & Compliance Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Immutable forensic log of every Token Vault access, CIBA request, authorization grant, and agent tool execution.
          </p>
        </div>

        {/* Filter Outcome */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {["ALL", "SUCCESS", "BLOCKED", "PENDING", "FAILURE"].map((out) => (
            <button
              key={out}
              onClick={() => setFilterOutcome(out)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterOutcome === out
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {out}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Querying security audit store...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <History className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No audit events match your filter</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource Type</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.resourceType}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.outcome === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.outcome === "BLOCKED"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : log.outcome === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                      {log.metadata || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
