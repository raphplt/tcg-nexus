import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArticleCard } from "@/components/Blog/ArticleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportedLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getPublishedArticles } from "@/services/article.service";

interface BlogPageProps {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ page?: string }>;
}

/** Builds localized metadata for the public blog index. */
export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  return { title: t("title"), description: t("description") };
}

/** Displays all published articles for the active locale. */
export default async function BlogPage({
  params,
  searchParams,
}: BlogPageProps) {
  const { locale } = await params;
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 12;
  const [t, articles] = await Promise.all([
    getTranslations({ locale, namespace: "Blog" }),
    getPublishedArticles({
      locale,
      offset: (page - 1) * pageSize,
      limit: pageSize + 1,
    }),
  ]);
  const hasNextPage = articles.length > pageSize;
  const visibleArticles = articles.slice(0, pageSize);

  return (
    <main className="container mx-auto px-6 py-12">
      <header className="mx-auto mb-12 max-w-3xl space-y-4 text-center">
        <Badge variant="secondary">{t("badge")}</Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          {t("description")}
        </p>
      </header>

      {visibleArticles.length ? (
        <>
          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {visibleArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                locale={locale}
                readLabel={t("readArticle")}
              />
            ))}
          </div>
          {(page > 1 || hasNextPage) && (
            <nav
              className="mt-10 flex items-center justify-center gap-3"
              aria-label={t("pagination")}
            >
              {page > 1 && (
                <Button asChild variant="outline">
                  <Link href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}>
                    ← {t("previous")}
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {t("page", { page })}
              </span>
              {hasNextPage && (
                <Button asChild variant="outline">
                  <Link href={`/blog?page=${page + 1}`}>{t("next")} →</Link>
                </Button>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {t("empty")}
        </div>
      )}
    </main>
  );
}
