"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookmarkCheck,
  Download,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { InfiniteScrollTrigger } from "@/components/Shared/InfiniteScrollTrigger";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useInfinitePaginatedQuery } from "@/hooks/useInfinitePaginatedQuery";
import { Link } from "@/i18n/navigation";
import { decksService, type DecksQueryParams } from "@/services/decks.service";
import type { Deck } from "@/types/Decks";
import type { DeckFormat } from "@/types/deckFormat";
import { authedFetch } from "@/utils/fetch";
import DeckCard from "../_components/DeckCard";
import { MyDeckCard } from "./_components/MyDeckCard";

type Tab = "mine" | "favorites";
type SortOption = Pick<DecksQueryParams, "sortBy" | "sortOrder">;

// On the favorites tab, "createdAt" sorts by the date the deck was favorited
const SORTS = {
  mine: {
    updated: { sortBy: "updatedAt", sortOrder: "DESC" },
    newest: { sortBy: "createdAt", sortOrder: "DESC" },
    oldest: { sortBy: "createdAt", sortOrder: "ASC" },
    nameAsc: { sortBy: "name", sortOrder: "ASC" },
    nameDesc: { sortBy: "name", sortOrder: "DESC" },
    popular: { sortBy: "views", sortOrder: "DESC" },
    format: { sortBy: "format.type", sortOrder: "ASC" },
  },
  favorites: {
    saved: { sortBy: "createdAt", sortOrder: "DESC" },
    nameAsc: { sortBy: "name", sortOrder: "ASC" },
    nameDesc: { sortBy: "name", sortOrder: "DESC" },
    popular: { sortBy: "views", sortOrder: "DESC" },
    format: { sortBy: "format.type", sortOrder: "ASC" },
  },
} satisfies Record<Tab, Record<string, SortOption>>;

const DEFAULT_SORT: Record<Tab, string> = {
  mine: "updated",
  favorites: "saved",
};
const selectClass =
  "h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto";

