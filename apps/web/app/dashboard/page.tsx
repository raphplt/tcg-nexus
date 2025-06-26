"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Calendar } from "lucide-react";

const DashboardPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenue sur votre tableau de bord, {user.firstName} !
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profil</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
                <Badge
                  variant="secondary"
                  className="flex items-center w-fit"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Statut</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-green-600">
                  Actif
                </div>
                <div className="text-sm text-muted-foreground">
                  Votre compte est actif et vérifié
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Membre depuis
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-semibold">Aujourd&apos;hui</div>
                <div className="text-sm text-muted-foreground">
                  Date d&apos;inscription
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actions disponibles</CardTitle>
            <CardDescription>
              Voici ce que vous pouvez faire selon votre rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.role === "admin" && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-medium text-red-800 dark:text-red-400">
                    Privilèges Administrateur
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Accès complet : gestion des utilisateurs, modération,
                    configuration système
                  </p>
                </div>
              )}

              {user.role === "moderator" && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-400">
                    Privilèges Modérateur
                  </h4>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Modération du contenu, gestion des rapports utilisateurs
                  </p>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-400">
                  Privilèges Utilisateur
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Accès aux fonctionnalités de base, gestion de votre profil
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
