import type { Metadata } from "next";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { ConfirmAction } from "@/components/ui/confirm-action";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireUser();
  return (
    <section className="shell py-10 sm:py-14">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Profile & security</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-6">
          <Info icon={UserRound} label="Display name" value={user.displayName} />
          <Info icon={Mail} label="Email" value={user.email} />
          <Info icon={ShieldCheck} label="Roles" value={user.roles.join(", ")} />
          <Info icon={KeyRound} label="Authentication" value="Firebase Auth · HttpOnly server session" />
        </div>
        <div className="panel p-6">
          <h2 className="text-xl font-semibold">Session security</h2>
          <p className="mt-3 text-sm leading-6 muted">Sign out everywhere revokes Firebase refresh tokens and clears this browser&apos;s server session cookie.</p>
          <div className="mt-6"><ConfirmAction label="Sign out everywhere" title="Revoke all sessions?" description="Firebase will revoke refresh tokens for this account. You will need to sign in again." endpoint="/api/auth/logout-all" destructive /></div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex items-start gap-3 border-b py-4 last:border-b-0" style={{ borderColor: "var(--border)" }}><span className="stat-icon"><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-wider muted">{label}</p><p className="mt-1 font-medium">{value}</p></div></div>;
}
