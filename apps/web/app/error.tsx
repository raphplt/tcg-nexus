"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-heading">
            Erreur inattendue
          </h1>
          <p className="text-muted-foreground">
            Quelque chose s&apos;est mal passe. Veuillez reessayer.
          </p>
        </div>
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reessayer
        </Button>
      </div>
    </div>
  );
}
