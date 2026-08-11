import { getTranslations } from "next-intl/server";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { loadSystemContent, loadTranslations } from "./actions";
import { TranslationsManager } from "./_components/TranslationsManager";

export default async function AdminTranslationsPage() {
  const t = await getTranslations("AdminTranslations");

  const [entries, systemContent] = await Promise.all([
    loadTranslations().catch(() => []),
    loadSystemContent().catch(() => []),
  ]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container mx-auto space-y-6 py-8 px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <TranslationsManager
          entries={entries}
          systemContent={systemContent}
          isProduction={process.env.NODE_ENV === "production"}
        />
      </div>
    </ProtectedRoute>
  );
}
