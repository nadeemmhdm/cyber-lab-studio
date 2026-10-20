"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "cyberlab-theme";
const CHANGE_EVENT = "cyberlab-theme-change";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type Theme = (typeof OPTIONS)[number]["value"];

function isTheme(value: string | null): value is Theme {
  return OPTIONS.some((option) => option.value === value);
}

function getThemeSnapshot(): Theme {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(saved) ? saved : "system";
}

function getServerThemeSnapshot(): Theme {
  return "system";
}

function subscribeToTheme(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = theme;
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function updateTheme(next: Theme) {
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
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
