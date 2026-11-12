"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Bot,
  Calendar,
  CheckSquare,
  Activity,
  History,
  Settings,
  LogOut,
  Mail,
  Lock,
  ExternalLink,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface OutboxItem {
  id: string;
  recipient: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  approvalLink: string;
  rejectionLink: string;
  sentAt: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [selectedMail, setSelectedMail] = useState<OutboxItem | null>(null);

  useEffect(() => {
    fetchSession();
    fetchOutbox();
    const interval = setInterval(fetchOutbox, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        // In local development, if session check fails, redirect to login
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOutbox() {
    try {
      const res = await fetch("/api/notifications/outbox");
      if (res.ok) {
        const data = await res.json();
        setOutbox(data.notifications || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "AI Assistant", href: "/dashboard/chat", icon: Bot },
    { label: "Connected Services", href: "/dashboard/integrations", icon: Calendar },
    { label: "Approval Requests", href: "/dashboard/approvals", icon: CheckSquare },
    { label: "Background Worker", href: "/dashboard/executions", icon: Activity },
    { label: "Security Audit", href: "/dashboard/audit", icon: History },
    { label: "Settings & Vault", href: "/dashboard/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Authenticating Veto Agent session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                VETO<span className="text-blue-600">AGENT</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Token Vault Cryptographic Seal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Vault: AES-256-GCM Active</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Credentials never exposed to AI model or browser context.
          </p>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="truncate mr-2">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "User"}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-900">
              {navItems.find((n) => n.href === pathname)?.label || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Out-of-band Notification Outbox Pill (Crucial for Hackathon Demonstration!) */}
            <button
              onClick={() => setOutboxOpen(true)}
              className="relative inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>OOB Notification Outbox</span>
              {outbox.length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-amber-600 text-white rounded-full">
                  {outbox.length}
                </span>
              )}
            </button>

            <Link
              href="/dashboard/chat"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Ask AI Agent
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Out-of-Band Notification Drawer Modal */}
      {outboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Out-of-Band Notification Center (CIBA)
                </h3>
              </div>
              <button
                onClick={() => {
                  setOutboxOpen(false);
                  setSelectedMail(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-blue-50/70 border-b border-blue-100 text-xs text-blue-800 leading-relaxed">
              <strong>Simulated Out-of-Band Channel:</strong> When the agent pauses execution on high-impact actions, it generates an out-of-band notification (email/push) with a single-use authorization token.
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {outbox.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No out-of-band messages yet. Try asking the agent to schedule a meeting with external invitees!
                </div>
              ) : selectedMail ? (
                <div>
                  <button
                    onClick={() => setSelectedMail(null)}
                    className="text-xs font-semibold text-blue-600 mb-3 hover:underline flex items-center gap-1"
                  >
                    ← Back to inbox
                  </button>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                    <p className="text-xs font-bold text-slate-900">{selectedMail.subject}</p>
                    <p className="text-[11px] text-slate-500">To: {selectedMail.recipient}</p>
                    <p className="text-[11px] text-slate-500">
                      Sent: {new Date(selectedMail.sentAt).toLocaleTimeString()}
                    </p>
                    <div className="pt-2 text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-slate-200">
                      {selectedMail.bodyText}
                    </div>
                    <div className="pt-3 flex gap-2">
                      <a
                        href={selectedMail.approvalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                      >
                        <span>Open Mobile Approval Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                outbox.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMail(item)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        Action Required
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{item.subject}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.bodyText.trim()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
