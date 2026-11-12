"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Bot,
  Calendar,
  CheckSquare,
  Activity,
  History,
  Lock,
  ArrowRight,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

interface OverviewData {
  connectedServicesCount: number;
  pendingApprovalsCount: number;
  completedExecutionsCount: number;
  auditEventsCount: number;
  recentExecutions: Array<{
    id: string;
    actionType: string;
    executionStatus: string;
    createdAt: string;
    authorizationRequest?: {
      actionDescription: string;
      riskLevel: string;
    };
  }>;
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData>({
    connectedServicesCount: 1,
    pendingApprovalsCount: 0,
    completedExecutionsCount: 0,
    auditEventsCount: 0,
    recentExecutions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const [integrationsRes, approvalsRes, executionsRes, auditRes] =
        await Promise.all([
          fetch("/api/integrations"),
          fetch("/api/authorization/pending"),
          fetch("/api/executions"),
          fetch("/api/audit"),
        ]);

      const integrations = integrationsRes.ok ? await integrationsRes.json() : { integrations: [] };
      const approvals = approvalsRes.ok ? await approvalsRes.json() : { requests: [] };
      const executions = executionsRes.ok ? await executionsRes.json() : { executions: [] };
      const audit = auditRes.ok ? await auditRes.json() : { logs: [] };

      const connected = (integrations.integrations || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.connected
      ).length;

      const pending = (approvals.requests || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.status === "PENDING_APPROVAL"
      ).length;

      const completed = (executions.executions || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => e.executionStatus === "COMPLETED"
      ).length;

      setData({
        connectedServicesCount: connected,
        pendingApprovalsCount: pending,
        completedExecutionsCount: completed,
        auditEventsCount: (audit.logs || []).length,
        recentExecutions: (executions.executions || []).slice(0, 5),
      });
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Zero-Trust Autonomous Execution Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to VETO AGENT
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Your AI assistant manages tasks and retrieves information across your connected tools. When an operation carries high impact, execution pauses and awaits your out-of-band authorization.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/chat"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center space-x-2 transition-all shadow-md shadow-blue-600/30"
            >
              <Bot className="w-4 h-4" />
              <span>Open AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard/integrations"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs sm:text-sm border border-white/20 flex items-center space-x-2 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Manage Connected Services</span>
            </Link>
          </div>
        </div>

        {/* Ambient glow decoration */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Connected Services
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.connectedServicesCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Google Calendar (OAuth 2.0 Vault)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.pendingApprovalsCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">Awaiting Out-of-Band Veto/Approval</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Tasks
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.completedExecutionsCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Authorized & safely executed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Audit Logs Recorded
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.auditEventsCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cryptographically immutable</p>
        </div>
      </div>

      {/* Security Status & Quick Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Agent Execution Stream</h2>
            </div>
            <Link
              href="/dashboard/executions"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {data.recentExecutions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No executions yet. Head over to the{" "}
              <Link href="/dashboard/chat" className="text-blue-600 font-semibold underline">
                AI Assistant
              </Link>{" "}
              to run a command.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentExecutions.map((exec) => (
                <div key={exec.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {exec.authorizationRequest?.actionDescription || exec.actionType}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(exec.createdAt).toLocaleTimeString()} • Risk:{" "}
                      <span className="font-semibold text-slate-700">
                        {exec.authorizationRequest?.riskLevel || "STANDARD"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      exec.executionStatus === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : exec.executionStatus === "PENDING_APPROVAL"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : exec.executionStatus === "CANCELLED"
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {exec.executionStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Posture Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Security Architecture</h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-800 block">Token Vault Isolation</span>
                AES-256-GCM authenticated cipher. AI model never receives OAuth tokens.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-800 block">RFC 8693 CIBA Core</span>
                Backchannel authentication request (auth_req_id) with single-use nonce tokens.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-800 block">Idempotent Background Worker</span>
                Ensures actions cannot be double-approved or replayed.
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/settings"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center justify-between"
            >
              <span>Inspect Cryptographic Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
