import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() { return <section className="auth-shell"><AuthForm mode="forgot" /></section>; }
