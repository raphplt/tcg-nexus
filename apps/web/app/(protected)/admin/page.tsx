"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOrdersTable } from "./_components/AdminOrdersTable";
import { AdminUsersTable } from "./_components/AdminUsersTable";
import { AdminTournamentsTable } from "./_components/AdminTournamentsTable";
import { AdminPokemonSeriesTable } from "./_components/AdminPokemonSeriesTable";
import { AdminPokemonSetsTable } from "./_components/AdminPokemonSetsTable";
import { AdminPokemonCardsTable } from "./_components/AdminPokemonCardsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShoppingBag, Trophy } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <p className="text-sm text-muted-foreground">
              Connecté en tant que {user?.email}
            </p>
          </div>
          <h1 className="text-3xl font-bold">Console d'administration</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs, les ventes et les tournois depuis un même
            endroit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisateurs
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">Gestion des rôles</p>
              <p className="text-xs text-muted-foreground">
                Création, activation et droits
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ventes</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">Commandes & listings</p>
              <p className="text-xs text-muted-foreground">
                Suivi, remboursements, contrôle qualité
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tournois</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">Pilotage</p>
              <p className="text-xs text-muted-foreground">
                Création, statuts, inscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          defaultValue="orders"
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
            <TabsTrigger value="orders">Ventes</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="tournaments">Tournois</TabsTrigger>
            <TabsTrigger value="series">Séries</TabsTrigger>
            <TabsTrigger value="sets">Sets</TabsTrigger>
            <TabsTrigger value="cards">Cartes</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <AdminOrdersTable />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTable />
          </TabsContent>

          <TabsContent value="tournaments">
            <AdminTournamentsTable />
          </TabsContent>

          <TabsContent value="series">
            <AdminPokemonSeriesTable />
          </TabsContent>

          <TabsContent value="sets">
            <AdminPokemonSetsTable />
          </TabsContent>

          <TabsContent value="cards">
            <AdminPokemonCardsTable />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
