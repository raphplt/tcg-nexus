"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/navigation";
import { MarketplaceBreadcrumb } from "@/components/Marketplace/MarketplaceBreadcrumb";
import CardForm from "./_components/cardForm";

const CreateSell = () => {
  const t = useTranslations("CreateListing");
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/10 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <MarketplaceBreadcrumb />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("pageTitle")}
        </h1>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isAuthenticated ? (
          <CardForm />
        ) : (
          <Alert variant="destructive" className="max-w-xl">
            <AlertCircleIcon />
            <AlertTitle>{t("loginRequiredTitle")}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{t("loginRequired")}</p>
              <Button asChild size="sm">
                <Link href="/auth/login">{t("signIn")}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default CreateSell;
