export function FeedbackToast({ message, tone = "info" }: { message?: string; tone?: "info" | "success" | "error" }) {
  if (!message) return null;
  return <div className={`feedback-toast feedback-${tone}`} role={tone === "error" ? "alert" : "status"} aria-live="polite">{message}</div>;
}
