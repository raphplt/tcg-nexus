import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SquareStack, Plus, Eye } from "lucide-react";
import type { DashboardDecksData } from "@/types/dashboard";
import { useTranslations } from "next-intl";

interface DecksWidgetProps {
  data: DashboardDecksData;
}

export function DecksWidget({ data }: DecksWidgetProps) {
  const t = useTranslations("Dashboard.decks");
  const isEmpty = data.total === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
        <SquareStack className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <SquareStack className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Link
              href="/decks/create"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              {t("create")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.total}</div>
              <p className="text-xs text-muted-foreground">
                {t("created", { count: data.total })}
              </p>
            </div>
            {data.mostUsed && (
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("mostPopular")}
                </p>
                <Link
                  href={`/decks/${data.mostUsed.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {data.mostUsed.name}
                </Link>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Eye className="h-3 w-3" />
                  {t("views", { count: data.mostUsed.views })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
