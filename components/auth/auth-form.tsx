"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { prepareFirebaseAuth } from "@/lib/firebase/client";

type Mode = "login" | "register" | "forgot";
type SessionResponse = { ok?: boolean; error?: string };

function friendlyFirebaseError(error: unknown) {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : "The request could not be completed.";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/network-request-failed": "Network error. Check your connection and retry.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return messages[error.code] ?? "Authentication could not be completed.";
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
  const [email, setEmail] = useState("");

  const titles: Record<Mode, { title: string; subtitle: string; submit: string }> = {
    login: { title: "Welcome back", subtitle: "Sign in with Firebase to continue your cloud-security training.", submit: "Sign in" },
    register: { title: "Create your learner account", subtitle: "Firebase will send a verification link before your first secure session.", submit: "Create account" },
    forgot: { title: "Reset your password", subtitle: "Firebase will send a password-reset link to the account email.", submit: "Send reset link" },
  };

  async function finishSignedInUser(user: User, auth: Auth) {
    if (!user.emailVerified) {
      await sendEmailVerification(user, { url: `${window.location.origin}/login?verified=check` });
      await signOut(auth);
      setTone("error");
      setMessage("Verify your email first. A new verification email has been sent.");
      return false;
    }
    await createServerSession(user);
    await signOut(auth);
    router.replace("/dashboard");
    router.refresh();
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const formEmail = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    try {
      const auth = await prepareFirebaseAuth();
      if (mode === "register") {
        const displayName = String(form.get("displayName") ?? "").trim();
        const credential = await createUserWithEmailAndPassword(auth, formEmail, password);
        await updateProfile(credential.user, { displayName: displayName.slice(0, 120) });
        await sendEmailVerification(credential.user, { url: `${window.location.origin}/login?verified=check` });
        await signOut(auth);
        setTone("success");
        setMessage("Account created. Check your email and open the Firebase verification link before signing in.");
        return;
      }
      if (mode === "forgot") {
        await sendPasswordResetEmail(auth, formEmail, { url: `${window.location.origin}/login?reset=success` });
        setTone("success");
        setMessage("If the account can receive password resets, Firebase has sent a reset link.");
        return;
      }
      const credential = await signInWithEmailAndPassword(auth, formEmail, password);
      await finishSignedInUser(credential.user, auth);
    } catch (error) {
      setTone("error");
      setMessage(friendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setMessage("");
    try {
      const auth = await prepareFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      await finishSignedInUser(credential.user, auth);
    } catch (error) {
      setTone("error");
      setMessage(friendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  const meta = titles[mode];
  return (
    <div className="auth-card glass">
      <div><p className="eyebrow">Firebase secure access</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{meta.title}</h1><p className="mt-3 text-sm leading-6 muted">{meta.subtitle}</p></div>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        {mode === "register" ? <label className="field-label">Display name<input className="field-input" name="displayName" autoComplete="name" minLength={2} maxLength={80} required /></label> : null}
        <label className="field-label">Email address<input className="field-input" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {mode !== "forgot" ? <label className="field-label">Password<input className="field-input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 10 : 1} maxLength={128} required /></label> : null}
        <button type="submit" className="button-primary w-full" disabled={busy}>{busy ? "Please wait…" : meta.submit}</button>
      </form>
      <div className="mt-4"><FeedbackToast message={message} tone={tone} /></div>
      {mode === "login" ? <div className="mt-6 space-y-3 text-sm"><button type="button" className="button-secondary flex w-full justify-center" onClick={googleSignIn} disabled={busy}>Continue with Google</button><div className="flex items-center justify-between gap-3"><Link href="/forgot-password" className="text-link">Forgot password?</Link><Link href="/register" className="text-link">Create account</Link></div></div> : null}
      {mode === "register" ? <p className="mt-6 text-sm muted">Already registered? <Link className="text-link" href="/login">Sign in</Link></p> : null}
      {mode === "forgot" ? <p className="mt-6 text-sm muted"><Link className="text-link" href="/login">Back to sign in</Link></p> : null}
    </div>
  );
}
