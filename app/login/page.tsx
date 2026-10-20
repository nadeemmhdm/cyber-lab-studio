import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verification?: string; reset?: string }> }) {
  if (await getCurrentSession()) redirect("/dashboard");
  const query = await searchParams;
  const notice = query.verification === "success" ? "Email verified. You can sign in now." : query.reset === "success" ? "Password updated. Sign in with your new password." : undefined;
  return <section className="auth-shell"><AuthForm mode="login" notice={notice} /></section>;
}
