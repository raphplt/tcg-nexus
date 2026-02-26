"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import Loader from "@/components/Layout/Loader";
import { ProfileForm } from "./_components/ProfileForm";
import { PasswordForm } from "./_components/PasswordForm";
import { PreferencesForm } from "./_components/PreferencesForm";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Vous devez être connecté pour accéder aux paramètres
          </h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ProfileForm user={user} />
          <PasswordForm />
        </div>
        <div>
          <PreferencesForm />
        </div>
      </div>
    </div>
  );
}
