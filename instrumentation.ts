const SUPPORT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

type CleanupGlobals = typeof globalThis & {
  __cyberlabSupportCleanupTimer?: ReturnType<typeof setInterval>;
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const globals = globalThis as CleanupGlobals;
  if (globals.__cyberlabSupportCleanupTimer) return;

  const { purgeExpiredResolvedSupportTickets } = await import("@/lib/support/service");
  const cleanup = () => {
    void purgeExpiredResolvedSupportTickets().catch(() => undefined);
  };

  cleanup();
  const timer = setInterval(cleanup, SUPPORT_CLEANUP_INTERVAL_MS);
  timer.unref?.();
  globals.__cyberlabSupportCleanupTimer = timer;
}
