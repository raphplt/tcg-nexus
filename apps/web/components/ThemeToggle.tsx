"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { setTheme, resolvedTheme, mounted } = useTheme();

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9 relative">
        <div className="h-4 w-4" />
        <span className="sr-only">{t("loading")}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 relative hover:bg-accent transition-colors"
      title={resolvedTheme === "dark" ? t("switchToLight") : t("switchToDark")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
      <span className="sr-only">{t("toggle")}</span>
    </Button>
  );
}
