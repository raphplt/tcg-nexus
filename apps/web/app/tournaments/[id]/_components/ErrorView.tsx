import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

const ErrorView = ({ message }: { message?: string }) => (
  <div className="max-w-6xl mx-auto py-16 px-4">
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Info className="size-5" /> Erreur de chargement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {message || "Impossible de récupérer les détails du tournoi."}
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ErrorView;
