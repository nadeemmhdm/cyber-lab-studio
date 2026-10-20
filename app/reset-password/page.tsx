import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <section className="auth-shell">
      <div className="auth-card glass">
        <p className="eyebrow">Firebase password reset</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Use the link in your email</h1>
        <p className="mt-3 text-sm leading-6 muted">
          Password reset links are generated and verified by Firebase Authentication. Request a fresh link below, then follow the secure Firebase email action flow.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="button-primary inline-flex justify-center" href="/forgot-password">Request reset link</Link>
          <Link className="button-secondary inline-flex justify-center" href="/login">Back to sign in</Link>
        </div>
      </div>
    </section>
  );
}
