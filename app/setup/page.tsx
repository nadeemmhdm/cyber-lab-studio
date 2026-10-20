import type { Metadata } from "next";
import { InitialAdminSetup } from "@/components/setup/initial-admin-setup";
import { requireUser } from "@/lib/auth/session";
import { getInitialAdminState } from "@/lib/setup/admin-bootstrap";

export const metadata: Metadata = { title: "Initial setup" };

export default async function SetupPage() {
  const session = await requireUser();
  const state = await getInitialAdminState(session.user.id);
  return <section className="shell py-10 sm:py-14">
    <p className="eyebrow">First-run setup</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight">Administrator bootstrap</h1>
    <p className="mt-3 max-w-3xl muted">Use this page only when installing a new CyberLab instance. The server controls which verified account may become the first administrator.</p>
    <div className="mt-8 max-w-3xl"><InitialAdminSetup {...state} /></div>
    <div className="panel mt-6 max-w-3xl p-6 text-sm leading-6 muted"><strong className="text-[var(--foreground)]">Recommended sequence:</strong> configure Firebase and <code>INITIAL_ADMIN_EMAIL</code>, create and verify that account, claim the administrator role here, confirm access to <code>/admin</code>, then remove <code>INITIAL_ADMIN_EMAIL</code> from the environment and restart the app.</div>
  </section>;
}
