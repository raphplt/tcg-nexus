import type { Metadata } from "next";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/Blog/MarkdownContent";
import { SupportedLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getPublishedArticle } from "@/services/article.service";

interface ArticlePageProps {
  params: Promise<{ locale: SupportedLocale; slug: string }>;
}

/** Builds SEO and social metadata from the published article. */
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getPublishedArticle(slug, locale);
  if (!article) return {};

  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      images: article.image ? [{ url: article.image }] : undefined,
    },
    twitter: {
      card: article.image ? "summary_large_image" : "summary",
      title,
      description,
      images: article.image ? [article.image] : undefined,
    },
  };
}

/** Renders a published Markdown article and structured SEO data. */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;
  const [article, t] = await Promise.all([
    getPublishedArticle(slug, locale),
    getTranslations({ locale, namespace: "Blog" }),
  ]);
  if (!article) notFound();

  const date = article.publishedAt ?? article.createdAt;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcg-nexus.org";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.metaDescription || article.excerpt,
    image: article.image,
    datePublished: date,
    dateModified: article.updatedAt,
    mainEntityOfPage: `${siteUrl}/${locale}/blog/${article.slug}`,
    publisher: { "@type": "Organization", name: "TCG Nexus" },
  };

  return (
    <main className="container mx-auto px-6 py-10">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>

        <header className="space-y-5 border-b pb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-xl leading-8 text-muted-foreground">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <time dateTime={date}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                new Date(date),
              )}
            </time>
          </div>
        </header>

        {article.image && (
          <img
            src={article.image}
            alt=""
            className="my-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}

        <MarkdownContent content={article.content ?? ""} className="py-4" />
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
