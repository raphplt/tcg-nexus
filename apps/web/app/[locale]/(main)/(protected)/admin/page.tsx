"use client";

import { LanguagesIcon, ShoppingBag, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { AdminOrdersTable } from "./_components/AdminOrdersTable";
import { AdminPokemonCardsTable } from "./_components/AdminPokemonCardsTable";
import { AdminPokemonSeriesTable } from "./_components/AdminPokemonSeriesTable";
import { AdminPokemonSetsTable } from "./_components/AdminPokemonSetsTable";
import { AdminTournamentsTable } from "./_components/AdminTournamentsTable";
import { AdminUsersTable } from "./_components/AdminUsersTable";

type AdminTab =
  | "orders"
  | "users"
  | "tournaments"
  | "series"
  | "sets"
  | "cards";

const SUMMARY_CARDS: Array<{
  key: string;
  tab: AdminTab;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "users", tab: "users", icon: Users },
  { key: "sales", tab: "orders", icon: ShoppingBag },
  { key: "tournaments", tab: "tournaments", icon: Trophy },
  { key: "translations", tab: "series", icon: LanguagesIcon },
];

export default function AdminPage() {
  const t = useTranslations("Admin");
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>("orders");

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container mx-auto space-y-6 py-8 px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t("badge")}</Badge>
            <p className="text-sm text-muted-foreground">
              {t("loggedInAs", { email: user?.email ?? "" })}
            </p>
          </div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SUMMARY_CARDS.map(({ key, tab: target, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(target)}
              className="text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t(`cards.${key}.title`)}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    {t(`cards.${key}.headline`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`cards.${key}.description`)}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as AdminTab)}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
            <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
            <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
            <TabsTrigger value="tournaments">
              {t("tabs.tournaments")}
            </TabsTrigger>
            <TabsTrigger value="series">{t("tabs.series")}</TabsTrigger>
            <TabsTrigger value="sets">{t("tabs.sets")}</TabsTrigger>
            <TabsTrigger value="cards">{t("tabs.cards")}</TabsTrigger>
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
