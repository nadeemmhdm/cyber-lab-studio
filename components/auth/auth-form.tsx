"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  getMultiFactorResolver,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
  type Auth,
  type User,
} from "firebase/auth";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { prepareFirebaseAuth } from "@/lib/firebase/client";

type Mode = "login" | "forgot";
type SessionResponse = { ok?: boolean; error?: string; retryAfter?: number };
type MfaResolver = ReturnType<typeof getMultiFactorResolver>;

function studentEmail(identifier: string) {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@students.cyberlab.local`;
}

function friendlyFirebaseError(error: unknown) {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : "The request could not be completed.";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Username/email or password is incorrect.",
    "auth/user-not-found": "Username/email or password is incorrect.",
    "auth/wrong-password": "Username/email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address or username.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/network-request-failed": "Network error. Check your connection and retry.",
    "auth/too-many-requests": "Firebase temporarily blocked additional attempts. Try again later.",
    "auth/invalid-verification-code": "The authenticator code is invalid or expired.",
    "auth/code-expired": "The authenticator code expired. Enter the current code.",
  };
  return messages[error.code] ?? "Authentication could not be completed.";
}

async function loginGuard(identifier: string, action: "check" | "failure" | "success") {
  const response = await fetch("/api/auth/login-guard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, action }),
  });
  const data = await response.json() as { error?: string; allowed?: boolean; retryAfter?: number };
  if (!response.ok && action === "check") throw new Error(data.error ?? `Too many attempts. Try again in ${data.retryAfter ?? 60} seconds.`);
  return data;
}

async function createServerSession(user: User) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Could not initialize secure sign-in.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, csrfToken }),
  });
  const data = (await response.json()) as SessionResponse;
  if (!response.ok) throw new Error(data.error ?? "Could not create a secure session.");
}

export function AuthForm({ mode, notice }: { mode: Mode; notice?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(notice ?? "");
  const [tone, setTone] = useState<"info" | "success" | "error">(notice ? "success" : "info");
  const [identifier, setIdentifier] = useState("");
  const [mfaResolver, setMfaResolver] = useState<MfaResolver | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingIdentifier, setPendingIdentifier] = useState("");

  const meta = mode === "login"
    ? { title: "Welcome back", subtitle: "Students sign in with username or email. Instructors and administrators can use their email or Google account.", submit: "Sign in" }
    : { title: "Reset your password", subtitle: "Password reset email is available for accounts with a real email address. Username-only student accounts should contact their instructor or administrator.", submit: "Send reset link" };

  async function finishSignedInUser(user: User, auth: Auth, guardIdentifier?: string) {
    if (!user.emailVerified) {
      await sendEmailVerification(user, { url: `${window.location.origin}/login?verified=check` });
      await signOut(auth);
      setTone("error");
      setMessage("Verify your email first. A new verification email has been sent.");
      return false;
    }
    await createServerSession(user);
    if (guardIdentifier) await loginGuard(guardIdentifier, "success").catch(() => undefined);
    await signOut(auth);
    setMfaResolver(null);
    router.replace("/dashboard");
    router.refresh();
    return true;
  }

  function startMfa(auth: Auth, error: FirebaseError, guardIdentifier?: string) {
    const resolver = getMultiFactorResolver(auth, error as Parameters<typeof getMultiFactorResolver>[1]);
    const totp = resolver.hints.find((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!totp) throw new Error("This account requires an unsupported second factor.");
    setMfaResolver(resolver);
    setPendingIdentifier(guardIdentifier ?? "");
    setMfaCode("");
    setTone("info");
    setMessage(`Two-factor authentication is required${totp.displayName ? ` (${totp.displayName})` : ""}. Enter the 6-digit code from your authenticator app.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const loginIdentifier = String(form.get("identifier") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    try {
      const auth = await prepareFirebaseAuth();
      if (mode === "forgot") {
        if (!loginIdentifier.includes("@")) {
          setTone("info");
          setMessage("Student username accounts do not have a mailbox. Ask your instructor or administrator to reset the account password.");
          return;
        }
        await sendPasswordResetEmail(auth, loginIdentifier, { url: `${window.location.origin}/login?reset=success` });
        setTone("success");
        setMessage("If the account can receive password resets, Firebase has sent a reset link.");
        return;
      }

      await loginGuard(loginIdentifier, "check");
      try {
        const credential = await signInWithEmailAndPassword(auth, studentEmail(loginIdentifier), password);
        await finishSignedInUser(credential.user, auth, loginIdentifier);
      } catch (error) {
        if (error instanceof FirebaseError && error.code === "auth/multi-factor-auth-required") {
          startMfa(auth, error, loginIdentifier);
          return;
        }
        if (error instanceof FirebaseError && ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)) {
          const failure = await loginGuard(loginIdentifier, "failure").catch(() => ({ retryAfter: 0 }));
          if (failure.retryAfter) throw new Error(`Sign-in failed. Cooldown active for ${failure.retryAfter} seconds.`);
        }
        throw error;
      }
    } catch (error) {
      setTone("error");
      setMessage(friendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function resolveTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaResolver) return;
    setBusy(true);
    setMessage("");
    try {
      const hint = mfaResolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (!hint) throw new Error("TOTP second factor is not available.");
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, mfaCode.trim());
      const credential = await mfaResolver.resolveSignIn(assertion);
      const auth = await prepareFirebaseAuth();
      await finishSignedInUser(credential.user, auth, pendingIdentifier || undefined);
    } catch (error) {
      setTone("error");
      setMessage(friendlyFirebaseError(error));
    } finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true);
    setMessage("");
    try {
      const auth = await prepareFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        const credential = await signInWithPopup(auth, provider);
        await finishSignedInUser(credential.user, auth);
      } catch (error) {
        if (error instanceof FirebaseError && error.code === "auth/multi-factor-auth-required") {
          startMfa(auth, error);
          return;
        }
        throw error;
      }
    } catch (error) {
      setTone("error");
      setMessage(friendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card glass">
      <div><p className="eyebrow">Secure access</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{meta.title}</h1><p className="mt-3 text-sm leading-6 muted">{meta.subtitle}</p></div>
      {mfaResolver ? <form className="mt-7 space-y-4" onSubmit={resolveTotp}>
        <label className="field-label">Authenticator code<input className="field-input" inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
        <button type="submit" className="button-primary w-full" disabled={busy || mfaCode.length !== 6}>{busy ? "Verifying…" : "Verify 2FA code"}</button>
        <button type="button" className="button-secondary w-full" disabled={busy} onClick={() => { setMfaResolver(null); setMfaCode(""); setMessage(""); }}>Cancel</button>
      </form> : <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="field-label">{mode === "login" ? "Username or email" : "Email address"}<input className="field-input" name="identifier" type="text" autoComplete="username" maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
        {mode === "login" ? <label className="field-label">Password<input className="field-input" name="password" type="password" autoComplete="current-password" minLength={1} maxLength={128} required /></label> : null}
        <button type="submit" className="button-primary w-full" disabled={busy}>{busy ? "Please wait…" : meta.submit}</button>
      </form>}
      <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
      {mode === "login" && !mfaResolver ? <div className="mt-6 space-y-3 text-sm"><button type="button" className="button-secondary flex w-full justify-center" onClick={googleSignIn} disabled={busy}>Continue with Google</button><div className="flex items-center justify-between gap-3"><Link href="/forgot-password" className="text-link">Forgot password?</Link><Link href="/register" className="text-link">How do I join?</Link></div></div> : null}
      {mode === "forgot" ? <p className="mt-6 text-sm muted"><Link className="text-link" href="/login">Back to sign in</Link></p> : null}
    </div>
  );
}
