import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { getCurrentSession } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = { title: { default: "CyberLab Studio Pro", template: "%s | CyberLab Studio Pro" }, description: "Interactive cloud-security training for AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR." };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getCurrentSession();
  return <html lang="en" suppressHydrationWarning><body><a href="#main-content" className="skip-link">Skip to main content</a><header className="site-header sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--background) 84%, transparent)" }}><div className="shell relative flex min-h-16 items-center justify-between gap-3 py-2"><Link href="/" className="brand-link focus-ring flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight"><span className="brand-mark grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><ShieldCheck size={20} aria-hidden="true" /></span><span className="hidden sm:inline">CyberLab Studio Pro</span><span className="sm:hidden">CyberLab</span></Link><SiteNavigation signedIn={Boolean(session)} roles={session?.user.roles ?? []} /></div></header><main id="main-content" className="route-main" tabIndex={-1}>{children}</main><footer className="mt-20 border-t py-8" style={{ borderColor: "var(--border)" }}><div className="shell flex flex-col gap-3 text-sm muted sm:flex-row sm:items-center sm:justify-between"><p>CyberLab Studio Pro — isolated cloud-security training environments.</p><div className="flex flex-wrap gap-4"><Link href="/docs" className="text-link">Docs</Link>{session ? <><Link href="/support" className="text-link">Support</Link>{session.user.roles.includes("ADMIN") ? <Link href="/system-health" className="text-link">System health</Link> : null}</> : null}</div></div></footer></body></html>;
}
