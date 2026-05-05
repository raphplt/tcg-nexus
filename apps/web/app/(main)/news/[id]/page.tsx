"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Calendar, Loader2, Link as LinkIcon, Edit } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { articleService } from "@/services/article.service";
import { useAuth } from "@/contexts/AuthContext";

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { user } = useAuth();
  
  const isPro = user?.isPro || user?.role === "admin";

  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => articleService.getById(articleId),
    enabled: !!articleId,
  });

  if (isLoading) {
    return (
      <PageWrapper maxWidth="md">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Chargement de l&apos;article...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !article) {
    return (
      <PageWrapper maxWidth="md">
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center">
            <p className="font-semibold text-destructive text-lg">Article introuvable ou erreur de chargement.</p>
            <Link href="/news">
              <Button className="mt-4" variant="outline">
                Voir toutes les actualités
              </Button>
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="lg" gradient="muted" className="py-8 md:py-12">
      <article className="space-y-8">
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.push('/news')} className="gap-2 text-muted-foreground hover:text-foreground -ml-4">
            <ArrowLeft className="h-4 w-4" />
            Retour aux actualités
          </Button>
          
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1.5 py-1 px-3">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(article.publishedAt || article.createdAt), "d MMMM yyyy", { locale: fr })}
            </Badge>
            {isPro && (
              <Button variant="outline" size="sm" className="gap-2 h-7 rounded-full text-xs" onClick={() => router.push(`/news/${article.id}/edit`)}>
                <Edit className="h-3 w-3" />
                Modifier
              </Button>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {article.title}
          </h1>
        </div>

        {article.image && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-muted/20">
            <img 
              src={article.image} 
              alt={article.title} 
              className="object-cover w-full h-full"
            />
          </div>
        )}

        <div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-10 shadow-sm mt-8">
          <div 
            className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-headings:font-semibold"
            dangerouslySetInnerHTML={{ __html: article.content || '' }}
          />
        </div>

        {article.link && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-primary/20 bg-primary/5 mt-10">
            <div>
              <h3 className="font-semibold text-foreground text-lg">Événement associé</h3>
              <p className="text-sm text-muted-foreground">Cet article est lié à un tournoi ou un événement spécifique.</p>
            </div>
            <Link href={article.link} target={article.link.startsWith('http') ? '_blank' : '_self'}>
              <Button className="gap-2 shrink-0">
                <LinkIcon className="h-4 w-4" />
                Voir le tournoi
              </Button>
            </Link>
          </div>
        )}
      </article>
    </PageWrapper>
  );
}
