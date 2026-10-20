import type { Metadata } from "next";
import { InitialAdminSetup } from "@/components/setup/initial-admin-setup";
import { getInitialAdminState } from "@/lib/setup/admin-bootstrap";

export const metadata: Metadata = { title: "Initial setup" };

export default async function SetupPage() {
  const state = await getInitialAdminState();
  return <section className="shell py-10 sm:py-14">
    <p className="eyebrow">First-run setup</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight">Administrator bootstrap</h1>
    <p className="mt-3 max-w-3xl muted">Use this page only on a new CyberLab installation. A server-side setup token protects the one-time creation of the first administrator.</p>
    <div className="mt-8 max-w-3xl"><InitialAdminSetup {...state} /></div>
    <div className="panel mt-6 max-w-3xl p-6 text-sm leading-6 muted"><strong className="text-[var(--foreground)]">Recommended sequence:</strong> configure Firebase Admin, set a strong <code>INITIAL_ADMIN_SETUP_TOKEN</code> and optionally <code>INITIAL_ADMIN_EMAIL</code>, create the first administrator here, sign in at <code>/login</code>, enable TOTP 2FA from Profile, confirm <code>/admin</code> access, then remove the setup token from the environment and restart the app.</div>
  </section>;
}
