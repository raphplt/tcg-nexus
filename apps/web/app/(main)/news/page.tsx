"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Plus, ArrowRight, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { articleService } from "@/services/article.service";
import { useAuth } from "@/contexts/AuthContext";

const stripHtml = (html?: string) => {
  if (!html) return "";
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

export default function NewsPage() {
  const { user } = useAuth();
  const isPro = user?.isPro || user?.role === "admin";

  const {
    data: articles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["articles"],
    queryFn: () => articleService.getAll(),
  });

  return (
    <PageWrapper gradient="muted" maxWidth="xl">
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-4">
            <Badge className="w-fit bg-primary/15 text-primary border-primary/30">
              Communication
            </Badge>
            <h1 className="text-4xl font-bold text-foreground">Actualités</h1>
            <p className="text-muted-foreground max-w-2xl">
              Restez informé des dernières annonces de tournois, mises à jour et événements sur TCG Nexus.
            </p>
          </div>
          {isPro && (
            <Link href="/news/create">
              <Button className="gap-2 shrink-0 shadow-md">
                <Plus className="h-4 w-4" />
                Créer un article
              </Button>
            </Link>
          )}
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="flex flex-col overflow-hidden border-border/50">
                <div className="h-48 w-full bg-muted/50 animate-pulse" />
                <CardHeader className="p-5 pb-3 space-y-3">
                  <div className="h-4 w-24 bg-muted/60 animate-pulse rounded" />
                  <div className="h-6 w-3/4 bg-muted/60 animate-pulse rounded" />
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-2">
                  <div className="h-3 w-full bg-muted/40 animate-pulse rounded" />
                  <div className="h-3 w-5/6 bg-muted/40 animate-pulse rounded" />
                  <div className="h-3 w-4/6 bg-muted/40 animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive text-center">
            <p className="font-semibold">Une erreur est survenue lors du chargement des articles.</p>
            <p className="text-sm mt-2 opacity-80">Veuillez réessayer plus tard.</p>
          </div>
        ) : !articles?.length ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-lg border border-dashed border-border/80 bg-muted/20 text-center px-4">
            <div className="bg-muted p-4 rounded-full mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-lg font-medium text-foreground">Aucune actualité disponible</p>
            <p className="text-muted-foreground mt-2 max-w-md">
              Il n&apos;y a pas encore d&apos;articles publiés. Revenez plus tard !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Card key={article.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group bg-card/50 backdrop-blur-sm">
                <div className="relative h-48 w-full bg-muted/30 overflow-hidden flex items-center justify-center border-b border-border/30">
                  {article.image ? (
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground opacity-30" />
                  )}
                </div>
                
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                      {format(new Date(article.publishedAt || article.createdAt), "d MMMM yyyy", { locale: fr })}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 flex-grow">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {stripHtml(article.content)}
                  </p>
                </CardContent>
                
                <CardFooter className="p-5 pt-0 mt-auto border-t border-border/10">
                  <Link href={`/news/${article.id}`} className="w-full">
                    <Button variant="ghost" className="w-full justify-between group/btn text-muted-foreground hover:text-foreground">
                      Lire la suite
                      <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
