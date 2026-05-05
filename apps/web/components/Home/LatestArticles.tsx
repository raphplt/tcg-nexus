import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { articleService } from "@/services/article.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const LatestArticles = () => {
  const {
    data: articles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["articles", "latest"],
    queryFn: () => articleService.getAll(),
  });

  const latestArticles = articles?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center rounded-xl border border-border/50 bg-muted/20">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-6 w-32 bg-muted-foreground/20 rounded"></div>
          <div className="h-4 w-48 bg-muted-foreground/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || latestArticles.length === 0) {
    return null; // On ne montre rien s'il n'y a pas d'article sur la home
  }

  return (
    <div className="space-y-6 mt-12 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Actualités</h2>
          <p className="text-muted-foreground text-sm mt-1">Les dernières annonces de la communauté</p>
        </div>
        <Link href="/news">
          <Button variant="ghost" className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {latestArticles.map((article) => (
          <Link key={article.id} href={`/news/${article.id}`} className="block group">
            <Card className="h-full overflow-hidden border-border/50 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
              <div className="relative h-40 w-full bg-muted/30 overflow-hidden">
                {article.image ? (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(article.publishedAt || article.createdAt), "d MMM yyyy", { locale: fr })}
                </div>
                <h3 className="font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <Button variant="outline" className="w-full sm:hidden gap-2" asChild>
        <Link href="/news">
          Voir toutes les actualités
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

export default LatestArticles;
