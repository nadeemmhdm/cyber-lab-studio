export default function Loading() {
  return <section className="shell loading-stage py-12" aria-busy="true" aria-label="Loading page"><div className="skeleton h-5 w-32" /><div className="skeleton mt-4 h-12 w-full max-w-xl" /><div className="stagger-grid mt-8 grid gap-4 md:grid-cols-3"><div className="skeleton h-32" /><div className="skeleton h-32" /><div className="skeleton h-32" /></div></section>;
}
