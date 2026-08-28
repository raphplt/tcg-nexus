"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main layout error boundary caught error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <ErrorState
        title="Une erreur inattendue est survenue"
        message="Le contenu n'a pas pu être chargé. Vous pouvez tenter de rafraîchir la vue ou retourner à l'accueil."
        reset={reset}
        showHomeButton={true}
      />
    </div>
  );
}
