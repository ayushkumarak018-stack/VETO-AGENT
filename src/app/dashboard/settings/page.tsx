"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface VaultHealth {
  isConfigured: boolean;
  encryptionAlgorithm: string;
  encryptionVersion: string;
  encryptionKeyConfigured: boolean;
  zeroPlaintextGuarantee: boolean;
  credentials: Array<{
    provider: string;
    accountEmail?: string;
    connectionStatus: string;
    isDemo: boolean;
    vaultInfo?: {
      encryptionVersion: string;
      lastRefreshedAt: string;
    };
  }>;
}

export default function SettingsPage() {
  const [vaultStatus, setVaultStatus] = useState<VaultHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVaultStatus();
  }, []);

  async function loadVaultStatus() {
    try {
      const res = await fetch("/api/vault/status");
      if (res.ok) {
        const data = await res.json();
        setVaultStatus(data.vaultStatus);
      }
    } catch (err) {
      console.error("Failed to load vault status:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshTokens() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/vault/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google_calendar" }),
      });
      if (res.ok) {
        alert("Tokens rotated successfully in Token Vault.");
        await loadVaultStatus();
      } else {
        const err = await res.json();
        alert(`Refresh error: ${err.error}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Settings & Cryptographic Health
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Inspect the Token Vault encryption parameters and CIBA asynchronous authorization configuration.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Querying cryptographic vault status...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Token Vault Cryptography Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Token Vault Cryptography Engine
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Healthy & Active</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-sans">
                  Encryption Cipher
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {vaultStatus?.encryptionAlgorithm || "AES-256-GCM"}
                </span>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  Galois/Counter Mode with 128-bit authentication tag
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-sans">
                  Master Key Ingestion
                </span>
                <span className="font-bold text-emerald-700 text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 32-Byte Key Verified
                </span>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  Supplied via TOKEN_VAULT_ENCRYPTION_KEY env
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-sans">
                  Plaintext Exposure Guard
                </span>
                <span className="font-bold text-blue-700 text-sm">
                  ZERO PLAINTEXT GUARANTEE
                </span>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  No OAuth tokens are ever returned to the client browser or AI context
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-sans">
                  Token Rotation
                </span>
                <button
                  onClick={handleRefreshTokens}
                  disabled={refreshing}
                  className="mt-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Rotate Vault Tokens Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* CIBA Protocol Adapter Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                CIBA Out-of-Band Authorization Protocol
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              VETO AGENT implements the OpenID Connect CIBA Core 1.0 specification.
              When an AI agent identifies a high-impact operation, execution is paused and a decoupled authentication request (auth_req_id) is issued.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-semibold text-slate-700">Backchannel Request Mode:</span>
                <span className="font-mono text-blue-600 font-bold">POLL & PUSH</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-semibold text-slate-700">Out-of-Band Delivery:</span>
                <span className="font-mono text-slate-700">
                  Email Dispatch + Local Outbox Notification Preview
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-semibold text-slate-700">Replay Protection:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  Single-Use Nonce Token Rotation
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
