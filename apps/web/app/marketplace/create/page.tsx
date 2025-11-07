"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import CardForm from "./_components/CardForm";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
const CreateSell = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <div className="max-w-7xl mx-auto mb-6 px-2">
          <MarketplaceBreadcrumb />
        </div>
        <Alert
          variant="destructive"
          className="mx-auto max-w-3xl"
        >
          <AlertCircleIcon />
          <AlertTitle>Connexion requise.</AlertTitle>
          <AlertDescription>
            <p>Vous devez être connecté pour créer une vente.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <div className="max-w-7xl mx-auto mb-6 px-2">
        <MarketplaceBreadcrumb />
      </div>
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Créer une vente</CardTitle>
          <CardDescription>
            Veuillez remplir ce formulaire pour pouvoir créer une vente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardForm />
        </CardContent>
      </Card>
    </div>
  );
};
export default CreateSell;
