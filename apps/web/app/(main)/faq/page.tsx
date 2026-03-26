"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, LifeBuoy, Loader2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { useDebounce } from "@/hooks/useDebounce";
import { faqService } from "@/services/faq.service";
import { FAQ_CATEGORIES, FaqCategory, FaqItem } from "@/types/faq";

const FaqPage = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "">("");
  const debouncedSearch = useDebounce(search, 250);

  const filters = useMemo(
    () => ({
      category: activeCategory || undefined,
      search: debouncedSearch || undefined,
    }),
    [activeCategory, debouncedSearch],
  );

  const {
    data: faqs,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["faq", filters],
    queryFn: () => faqService.getAll(filters),
    staleTime: 5 * 60 * 1000,
  });

  const groupedFaqs = useMemo(() => {
    const groups = Object.fromEntries(
      FAQ_CATEGORIES.map((cat) => [cat, [] as FaqItem[]]),
    ) as Record<FaqCategory, FaqItem[]>;

    (faqs ?? []).forEach((faq) => {
      groups[faq.category].push(faq);
    });

    return groups;
  }, [faqs]);

  const categoriesToDisplay = activeCategory
    ? ([activeCategory] as FaqCategory[])
    : FAQ_CATEGORIES;

  const hasResults = (faqs?.length || 0) > 0;

  return (
    <PageWrapper gradient="muted" maxWidth="lg">
      <div className="space-y-10">
        <header className="flex flex-col gap-4">
            <Badge className="w-fit bg-primary/15 text-primary border-primary/30">
              Centre d&apos;aide
            </Badge>
            <h1 className="text-4xl font-bold text-foreground">
              FAQ &amp; assistance
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Retrouvez les réponses aux questions les plus fréquentes sur les
              tournois, la collection, le marketplace et la gestion de votre
              compte. Utilisez la recherche ou filtrez par catégorie pour aller
              à l&apos;essentiel.
            </p>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un mot-clé (ex : inscription, paiement, deck)..."
                className="pl-10 pr-20 h-12 text-base shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
        </header>

        <div className="space-y-6">
        <Card className="p-6 shadow-md border-border/60">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Parcourir par catégorie
              </h2>
              <p className="text-sm text-muted-foreground">
                Choisissez un domaine pour affiner l&apos;aide.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === "" ? "default" : "outline"}
                onClick={() => setActiveCategory("")}
                size="sm"
              >
                Toutes
              </Button>
              {FAQ_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  onClick={() => setActiveCategory(category)}
                  size="sm"
                  className="gap-2"
                >
                  {category}
                  {groupedFaqs[category]?.length ? (
                    <Badge variant="secondary" className="ml-1">
                      {groupedFaqs[category].length}
                    </Badge>
                  ) : null}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-lg border-border/60">
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement des questions fréquentes...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              Une erreur est survenue lors du chargement de la FAQ.
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-6">
              <p className="text-foreground font-semibold">
                Aucune réponse ne correspond à votre recherche.
              </p>
              <p className="text-muted-foreground">
                Essayez d&apos;autres mots-clés ou contactez notre équipe.
              </p>
              <Link href="mailto:support@tcgnexus.com">
                <Button variant="secondary" className="gap-2">
                  <LifeBuoy className="h-4 w-4" />
                  Contacter le support
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {categoriesToDisplay.map((category) => {
                const items = groupedFaqs[category] || [];
                if (!items.length) return null;

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{category}</h3>
                      <Badge variant="secondary">{items.length} réponses</Badge>
                    </div>
                    <Accordion type="single" collapsible className="space-y-2">
                      {items.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={`faq-${category}-${faq.id}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="text-left text-base">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default FaqPage;
