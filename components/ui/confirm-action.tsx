"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmAction({ label, title, description, endpoint, destructive = false }: { label: string; title: string; description: string; endpoint: string; destructive?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function confirm() {
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (response.ok) {
        dialogRef.current?.close();
        router.replace("/login");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={destructive ? "button-danger" : "button-secondary"} onClick={() => dialogRef.current?.showModal()}>{label}</button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-title">
        <div className="p-6">
          <h2 id="confirm-title" className="text-xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 muted">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="button-secondary" onClick={() => dialogRef.current?.close()} disabled={busy}>Cancel</button>
            <button type="button" className={destructive ? "button-danger" : "button-primary"} onClick={confirm} disabled={busy}>{busy ? "Working…" : "Confirm"}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
