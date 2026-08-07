import { Home, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold font-heading text-primary">404</h1>
          <h2 className="text-2xl font-bold font-heading">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t("backHome")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pokemon">
              <Search className="mr-2 h-4 w-4" />
              {t("exploreCards")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
