"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ArticleCard } from "@/components/Blog/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { articleService } from "@/services/article.service";
import { H2 } from "../Shared/Titles";

/** Displays the latest localized blog publications on the home page. */
export default function LatestArticles() {
  const t = useTranslations("Home");
  const blogT = useTranslations("Blog");
  const locale = useLocale();
  const {
    data: articles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["articles", "latest", locale],
    queryFn: () => articleService.getPublished({ locale, limit: 4 }),
    staleTime: 60_000,
  });

  return (
    <Card className="mt-8 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <H2>{t("articles.title")}</H2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/blog" className="gap-2">
            {blogT("viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {isLoading && <div>{t("common.loading")}</div>}
      {error && <div className="text-destructive">{t("articles.error")}</div>}
      {articles && articles.length === 0 && (
        <div className="text-sm text-muted-foreground">{blogT("empty")}</div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {articles?.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            locale={locale}
            readLabel={blogT("readArticle")}
          />
        ))}
      </div>
    </Card>
  );
}
