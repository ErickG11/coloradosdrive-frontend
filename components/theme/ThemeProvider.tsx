"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "colorScheme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Estado del tema: vive acá (Context de React), no en cada componente que
// lo necesite. El valor inicial real ya lo aplicó el script inline en
// layout.tsx (antes de la hidratación, para no parpadear); acá solo se
// sincroniza React con lo que ese script ya puso en <html>.
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Lee el estado que ya dejó el script anti-flash (beforeInteractive en
    // layout.tsx) para que React sepa qué tema se está mostrando de verdad.
    const isDark = document.documentElement.classList.contains("dark");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage no disponible (modo privado, cuota llena, etc.):
        // el tema sigue funcionando, solo no persiste entre sesiones.
      }
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
