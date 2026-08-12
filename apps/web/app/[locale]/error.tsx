"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-heading">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
