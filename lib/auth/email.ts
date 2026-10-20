type AuthEmailInput = {
  to: string;
  subject: string;
  actionLabel: string;
  actionUrl: string;
};

export async function sendAuthEmail(input: AuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth-email] ${input.to}: ${input.actionUrl}`);
    }
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "CyberLab Studio Pro <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      text: `${input.actionLabel}: ${input.actionUrl}\n\nIf you did not request this, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned ${response.status}.`);
  }
  return { delivered: true };
}