/** Provides the personal deck library and the favorited public decks. */
export default function MyDecksPage() {
  const t = useTranslations("MyDecks");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "favorites" ? "favorites" : "mine",
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT[tab]);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const sorts: Record<string, SortOption> = SORTS[tab];
  const favorites = tab === "favorites";

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => {
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query]);

  const params: DecksQueryParams = {
    limit: 12,
    search: query || undefined,
    formatId: format ? Number(format) : undefined,
    ...(sorts[sort] ?? sorts[DEFAULT_SORT[tab]]),
  };
  // "saved-decks" is invalidated by useToggleSavedDeck: removing a favorite refreshes the list
  const decks = useInfinitePaginatedQuery({
    queryKey: [
      favorites ? "saved-decks" : "my-decks",
      user?.id,
      locale,
      params,
    ],
    queryFn: (page) =>
      favorites
        ? decksService.getSavedDecksPaginated({ ...params, page })
        : decksService.getUserDecksPaginated({ ...params, page }),
    enabled: isAuthenticated && !authLoading,
    getItemKey: (deck) => deck.id,
  });
  const formats = useQuery({
    queryKey: ["deck-formats", locale],
    queryFn: () => authedFetch<DeckFormat[]>("GET", "/deck-format"),
    enabled: isAuthenticated && !authLoading,
    staleTime: 300_000,
  });

  const deletion = useMutation({
    mutationFn: (deck: Deck) => decksService.removeDeck(deck.id),
    onSuccess: () => {
      setSelectedDeck(null);
      toast.success(t("deleted"));
      for (const key of [
        "my-decks",
        "decks",
        "saved-decks",
        "saved-deck-ids",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: () => toast.error(t("deleteError")),
  });
  const exportDeck = useMutation({
    mutationFn: (deck: Deck) => decksService.exportDeckJson(deck.id),
    onSuccess: (exported, deck) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exported, null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${deck.name.replace(/[^\p{L}\p{N}_-]+/gu, "-") || "deck"}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t("exported"));
    },
    onError: () => toast.error(t("exportError")),
  });

  const changeTab = (value: string) => {
    const next: Tab = value === "favorites" ? "favorites" : "mine";
    setTab(next);
    setSort(DEFAULT_SORT[next]);
    // Keep the tab in the URL so the view can be shared or reloaded
    const url = new URL(window.location.href);
    if (next === "favorites") url.searchParams.set("tab", next);
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };
  const reset = () => {
    setSearch("");
    setQuery("");
    setFormat("");
    setSort(DEFAULT_SORT[tab]);
  };
  const filtered = Boolean(query || format);
  const loading = authLoading || decks.isLoading;
  const createActions = (
    <>
      <Button asChild variant="outline">
        <Link href="/decks/import">
          <Download />
          <span className="sm:hidden">{t("importShort")}</span>
          <span className="hidden sm:inline">{t("import")}</span>
        </Link>
      </Button>
      <Button asChild>
        <Link href="/decks/create">
          <Plus />
          <span className="sm:hidden">{t("createShort")}</span>
          <span className="hidden sm:inline">{t("create")}</span>
        </Link>
      </Button>
    </>
  );

  if (!authLoading && !isAuthenticated)
    return (
      <PageWrapper gradient="secondary">
        <section className="tcg-surface mx-auto max-w-xl space-y-4 p-8 text-center">
          <Layers className="mx-auto h-10 w-10 text-primary" />
          <h1 className="font-heading text-2xl font-bold">
            {t("loginRequired")}
          </h1>
          <p className="text-muted-foreground">{t("loginRequiredHelp")}</p>
          <Button asChild>
            <Link href="/auth/login">{t("login")}</Link>
          </Button>
        </section>
      </PageWrapper>
    );

  return (
    <PageWrapper gradient="secondary">
      <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
        <section className="tcg-surface tcg-surface--hero space-y-5 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t("eyebrow")}
              </p>
              <h1 className="font-heading text-3xl font-black leading-tight md:text-[2.5rem]">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:shrink-0">
              {createActions}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <TabsList
              aria-label={t("tabs")}
              className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto"
            >
              <TabsTrigger value="mine" className="gap-2">
                <Layers className="h-4 w-4" />
                {t("tabMine")}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2">
                <BookmarkCheck className="h-4 w-4" />
                {t("tabFavorites")}
              </TabsTrigger>
            </TabsList>
            <Link
              href="/decks"
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              {t("explore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <TabsContent value={tab} className="mt-0 space-y-6">
          <section
            aria-label={t("filters")}
            className="tcg-surface space-y-4 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className="pl-9 pr-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    aria-label={t("clearSearch")}
                    onClick={() => setSearch("")}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <select
                  aria-label={t("format")}
                  className={selectClass}
                  value={format}
                  disabled={formats.isLoading || formats.isError}
                  onChange={(event) => {
                    setFormat(event.target.value);
                  }}
                >
                  <option value="">{t("allFormats")}</option>
                  {formats.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("sort")}
                  className={selectClass}
                  value={sort}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value in sorts) {
                      setSort(value);
                    }
                  }}
                >
                  {Object.keys(sorts).map((key) => (
                    <option key={key} value={key}>
                      {t(`sorts.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-3">
                <p role="status" className="text-sm text-muted-foreground">
                  {loading
                    ? t("loading")
                    : decks.isError
                      ? t("loadError")
                      : t("results", { count: decks.totalItems ?? 0 })}
                </p>
                {(search || format || sort !== DEFAULT_SORT[tab]) && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw />
                    {t("reset")}
                  </Button>
                )}
                {decks.isFetching && !loading && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-primary"
                    aria-label={t("loading")}
                  />
                )}
              </div>
              {!favorites && (
                <div
                  className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
                  role="group"
                  aria-label={t("display")}
                >
                  <Button
                    variant={layout === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-9"
                    aria-label={t("grid")}
                    aria-pressed={layout === "grid"}
                    onClick={() => setLayout("grid")}
                  >
                    <LayoutGrid />
                  </Button>
                  <Button
                    variant={layout === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-9"
                    aria-label={t("list")}
                    aria-pressed={layout === "list"}
                    onClick={() => setLayout("list")}
                  >
                    <List />
                  </Button>
                </div>
              )}
            </div>
            {formats.isError && (
              <p className="text-sm text-destructive">
                {t("formatsError")}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void formats.refetch()}
                >
                  {t("retry")}
                </button>
              </p>
            )}
          </section>

          {loading ? (
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={t("loading")}
              aria-busy="true"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : decks.isError ? (
            <section
              role="alert"
              className="tcg-surface space-y-4 p-10 text-center"
            >
              <h2 className="text-lg font-semibold">{t("loadError")}</h2>
              <p className="text-muted-foreground">{t("loadErrorHelp")}</p>
              <Button variant="outline" onClick={() => void decks.refetch()}>
                <RotateCcw />
                {t("retry")}
              </Button>
            </section>
          ) : decks.items.length ? (
            <>
              <div
                className={
                  favorites || layout === "grid"
                    ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid gap-3"
                }
              >
                {decks.items.map((deck) =>
                  favorites ? (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      onClick={() => decksService.incrementView(deck.id)}
                    />
                  ) : (
                    <MyDeckCard
                      key={deck.id}
                      deck={deck}
                      layout={layout}
                      exporting={exportDeck.isPending}
                      onExport={(item) => exportDeck.mutate(item)}
                      onDelete={(item) => {
                        deletion.reset();
                        setSelectedDeck(item);
                      }}
                    />
                  ),
                )}
              </div>
              <InfiniteScrollTrigger
                hasNextPage={decks.hasNextPage}
                isFetchingNextPage={decks.isFetchingNextPage}
                onLoadMore={() => void decks.fetchNextPage()}
              />
            </>
          ) : (
            <section className="tcg-surface flex flex-col items-center gap-4 px-5 py-16 text-center">
              <div className="rounded-2xl bg-primary/10 p-5">
                {filtered ? (
                  <SearchX className="h-10 w-10 text-primary" />
                ) : favorites ? (
                  <BookmarkCheck className="h-10 w-10 text-primary" />
                ) : (
                  <Layers className="h-10 w-10 text-primary" />
                )}
              </div>
              <h2 className="font-heading text-2xl font-bold">
                {t(
                  filtered
                    ? "noResults"
                    : favorites
                      ? "favoritesEmptyTitle"
                      : "emptyTitle",
                )}
              </h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {t(
                  filtered
                    ? "noResultsHelp"
                    : favorites
                      ? "favoritesEmptyHelp"
                      : "emptyHelp",
                )}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {filtered ? (
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw />
                    {t("reset")}
                  </Button>
                ) : favorites ? (
                  <Button asChild>
                    <Link href="/decks">
                      {t("explore")}
                      <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  createActions
                )}
              </div>
            </section>
          )}
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={!!selectedDeck}
        onOpenChange={(open) => {
          if (!open && !deletion.isPending) setSelectedDeck(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteWarning", { name: selectedDeck?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletion.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t("deleteError")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deletion.isPending}
              onClick={() => {
                if (selectedDeck) deletion.mutate(selectedDeck);
              }}
            >
              {deletion.isPending && <Loader2 className="animate-spin" />}
              {t(deletion.isPending ? "deleting" : "delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
