import type { Metadata } from "next";
import { LabCatalogue } from "@/components/lab-catalogue";
import { LABS } from "@/lib/labs/catalog";

export const metadata: Metadata = {
  title: "All Labs",
  description: "Browse the complete CyberLab Studio Pro cloud-security lab catalogue.",
};

export default function LabsPage() {
  return (
    <section className="shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Training catalogue</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">All 30 cloud-security labs</h1>
        <p className="mt-4 text-lg leading-8 muted">
          Browse fundamentals, AWS, Azure, Microsoft Sentinel, KQL, and Defender XDR labs from one searchable catalogue.
        </p>
      </div>
      <div className="mt-8">
        <LabCatalogue labs={LABS} />
      </div>
    </section>
  );
}
