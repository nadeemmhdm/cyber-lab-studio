"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type Theme = (typeof OPTIONS)[number]["value"];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = theme;
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("cyberlab-theme") as Theme | null;
    const next = OPTIONS.some((option) => option.value === saved) ? saved! : "system";
    setTheme(next);
    applyTheme(next);
  }, []);

  function updateTheme(next: Theme) {
    setTheme(next);
    window.localStorage.setItem("cyberlab-theme", next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: "var(--border)", background: "var(--surface-strong)" }} aria-label="Theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => updateTheme(value)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition"
          style={{
            background: theme === value ? "var(--accent-soft)" : "transparent",
            color: theme === value ? "var(--accent)" : "var(--muted)",
          }}
          aria-pressed={theme === value}
          title={`${label} theme`}
        >
          <Icon size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
