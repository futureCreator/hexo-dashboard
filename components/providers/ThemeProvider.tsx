"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Load persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "dark" || stored === "light" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      setResolvedTheme(isDark ? "dark" : "light");
      root.classList.toggle("dark", isDark);
    };

    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: setThemeState }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
