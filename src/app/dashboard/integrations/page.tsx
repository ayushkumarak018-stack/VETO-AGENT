"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Lock,
  RefreshCw,
  Trash2,
  ShieldAlert,
  ExternalLink,
  Code2,
  MessageSquare,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
  accountEmail?: string;
  scopes?: string[];
  isDemo?: boolean;
  isExpired?: boolean;
  lastSyncAt?: string;
  isPlaceholder?: boolean;
  supportedActions: Array<{
    name: string;
    risk: string;
    requiresAuth: boolean;
  }>;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(provider: string, demo = true) {
    setActionLoading(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/connect?demo=${demo}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.mode === "oauth" && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }

      await loadIntegrations();
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    setActionLoading(provider);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      await loadIntegrations();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Connected Services
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage third-party services accessed by VETO AGENT. All credentials are isolated in the AES-256-GCM Token Vault.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Checking Token Vault connection status...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {integrations.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs transition-all ${
                item.connected
                  ? "border-slate-200"
                  : item.isPlaceholder
                  ? "border-slate-200/60 opacity-80"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    {item.id === "google_calendar" ? (
                      <Calendar className="w-6 h-6" />
                    ) : item.id === "github" ? (
                      <Code2 className="w-6 h-6" />
                    ) : (
                      <MessageSquare className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                      {item.connected ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Connected</span>
                        </span>
                      ) : item.isPlaceholder ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Coming Soon
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Disconnected
                        </span>
                      )}

                      {item.isDemo && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Demo Mode
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {item.connected ? (
                    <button
                      onClick={() => handleDisconnect(item.id)}
                      disabled={Boolean(actionLoading)}
                      className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : item.isPlaceholder ? (
                    <button
                      disabled
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      Roadmap Planned
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConnect(item.id, true)}
                        disabled={Boolean(actionLoading)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Connect Demo (1-Click)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details Drawer when Connected */}
              {item.connected && (
                <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block mb-1">Connected Account:</span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {item.accountEmail || "alex.builder@workspace.internal"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block mb-1">Token Vault Security:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> AES-256-GCM Encrypted
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block mb-1">Last Vault Sync:</span>
                    <span className="font-semibold text-slate-900">
                      {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : "Active"}
                    </span>
                  </div>
                </div>
              )}

              {/* Supported Actions & Risk Classification Table */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Service Permission & Risk Matrix:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {item.supportedActions.map((action, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px] flex items-center justify-between"
                    >
                      <span className="text-slate-700 font-medium truncate pr-1">
                        {action.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                          action.risk === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {action.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

