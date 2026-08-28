"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface ErrorStateProps {
  title?: string;
  message?: string;
  reset?: () => void;
  showHomeButton?: boolean;
}

/**
 * Reusable error state boundary component displaying friendly messaging and retry actions.
 */
export function ErrorState({
  title = "Une erreur est survenue",
  message = "Nous n'avons pas pu charger les informations demandées. Veuillez réessayer dans un instant.",
  reset,
  showHomeButton = true,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-sm my-8 max-w-lg mx-auto animate-in fade-in-50 duration-300">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 text-destructive shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {reset && (
          <Button
            onClick={() => reset()}
            variant="default"
            className="flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        )}
        {showHomeButton && (
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
