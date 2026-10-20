import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CyberLab Studio Pro",
    template: "%s | CyberLab Studio Pro",
  },
  description: "Interactive cloud-security training for AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--background) 82%, transparent)" }}>
          <div className="shell flex min-h-16 items-center justify-between gap-4 py-2">
            <Link href="/" className="focus-ring flex items-center gap-2 rounded-lg font-semibold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">CyberLab Studio Pro</span>
              <span className="sm:hidden">CyberLab</span>
            </Link>

            <nav className="flex items-center gap-2" aria-label="Primary navigation">
              <Link href="/labs" className="focus-ring rounded-lg px-3 py-2 text-sm font-medium muted hover:text-[var(--foreground)]">
                Labs
              </Link>
              <Link href="/api/health" className="focus-ring hidden rounded-lg px-3 py-2 text-sm font-medium muted hover:text-[var(--foreground)] md:block">
                Health
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t py-8" style={{ borderColor: "var(--border)" }}>
          <div className="shell flex flex-col gap-2 text-sm muted sm:flex-row sm:items-center sm:justify-between">
            <p>CyberLab Studio Pro — safe simulated cloud-security learning.</p>
            <p>Real credentials are never required for simulator mode.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
