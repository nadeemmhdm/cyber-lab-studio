import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Join CyberLab" };

export default async function RegisterPage() {
  if (await getCurrentSession()) redirect("/dashboard");
  return <section className="auth-shell"><div className="auth-card glass"><p className="eyebrow">Managed enrollment</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">How to join CyberLab</h1><p className="mt-3 text-sm leading-6 muted">Public self-registration is disabled so training access stays under administrator and instructor control.</p><div className="mt-6 space-y-4"><div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><h2 className="font-semibold">Students</h2><p className="mt-2 text-sm leading-6 muted">Your instructor generates one enrollment link with a fixed number of seats. Open that link and choose your own unique username and password.</p></div><div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><h2 className="font-semibold">Instructors</h2><p className="mt-2 text-sm leading-6 muted">Instructor accounts are created by a platform administrator. After signing in, instructors can generate capped enrollment links for their students.</p></div><div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><h2 className="font-semibold">First administrator</h2><p className="mt-2 text-sm leading-6 muted">A new installation uses the protected first-run setup flow at <code>/setup</code>. After the first administrator exists, that setup path is permanently disabled.</p></div></div><Link href="/login" className="button-primary mt-6 flex w-full justify-center">Back to sign in</Link></div></section>;
}
