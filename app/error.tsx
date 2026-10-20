"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="shell py-16"><div className="panel mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-3 muted">The page could not be loaded. Your stored progress has not been changed.</p><button type="button" className="button-primary mt-6" onClick={reset}>Try again</button></div></section>; }
