"use client";

import React, { useEffect, createContext, useContext, useState, useCallback } from "react";
import type { BrandThemeRow } from "@/types/themes";

interface ThemeContextType {
  theme: BrandThemeRow | null;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  refreshTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BrandThemeRow | null>(null);

  const fetchAndApplyTheme = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/themes/active");
      const json = await res.json();
      if (json.success && json.data) {
        setTheme(json.data);
        const cssVars = json.data.custom_css_vars as Record<string, string> | undefined;
        if (cssVars) {
          Object.entries(cssVars).forEach(([key, val]) => {
            document.documentElement.style.setProperty(key, val);
          });
        }
      }
    } catch {
      // Fallback silently if API is unreachable
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/v1/themes/active")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setTheme(json.data);
          const cssVars = json.data.custom_css_vars as Record<string, string> | undefined;
          if (cssVars) {
            Object.entries(cssVars).forEach(([key, val]) => {
              document.documentElement.style.setProperty(key, val);
            });
          }
        }
      })
      .catch(() => {
        // Fallback silently
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, refreshTheme: fetchAndApplyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
