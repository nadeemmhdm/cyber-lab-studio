"use client";

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  multiFactor,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
  type TotpSecret,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { qrMatrix } from "@/lib/auth/qr";
import { prepareFirebaseAuth } from "@/lib/firebase/client";

type SetupState = { secret: TotpSecret; uri: string; matrix: boolean[][] } | null;

function friendly(error: unknown) {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : "Could not configure two-factor authentication.";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Current password is incorrect.",
    "auth/requires-recent-login": "Re-authentication is required.",
    "auth/invalid-verification-code": "Authenticator code is invalid or expired.",
    "auth/multi-factor-info-not-found": "The selected second factor is unavailable.",
    "auth/unsupported-first-factor": "This sign-in provider cannot enroll MFA.",
    "auth/operation-not-allowed": "TOTP MFA is not enabled in this Firebase project. Enable Authentication with Identity Platform and TOTP MFA first.",
    "auth/popup-closed-by-user": "Google re-authentication was cancelled.",
  };
  return map[error.code] ?? "Could not configure two-factor authentication.";
}

async function buildSetup(user: User, accountLabel: string) {
  const session = await multiFactor(user).getSession();
  const secret = await TotpMultiFactorGenerator.generateSecret(session);
  const uri = secret.generateQrCodeUrl(accountLabel, "CyberLab Studio Pro");
  return { secret, uri, matrix: qrMatrix(uri) };
}

export function TotpManager({ email, accountLabel, enabledInitially }: { email: string; accountLabel: string; enabledInitially: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(enabledInitially);
  const [setup, setSetup] = useState<SetupState>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  async function prepareWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    try {
      const auth = await prepareFirebaseAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setSetup(await buildSetup(credential.user, accountLabel));
      setTone("info"); setMessage("Scan the QR code with your authenticator app, then enter the current 6-digit code.");
    } catch (error) { setTone("error"); setMessage(friendly(error)); }
    finally { setBusy(false); }
  }

  async function prepareWithGoogle() {
    setBusy(true); setMessage("");
    try {
      const auth = await prepareFirebaseAuth();
      const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      if (credential.user.email?.toLowerCase() !== email.toLowerCase()) { await signOut(auth); throw new Error("Choose the Google account linked to this CyberLab profile."); }
      setSetup(await buildSetup(credential.user, accountLabel));
      setTone("info"); setMessage("Scan the QR code with your authenticator app, then enter the current 6-digit code.");
    } catch (error) { setTone("error"); setMessage(friendly(error)); }
    finally { setBusy(false); }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup) return;
    setBusy(true); setMessage("");
    try {
      const auth = await prepareFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Re-authentication expired. Start setup again.");
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(setup.secret, code);
      await multiFactor(user).enroll(assertion, "Authenticator app");
      const response = await fetch("/api/auth/mfa/status", { method: "POST" });
      const data = await response.json() as { enabled?: boolean; error?: string };
      if (!response.ok || !data.enabled) throw new Error(data.error ?? "Firebase did not confirm the enrolled factor.");
      await signOut(auth);
      setEnabled(true); setSetup(null); setCode(""); setTone("success"); setMessage("TOTP two-factor authentication is enabled for this account.");
      router.refresh();
    } catch (error) { setTone("error"); setMessage(friendly(error)); }
    finally { setBusy(false); }
  }

  if (enabled) return <section className="panel p-6"><p className="eyebrow">Account security</p><h2 className="mt-2 text-2xl font-semibold">Two-factor authentication</h2><div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}><strong>TOTP 2FA enabled</strong><p className="mt-2 text-sm leading-6 muted">Sign-in now requires a current code from your authenticator app after the first factor succeeds.</p></div></section>;

  return <section className="panel p-6"><p className="eyebrow">Account security</p><h2 className="mt-2 text-2xl font-semibold">Enable TOTP two-factor authentication</h2><p className="mt-2 text-sm leading-6 muted">The QR code is generated locally in your browser from Firebase&apos;s TOTP secret; the secret is not sent to a third-party QR service.</p>{!setup ? <div className="mt-5 grid gap-4 md:grid-cols-2"><form className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }} onSubmit={prepareWithPassword}><h3 className="font-semibold">Re-authenticate with password</h3><label className="field-label mt-3">Current password<input className="field-input" name="password" type="password" autoComplete="current-password" required /></label><button className="button-primary mt-3 w-full" type="submit" disabled={busy}>{busy ? "Checking…" : "Start TOTP setup"}</button></form><div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><h3 className="font-semibold">Re-authenticate with Google</h3><p className="mt-2 text-sm muted">Use this if your administrator account signs in through Google.</p><button className="button-secondary mt-4 w-full" type="button" onClick={prepareWithGoogle} disabled={busy}>Continue with Google</button></div></div> : <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]"><div className="rounded-2xl bg-white p-3"><svg viewBox={`0 0 ${setup.matrix.length + 8} ${setup.matrix.length + 8}`} role="img" aria-label="TOTP enrollment QR code" className="h-auto w-full" shapeRendering="crispEdges"><rect width="100%" height="100%" fill="white" />{setup.matrix.flatMap((row, y) => row.map((dark, x) => dark ? <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" fill="black" /> : null))}</svg></div><div><h3 className="font-semibold">Scan and verify</h3><p className="mt-2 text-sm leading-6 muted">Scan with Google Authenticator, Microsoft Authenticator, 1Password, or another standards-compatible TOTP app.</p><div className="mt-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><p className="text-xs uppercase tracking-wider muted">Manual secret</p><code className="mt-2 block break-all text-sm">{setup.secret.secretKey}</code></div><form className="mt-4 space-y-3" onSubmit={confirm}><label className="field-label">6-digit code<input className="field-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} pattern="[0-9]{6}" required /></label><button className="button-primary w-full" type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Enable 2FA"}</button><button className="button-secondary w-full" type="button" disabled={busy} onClick={async () => { const auth = await prepareFirebaseAuth(); await signOut(auth).catch(() => undefined); setSetup(null); setCode(""); }}>Cancel</button></form></div></div>}<div className="mt-4"><FeedbackToast message={message} tone={tone} /></div></section>;
}
