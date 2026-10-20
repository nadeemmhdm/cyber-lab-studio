"use client";

import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function AssignmentManager({ instructorId, students }: { instructorId: string; students: { id: string; displayName: string; email: string; assigned: boolean }[] }) {
  const [rows, setRows] = useState(students);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "info">("info");

  async function setAssignment(studentId: string, assigned: boolean) {
    setMessage("");
    try {
      const response = await fetch("/api/instructor/assignments", { method: assigned ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instructorId, studentId }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Assignment update failed.");
      setRows((current) => current.map((row) => row.id === studentId ? { ...row, assigned } : row));
      setTone("success"); setMessage(assigned ? "Student assigned." : "Student unassigned.");
    } catch (error) { setTone("error"); setMessage(error instanceof Error ? error.message : "Assignment update failed."); }
  }

  return <section className="panel p-6"><p className="eyebrow">Roster</p><h2 className="mt-2 text-2xl font-semibold">Student assignments</h2><div className="mt-5 grid gap-3">{rows.map((student) => <div key={student.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}><div><strong>{student.displayName}</strong><p className="text-sm muted">{student.email}</p></div><button className="button-secondary" onClick={() => setAssignment(student.id, !student.assigned)}>{student.assigned ? "Unassign" : "Assign"}</button></div>)}</div><FeedbackToast message={message} tone={tone} /></section>;
}
