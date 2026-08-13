"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MarkdownContent } from "@/components/Blog/MarkdownContent";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { articleService } from "@/services/article.service";
import { Article, ArticlePayload, ArticleStatus } from "@/types/article";

type ArticleForm = Required<
  Pick<ArticlePayload, "title" | "locale" | "status">
> &
  Record<
    "slug" | "excerpt" | "image" | "content" | "metaTitle" | "metaDescription",
    string
  >;

const EMPTY_FORM: ArticleForm = {
  title: "",
  slug: "",
  excerpt: "",
  image: "",
  content: "",
  status: "draft",
  locale: "fr",
  metaTitle: "",
  metaDescription: "",
};

function articleToForm(article: Article): ArticleForm {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    image: article.image ?? "",
    content: article.content ?? "",
    status: article.status,
    locale: article.locale,
    metaTitle: article.metaTitle ?? "",
    metaDescription: article.metaDescription ?? "",
  };
}

function toPayload(form: ArticleForm, status: ArticleStatus): ArticlePayload {
  return {
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt || null,
    image: form.image || null,
    content: form.content || null,
    status,
    locale: form.locale,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
  };
}

/** Provides the complete article drafting and publishing interface. */
export default function ManageBlogPage() {
  const t = useTranslations("BlogAdmin");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>(
    "all",
  );
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles", "admin", statusFilter],
    queryFn: () =>
      articleService.getAdmin({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      }),
  });

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedId),
    [articles, selectedId],
  );

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: ({ payload }: { payload: ArticlePayload }) =>
      selectedId
        ? articleService.update(selectedId, payload)
        : articleService.create(payload),
    onSuccess: async (article) => {
      setSelectedId(article.id);
      setForm(articleToForm(article));
      setIsDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => articleService.delete(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setIsDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(t("deleted"));
    },
    onError: () => toast.error(t("deleteError")),
  });

  const updateField = <K extends keyof ArticleForm>(
    key: K,
    value: ArticleForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const selectArticle = (article: Article) => {
    if (isDirty && !window.confirm(t("discardChanges"))) return;
    setSelectedId(article.id);
    setForm(articleToForm(article));
    setIsDirty(false);
  };

  const createNew = () => {
    if (isDirty && !window.confirm(t("discardChanges"))) return;
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setIsDirty(false);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status: ArticleStatus =
      submitter?.value === "published" ? "published" : "draft";
    saveMutation.mutate({ payload: toPayload(form, status) });
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "moderator"]}>
      <main className="container mx-auto space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-2">
            <Badge variant="secondary">{t("badge")}</Badge>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={createNew} className="gap-2">
            <FilePlus2 className="h-4 w-4" /> {t("newArticle")}
          </Button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader className="space-y-3">
              <CardTitle>{t("articles")}</CardTitle>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | ArticleStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("drafts")}</SelectItem>
                  <SelectItem value="published">{t("published")}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : articles.length ? (
                articles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => selectArticle(article)}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-left transition hover:bg-muted ${
                      selectedId === article.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {article.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {article.locale.toUpperCase()} · {t(article.status)}
                      </span>
                    </span>
                    <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              )}
            </CardContent>
          </Card>

          <form className="space-y-6" onSubmit={save}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedArticle ? t("editArticle") : t("createArticle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field label={t("fields.title")} className="md:col-span-2">
                  <Input
                    required
                    minLength={3}
                    maxLength={180}
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                  />
                </Field>
                <Field label={t("fields.slug")}>
                  <Input
                    value={form.slug}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    placeholder={t("slugPlaceholder")}
                    onChange={(event) =>
                      updateField("slug", event.target.value)
                    }
                  />
                </Field>
                <Field label={t("fields.locale")}>
                  <Select
                    value={form.locale}
                    onValueChange={(value) =>
                      updateField("locale", value as "fr" | "en")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("fields.excerpt")} className="md:col-span-2">
                  <Textarea
                    maxLength={500}
                    value={form.excerpt}
                    onChange={(event) =>
                      updateField("excerpt", event.target.value)
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {form.excerpt.length}/500
                  </span>
                </Field>
                <Field label={t("fields.image")} className="md:col-span-2">
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={form.image}
                    onChange={(event) =>
                      updateField("image", event.target.value)
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <div className="grid gap-6 2xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("content")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    required
                    className="min-h-[34rem] font-mono text-sm"
                    value={form.content}
                    onChange={(event) =>
                      updateField("content", event.target.value)
                    }
                    placeholder={t("contentPlaceholder")}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("preview")}</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[34rem]">
                  {form.content ? (
                    <MarkdownContent content={form.content} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("previewEmpty")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("seo")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field label={t("fields.metaTitle")}>
                  <Input
                    maxLength={180}
                    value={form.metaTitle}
                    onChange={(event) =>
                      updateField("metaTitle", event.target.value)
                    }
                  />
                </Field>
                <Field label={t("fields.metaDescription")}>
                  <Textarea
                    maxLength={320}
                    value={form.metaDescription}
                    onChange={(event) =>
                      updateField("metaDescription", event.target.value)
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {selectedArticle && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteTarget(selectedArticle)}
                  className="mr-auto gap-2"
                >
                  <Trash2 className="h-4 w-4" /> {t("delete")}
                </Button>
              )}
              <Button
                type="submit"
                value="draft"
                variant="outline"
                disabled={saveMutation.isPending}
              >
                {t("saveDraft")}
              </Button>
              <Button
                type="submit"
                value="published"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("publish")}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
