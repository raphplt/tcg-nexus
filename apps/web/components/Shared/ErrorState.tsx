import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Une erreur est survenue",
  message = "Impossible de charger les donnees. Veuillez reessayer.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn("border-2 border-destructive", className)}>
      <CardContent className="py-12 flex flex-col items-center text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold font-heading">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{message}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Reessayer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
