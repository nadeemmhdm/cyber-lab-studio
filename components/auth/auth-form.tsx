"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

type Mode = "login" | "register" | "forgot" | "reset";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  devVerificationUrl?: string;
  devResetUrl?: string;
};

export function AuthForm({ mode, token, notice }: { mode: Mode; token?: string; notice?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(notice ?? "");
  const [tone, setTone] = useState<"info" | "success" | "error">(notice ? "success" : "info");
  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState("");
  const [needsResend, setNeedsResend] = useState(false);

  const titles: Record<Mode, { title: string; subtitle: string; submit: string }> = {
    login: { title: "Welcome back", subtitle: "Sign in to continue your cloud-security training.", submit: "Sign in" },
    register: { title: "Create your learner account", subtitle: "Start with an isolated student workspace and track every lab.", submit: "Create account" },
    forgot: { title: "Reset your password", subtitle: "We will send a short-lived reset link if the account exists.", submit: "Send reset link" },
    reset: { title: "Choose a new password", subtitle: "Use at least 10 characters with uppercase, lowercase, and a number.", submit: "Update password" },
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setDevLink("");
    setNeedsResend(false);
    const form = new FormData(event.currentTarget);
    const endpoints: Record<Mode, string> = {
      login: "/api/auth/login",
      register: "/api/auth/register",
      forgot: "/api/auth/password-reset/request",
      reset: "/api/auth/password-reset/confirm",
    };
    const body = mode === "register"
      ? { displayName: form.get("displayName"), email: form.get("email"), password: form.get("password") }
      : mode === "login"
        ? { email: form.get("email"), password: form.get("password") }
        : mode === "forgot"
          ? { email: form.get("email") }
          : { token, password: form.get("password") };

    try {
      const response = await fetch(endpoints[mode], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setTone("error");
        setMessage(data.error ?? "The request could not be completed.");
        setNeedsResend(data.code === "EMAIL_NOT_VERIFIED");
        return;
      }
      if (mode === "login") {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      if (mode === "reset") {
        router.replace("/login?reset=success");
        return;
      }
      setTone("success");
      setMessage(mode === "register" ? "Account created. Verify your email before signing in." : "If the account exists, a password-reset link has been issued.");
      setDevLink(data.devVerificationUrl ?? data.devResetUrl ?? "");
    } catch {
      setTone("error");
      setMessage("Network error. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!email) return;
    setBusy(true);
    await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => undefined);
    setBusy(false);
    setTone("success");
    setMessage("If the account is eligible, a new verification link has been issued.");
  }

  const meta = titles[mode];
  return (
    <div className="auth-card glass">
      <div>
        <p className="eyebrow">Secure account access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-3 text-sm leading-6 muted">{meta.subtitle}</p>
      </div>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        {mode === "register" ? <label className="field-label">Display name<input className="field-input" name="displayName" autoComplete="name" minLength={2} maxLength={80} required /></label> : null}
        {mode !== "reset" ? <label className="field-label">Email address<input className="field-input" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></label> : null}
        {mode === "login" || mode === "register" || mode === "reset" ? <label className="field-label">Password<input className="field-input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 10} maxLength={128} required /></label> : null}
        <button type="submit" className="button-primary w-full" disabled={busy}>{busy ? "Please wait…" : meta.submit}</button>
      </form>
      <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
      {devLink ? <a className="mt-3 block break-all text-sm font-medium" style={{ color: "var(--accent)" }} href={devLink}>Development link: {devLink}</a> : null}
      {needsResend ? <button type="button" className="button-secondary mt-3 w-full" onClick={resendVerification} disabled={busy}>Resend verification email</button> : null}
      {mode === "login" ? (
        <div className="mt-6 space-y-3 text-sm">
          <a className="button-secondary flex w-full justify-center" href="/api/auth/google/start">Continue with Google</a>
          <div className="flex items-center justify-between gap-3"><Link href="/forgot-password" className="text-link">Forgot password?</Link><Link href="/register" className="text-link">Create account</Link></div>
        </div>
      ) : null}
      {mode === "register" ? <p className="mt-6 text-sm muted">Already registered? <Link className="text-link" href="/login">Sign in</Link></p> : null}
      {mode === "forgot" || mode === "reset" ? <p className="mt-6 text-sm muted"><Link className="text-link" href="/login">Back to sign in</Link></p> : null}
    </div>
  );
}
