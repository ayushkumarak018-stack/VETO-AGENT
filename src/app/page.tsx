import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  BellRing,
  Lock,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Sparkles,
  RefreshCw,
  EyeOff,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs sm:text-sm font-medium py-2 px-4 text-center">
        🏆 Built for MLH Global Hack Week — Builders Week:{" "}
        <span className="underline font-semibold ml-1">
          The Veto Agent (Focus: Token Vault & Asynchronous Authorization)
        </span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                VETO<span className="text-blue-600">AGENT</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                CIBA Vault
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#token-vault" className="hover:text-blue-600 transition-colors">
              Token Vault
            </a>
            <a href="#ciba-auth" className="hover:text-blue-600 transition-colors">
              CIBA Authorization
            </a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">
              Architecture
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm shadow-blue-600/30 transition-all flex items-center space-x-1.5"
            >
              <span>Explore Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 rounded-full px-3.5 py-1.5 mb-6 text-xs sm:text-sm font-medium text-blue-700 shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Privacy-Conscious AI with Zero-Trust Execution</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight sm:leading-tight">
            Your AI. Your Services.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
              Your Final Say.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AI assistants need access to your tools, but they should never have unchecked authority.
            VETO AGENT acts across your connected services, pauses on high-impact actions, and requires your explicit out-of-band authorization before committing changes.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 text-base transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-300/80 flex items-center justify-center space-x-2 text-base transition-all"
            >
              <span>Instant Demo Login</span>
            </Link>
          </div>

          {/* Interactive Feature Pills */}
          <div className="mt-14 pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center space-x-2 text-blue-600 font-semibold text-sm">
                <Lock className="w-4 h-4" />
                <span>AES-256-GCM Vault</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Tokens never sent to AI model or browser</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center space-x-2 text-indigo-600 font-semibold text-sm">
                <BellRing className="w-4 h-4" />
                <span>CIBA Authorization</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Asynchronous out-of-band approval</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center space-x-2 text-amber-600 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Risk Engine</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Automatic low/med/high classification</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-sm">
                <RefreshCw className="w-4 h-4" />
                <span>Durable Worker</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Safe pause & idempotent execution</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Execution Lifecycle
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              How VETO AGENT Keeps You in Control
            </p>
            <p className="mt-4 text-slate-600 text-base">
              The AI prepares high-impact operations autonomously, but the execution layer enforces hard boundaries using cryptographic authorization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-lg mb-5">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Task Request & Risk Analysis</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                You ask the agent to act (e.g. <em>&quot;Schedule a meeting with the CEO and invite ceo@example.com&quot;</em>).
                The backend risk engine identifies external invitees and flags it as <strong>HIGH RISK</strong>.
              </p>
              <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
                Action: create_calendar_event<br />
                Risk: HIGH (External Attendees)
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-7 rounded-2xl border border-blue-200 shadow-sm relative ring-2 ring-blue-500/10">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-lg mb-5">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Execution Pauses & CIBA Dispatches</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                The agent halts immediately. <strong>Zero write APIs are called.</strong> A persistent CIBA request is stored in the database, and an out-of-band notification is dispatched to your email/device.
              </p>
              <div className="mt-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Status: PENDING_APPROVAL<br />
                Out-of-band email sent with one-time nonce
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-lg mb-5">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Out-of-Band Decision & Final Say</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Outside the chat session, you review the exact parameters on a dedicated approval page. You can approve or exercise your <strong>Veto</strong>. Only on approval does the worker execute.
              </p>
              <div className="mt-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                ✓ Approve: Token Vault unlocks & executes<br />
                ✗ Veto: Cancelled permanently
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Vault Section */}
      <section id="token-vault" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Centralized Security</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight leading-tight">
                The Token Vault: Complete Credential Isolation
              </h2>
              <p className="mt-4 text-slate-600 text-base leading-relaxed">
                In typical AI integrations, LLMs receive API credentials directly in their context window, creating catastrophic prompt injection and token leakage risks.
              </p>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                VETO AGENT isolates all OAuth access and refresh tokens inside a fortified Token Vault. Tokens are encrypted using <strong>AES-256-GCM</strong> with authenticated cipher integrity.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Zero Model Exposure:</strong> The LLM never sees raw tokens, secrets, or refresh keys.
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Zero Browser Leaks:</strong> Tokens are never transmitted to the frontend or serialized in responses.
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Autonomous Token Rotation:</strong> Background refresh without disrupting user flows.
                  </span>
                </div>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-2xl shadow-xl font-mono text-xs sm:text-sm border border-slate-800">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <span className="text-emerald-400 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> TOKEN_VAULT_ENCRYPTED_STORAGE
                </span>
                <span className="text-slate-500">AES-256-GCM</span>
              </div>

              <div className="space-y-3">
                <p className="text-slate-400">{"// Database Record Inspection (No plaintext)"}</p>
                <div className="bg-slate-950 p-4 rounded-xl space-y-1.5 text-slate-300">
                  <div>provider: <span className="text-amber-300">&quot;google_calendar&quot;</span>,</div>
                  <div>encryptedAccessToken: <span className="text-cyan-300">&quot;X8d/k9...==&quot;</span>,</div>
                  <div>iv: <span className="text-purple-300">&quot;12_byte_base64_iv&quot;</span>,</div>
                  <div>authTag: <span className="text-pink-300">&quot;16_byte_gcm_tag&quot;</span>,</div>
                  <div>scopes: [<span className="text-blue-300">&quot;calendar.events&quot;</span>],</div>
                  <div>expiresAt: <span className="text-emerald-300">&quot;2026-11-12T18:00:00Z&quot;</span></div>
                </div>
                <div className="pt-2 text-slate-400 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                  <span>Decryption restricted to authorized Execution Worker only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CIBA Section */}
      <section id="ciba-auth" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Standard Compliance
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              OAuth 2.0 Client-Initiated Backchannel Authentication (CIBA)
            </p>
            <p className="mt-4 text-slate-600 text-base">
              Compliant with the OpenID Connect CIBA Core 1.0 specification. The agent initiates authentication without user interaction in the current client browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900">auth_req_id Issuance</h4>
              <p className="text-xs text-slate-600 mt-2">
                Generates unique backchannel identifiers for tracking pending operations across distributed backends.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900">Out-of-Band Channel</h4>
              <p className="text-xs text-slate-600 mt-2">
                Notification dispatches via mobile email or push, allowing decisions on independent trusted devices.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900">Single-Use Nonces</h4>
              <p className="text-xs text-slate-600 mt-2">
                Cryptographic rotation prevents replay attacks and double approvals immediately upon decision.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900">Idempotent Execution</h4>
              <p className="text-xs text-slate-600 mt-2">
                Guarantees that calendar modifications and external API calls execute exactly once.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">
              VETO<span className="text-blue-600">AGENT</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 text-center sm:text-left">
            Built for MLH Global Hack Week — Builders Week • Next.js, Prisma, AES-256-GCM, CIBA Protocol
          </p>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Open Dashboard
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

