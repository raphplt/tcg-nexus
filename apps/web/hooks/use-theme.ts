"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Récupérer le thème depuis localStorage au montage
    const savedTheme = (localStorage.getItem("theme") as Theme) || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Fonction pour détecter le thème système
    const getSystemTheme = (): "light" | "dark" => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    // Déterminer le thème résolu
    let newResolvedTheme: "light" | "dark";
    if (theme === "system") {
      newResolvedTheme = getSystemTheme();
    } else {
      newResolvedTheme = theme;
    }

    setResolvedTheme(newResolvedTheme);

    // Appliquer le thème au DOM
    root.classList.remove("light", "dark");
    root.classList.add(newResolvedTheme);
    root.setAttribute("data-theme", newResolvedTheme);

    // Sauvegarder dans localStorage
    localStorage.setItem("theme", theme);

    // Écouter les changements de thème système seulement si le thème est "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const systemTheme = getSystemTheme();
        setResolvedTheme(systemTheme);
        root.classList.remove("light", "dark");
        root.classList.add(systemTheme);
        root.setAttribute("data-theme", systemTheme);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, mounted]);

  const setThemeValue = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeValue,
    mounted,
  };
}
