"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { Heart, Layers, Plus, Search, Trophy } from "lucide-react";
import { collectionService } from "@/services/collection.service";
import { Collection } from "@/types/collection";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { useRouter } from "@/i18n/navigation";
import { getCollectionTitle } from "@/utils/collection";
import CreateCollection from "./_components/CreateCollection";
import { CreateMasterSetDialog } from "./_components/CreateMasterSetDialog";
import { CollectionGridCard } from "./_components/CollectionGridCard";
import { CollectionsOverview } from "./_components/CollectionsOverview";

type CollectionFilter = "all" | "masterSets" | "personal";

const FILTERS: CollectionFilter[] = ["all", "masterSets", "personal"];

const Page = () => {
  const t = useTranslations("Collections");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filter, setFilter] = useState<CollectionFilter>("all");
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

  const filteredCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return collections;

    return collections.filter((collection) => {
      const haystack = [
        getCollectionTitle(collection),
        collection.name,
        collection.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [collections, searchQuery]);

  const masterSets = filteredCollections.filter((c) => !!c.masterSet);
  const personalCollections = filteredCollections.filter((c) => !c.masterSet);

  const showMasterSets = filter === "all" || filter === "masterSets";
  const showPersonal = filter === "all" || filter === "personal";
  const hasResults =
    (showMasterSets && masterSets.length > 0) ||
    (showPersonal && personalCollections.length > 0);

  const refreshCollections = async () => {
    await fetchCollections();
  };

  const removeDeletedCollection = (collectionId: string) => {
    setCollections((currentCollections) =>
      currentCollections.filter((collection) => collection.id !== collectionId),
    );
  };

  const filterCount = (value: CollectionFilter) => {
    if (value === "masterSets") return masterSets.length;
    if (value === "personal") return personalCollections.length;
    return filteredCollections.length;
  };

  return (
    <PageWrapper gradient="secondary">
      <div className="space-y-6">
        <section className="tcg-surface tcg-surface--hero space-y-5 p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t("eyebrow")}
              </p>
              <h1 className="font-heading text-3xl font-black leading-tight text-foreground md:text-[2.5rem]">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {t("subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:shrink-0 xl:justify-end">
              <Button
                className="discovery-button"
                onClick={() => router.push("/pokemon/mini-games/smash-or-pass")}
              >
                <Heart className="mr-2 h-4 w-4" />
                {t("discovery")}
              </Button>
              <CreateMasterSetDialog
                existingCollections={collections}
                onCreated={refreshCollections}
              />
              <CreateCollection onCollectionCreated={refreshCollections} />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-wrap gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton
                  key={index}
                  className="h-[74px] min-w-[160px] flex-1"
                />
              ))}
            </div>
          ) : (
            <CollectionsOverview collections={collections} />
          )}
        </section>

        <section className="tcg-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-9"
            />
          </div>

          <div className="tablist flex w-full gap-1 overflow-x-auto sm:w-auto">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                data-state={filter === value ? "active" : "inactive"}
                className="tab flex-1 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium sm:flex-none sm:px-3 sm:text-sm"
              >
                {t(`filters.${value}`)}
                <span className="ml-1.5 hidden tabular-nums opacity-60 sm:inline">
                  {filterCount(value)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-[300px] rounded-xl" />
            ))}
          </div>
        ) : !hasResults ? (
          <div className="empty-state mx-auto max-w-md space-y-3 py-12">
            <div className="empty-state-icon mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-bold">
              {searchQuery ? t("noResults") : t("empty")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? t("tryOtherKeywords") : t("createFirst")}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {showMasterSets && masterSets.length > 0 && (
              <section className="space-y-4">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <h2 className="font-heading text-xl font-bold tracking-tight">
                      {t("masterSets.title")}
                    </h2>
                    <span className="chip text-xs tabular-nums">
                      {masterSets.length}
                    </span>
                  </div>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    {t("masterSets.hint")}
                  </p>
                </header>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {masterSets.map((collection) => (
                    <CollectionGridCard
                      key={collection.id}
                      collection={collection}
                      onDeleted={removeDeletedCollection}
                    />
                  ))}
                </div>
              </section>
            )}

            {showPersonal && personalCollections.length > 0 && (
              <section className="space-y-4">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-xl font-bold tracking-tight">
                      {t("personal.title")}
                    </h2>
                    <span className="chip text-xs tabular-nums">
                      {personalCollections.length}
                    </span>
                  </div>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    {t("personal.hint")}
                  </p>
                </header>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {personalCollections.map((collection) => (
                    <CollectionGridCard
                      key={collection.id}
                      collection={collection}
                      onDeleted={removeDeletedCollection}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Page;
