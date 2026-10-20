import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/enrollment/join-form";
import { EnrollmentError, inspectEnrollmentToken } from "@/lib/enrollment/service";

export const metadata: Metadata = { title: "Join CyberLab" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const invite = await inspectEnrollmentToken(token);
    if (!invite.active) return <section className="auth-shell"><div className="auth-card glass"><p className="eyebrow">Enrollment</p><h1 className="mt-3 text-3xl font-semibold">Link unavailable</h1><p className="mt-3 text-sm muted">This instructor enrollment link is expired, revoked, or has reached its student limit.</p></div></section>;
    return <section className="auth-shell"><JoinForm token={token} remaining={invite.remaining} instructorName={invite.instructorName} expiresAt={invite.expiresAt.toISOString()} /></section>;
  } catch (error) {
    if (error instanceof EnrollmentError && error.status === 404) notFound();
    throw error;
  }
}
