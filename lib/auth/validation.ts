import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email,
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const requestResetSchema = z.object({ email });
export const resendVerificationSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(256), password });

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
