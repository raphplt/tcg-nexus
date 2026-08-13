import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Article } from "@/types/article";

interface ArticleCardProps {
  article: Article;
  locale: string;
  readLabel: string;
}

/** Displays a published article summary linked to its internal page. */
export function ArticleCard({ article, locale, readLabel }: ArticleCardProps) {
  const date = article.publishedAt ?? article.createdAt;

  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/blog/${article.slug}`} className="block h-full">
        {article.image ? (
          <div className="aspect-[16/9] overflow-hidden bg-muted">
            {/* Article images are editorial URLs validated by the API. */}
            <img
              src={article.image}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 via-muted to-accent" />
        )}
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <time dateTime={date}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                new Date(date),
              )}
            </time>
          </div>
          <h2 className="text-xl font-bold tracking-tight group-hover:text-primary">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
              {article.excerpt}
            </p>
          )}
          <span className="inline-flex text-sm font-semibold text-primary">
            {readLabel} →
          </span>
        </div>
      </Link>
    </article>
  );
}
