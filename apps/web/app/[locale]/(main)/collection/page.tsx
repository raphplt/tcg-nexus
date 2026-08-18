"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { collectionService } from "@/services/collection.service";
import { Collection } from "@/types/collection";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@/components/Shared/Titles";
import { useRouter } from "@/i18n/navigation";
import {
  Search,
  Plus,
  Heart,
  Eye,
  Users,
  Lock,
  Trophy,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CreateCollection from "./_components/CreateCollection";
import { CreateMasterSetDialog } from "./_components/CreateMasterSetDialog";
import Image from "next/image";
import { getCardImage } from "@/utils/images";

const Page = () => {
  const t = useTranslations("Collections");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user } = useAuth();
  const router = useRouter();

  const fetchCollections = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await collectionService.getMyCollections();
      setCollections(data);
    } catch {
      try {
        const result = await collectionService.getByUserId(user.id);
        const collectionsData = Array.isArray(result)
          ? result
          : result.data || [];
        setCollections(collectionsData);
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [user?.id]);

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (collection.description &&
        collection.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  );

  const masterSets = filteredCollections.filter((c) => !!c.masterSet);
  const regularCollections = filteredCollections.filter((c) => !c.masterSet);

  const refreshCollections = async () => {
    await fetchCollections();
  };

  if (loading) {
    return (
      <PageWrapper gradient="secondary">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const onPressCardSwipe = () => {
    router.push("/pokemon/mini-games/smash-or-pass");
  };

  const renderCollectionCard = (
    collection: Collection,
    isMasterSet: boolean = false,
  ) => {
    const ownedCount = collection.items?.filter((i) => (i.quantity || 0) > 0).length || 0;
    const totalSetCards = collection.masterSet?.cardCount?.total || collection.items?.length || 0;
    const completionPercent =
      totalSetCards > 0
        ? Math.min(100, Math.round((ownedCount / totalSetCards) * 100))
        : 0;

    const image1 = getCardImage(collection.items?.[0]?.pokemonCard);
    const image2 = getCardImage(collection.items?.[1]?.pokemonCard);
    const image3 = getCardImage(collection.items?.[2]?.pokemonCard);

    return (
      <Card
        key={collection.id}
        className="collection-grid-item collection-card group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-xl overflow-hidden"
        onClick={() => router.push(`/collection/${collection.id}`)}
      >
        <div className="collection-card-preview relative h-36 bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
          {collection.items && collection.items.length > 0 ? (
            <div className="flex gap-2 justify-center items-center h-full">
              <Image
                src={image1}
                alt={collection.items[0]?.pokemonCard?.name || t("pokemonCard")}
                width={100}
                height={100}
                className="object-contain rounded-lg shadow-lg w-16 h-20"
              />
              <Image
                src={image2}
                alt={collection.items[1]?.pokemonCard?.name || t("pokemonCard")}
                width={100}
                height={100}
                className="object-contain rounded-lg shadow-lg w-16 h-20"
              />
              <Image
                src={image3}
                alt={collection.items[2]?.pokemonCard?.name || t("pokemonCard")}
                width={100}
                height={100}
                className="object-contain rounded-lg shadow-lg w-16 h-20"
              />
            </div>
          ) : (
            <div className="flex gap-2 justify-center items-center h-full">
              <div className="card-preview-placeholder w-12 h-16 bg-primary/20 rounded border-2 border-dashed border-primary/40 flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary/60" />
              </div>
              <div className="card-preview-placeholder w-12 h-16 bg-secondary/20 rounded border-2 border-dashed border-secondary/40 flex items-center justify-center">
                <Heart className="h-4 w-4 text-secondary/60" />
              </div>
              <div className="card-preview-placeholder w-12 h-16 bg-accent/20 rounded border-2 border-dashed border-accent/40 flex items-center justify-center">
                <Heart className="h-4 w-4 text-accent/60" />
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {isMasterSet ? (
              <Badge
                variant="default"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm"
              >
                <Trophy className="h-3 w-3 mr-1" />
                {completionPercent}% complété
              </Badge>
            ) : (
              <Badge
                variant={collection.isPublic ? "default" : "secondary"}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {collection.isPublic ? t("public") : t("private")}
              </Badge>
            )}
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {collection.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {collection.description || t("noDescription")}
          </p>

          {isMasterSet ? (
            <div className="space-y-2 mb-4 bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground">Progression du set</span>
                <span className="tabular-nums font-bold text-primary">
                  {ownedCount} / {totalSetCards} cartes
                </span>
              </div>
              <Progress value={completionPercent} className="h-2" />
            </div>
          ) : (
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center text-xs text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                <span>{collection.isPublic ? t("public") : t("private")}</span>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1" />
                <span>
                  {t("cardCount", { count: collection.items?.length || 0 })}
                </span>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/collection/${collection.id}`);
            }}
          >
            <Eye className="mr-2 h-3 w-3" />
            {isMasterSet ? "Ouvrir le Master Set" : t("view")}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageWrapper gradient="secondary">
      <div className="text-center mb-10">
        <H1 className="mb-4" variant="primary">
          {t("title")}
        </H1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
          {t("subtitle")}
        </p>

        <div className="flex flex-wrap gap-4 justify-center items-center mb-8">
          <Button
            variant="default"
            size="lg"
            className="discovery-button bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
            onClick={onPressCardSwipe}
          >
            <Heart className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            Card Discovery
            <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
              Nouveau
            </span>
          </Button>

          <CreateMasterSetDialog
            existingCollections={collections}
            onCreated={refreshCollections}
          />

          <CreateCollection onCollectionCreated={refreshCollections} />
        </div>

        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input pl-10 pr-4 py-3 border-2 border-border/50 focus:border-primary/50 rounded-lg bg-background/80 backdrop-blur-sm"
          />
        </div>
      </div>

      {filteredCollections.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-12 max-w-md mx-auto border border-border/50">
            <div className="empty-state-icon w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? t("noResults") : t("empty")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? t("tryOtherKeywords") : t("createFirst")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {masterSets.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold tracking-tight">
                    Master Sets
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {masterSets.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Suivi de complétion intégrale par extension
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {masterSets.map((col) => renderCollectionCard(col, true))}
              </div>
            </div>
          )}

          {regularCollections.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">
                    Mes Collections Personnalisées
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {regularCollections.length}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {regularCollections.map((col) => renderCollectionCard(col, false))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
};

export default Page;
