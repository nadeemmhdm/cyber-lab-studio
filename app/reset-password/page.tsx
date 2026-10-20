import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <section className="auth-shell"><div className="auth-card glass"><h1 className="text-2xl font-semibold">Invalid reset link</h1><p className="mt-3 muted">Request a fresh password reset link.</p><Link className="button-primary mt-6 inline-flex" href="/forgot-password">Request reset</Link></div></section>;
  return <section className="auth-shell"><AuthForm mode="reset" token={token} /></section>;
}
