import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VETO AGENT — Your AI. Your Services. Your Final Say.",
  description:
    "Full-stack AI assistant with centralized Token Vault and Asynchronous Authorization (CIBA). The AI automates tasks across connected services, but sensitive operations pause for your final veto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
