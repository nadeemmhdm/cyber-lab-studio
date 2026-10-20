import type { Metadata } from "next";
import Link from "next/link";
import { RoleType } from "@prisma/client";
import { BookOpen, Gauge, LifeBuoy, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentSession } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = { title: { default: "CyberLab Studio Pro", template: "%s | CyberLab Studio Pro" }, description: "Interactive cloud-security training for AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR." };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getCurrentSession();
  const instructor = session?.user.roles.includes(RoleType.INSTRUCTOR) || session?.user.roles.includes(RoleType.ADMIN);
  const admin = session?.user.roles.includes(RoleType.ADMIN);
  return <html lang="en" suppressHydrationWarning><body><a href="#main-content" className="skip-link">Skip to main content</a><header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--background) 84%, transparent)" }}><div className="shell flex min-h-16 items-center justify-between gap-3 py-2"><Link href="/" className="focus-ring flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><ShieldCheck size={20} aria-hidden="true" /></span><span className="hidden sm:inline">CyberLab Studio Pro</span><span className="sm:hidden">CyberLab</span></Link><nav className="nav-scroll" aria-label="Primary navigation"><Link href="/labs" className="nav-link"><BookOpen size={16} />Labs</Link>{session ? <><Link href="/dashboard" className="nav-link"><Gauge size={16} />Dashboard</Link>{instructor ? <Link href="/instructor" className="nav-link"><UsersRound size={16} />Instructor</Link> : null}{admin ? <Link href="/admin" className="nav-link"><Settings size={16} />Admin</Link> : null}<Link href="/support" className="nav-link"><LifeBuoy size={16} />Support</Link><Link href="/profile" className="nav-link"><UserRound size={16} />Profile</Link></> : <><Link href="/login" className="nav-link">Sign in</Link><Link href="/register" className="nav-link nav-link-primary">Create account</Link></>}<ThemeToggle />{session ? <LogoutButton /> : null}</nav></div></header><main id="main-content" tabIndex={-1}>{children}</main><footer className="mt-20 border-t py-8" style={{ borderColor: "var(--border)" }}><div className="shell flex flex-col gap-3 text-sm muted sm:flex-row sm:items-center sm:justify-between"><p>CyberLab Studio Pro — isolated cloud-security training environments.</p><div className="flex gap-4"><Link href="/docs" className="text-link">Docs</Link>{session ? <><Link href="/support" className="text-link">Support</Link><Link href="/system-health" className="text-link">System health</Link></> : null}</div></div></footer></body></html>;
}
