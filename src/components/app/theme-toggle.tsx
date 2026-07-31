import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getThemePref, setThemePref } from "@/lib/tags.functions";

const KEY = "leadtrace_theme";

// Light is the default. Dark is an explicit, per-user opt-in that persists to
// user_prefs so it follows the operator across devices.
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const load = useServerFn(getThemePref);
  const save = useServerFn(setThemePref);

  useEffect(() => {
    const local = (localStorage.getItem(KEY) as "light" | "dark" | null) ?? null;
    if (local) apply(local, setTheme);
    load({})
      .then((r) => apply(r.theme, setTheme))
      .catch(() => {});
  }, [load]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    apply(next, setTheme);
    save({ data: { theme: next } }).catch(() => {});
  };

  return { theme, toggle };
}

function apply(theme: "light" | "dark", set: (t: "light" | "dark") => void) {
  set(theme);
  localStorage.setItem(KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
