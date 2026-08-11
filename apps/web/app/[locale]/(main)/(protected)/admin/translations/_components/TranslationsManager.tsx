"use client";

import { AlertTriangle, Save, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/config";
import {
  saveTranslations,
  type SystemContentItem,
  type TranslationEntry,
} from "../actions";

const PAGE_SIZE = 40;

type Draft = Record<string, string>;

const draftKey = (path: string, locale: SupportedLocale) => `${path}|${locale}`;

interface TranslationsManagerProps {
  entries: TranslationEntry[];
  systemContent: SystemContentItem[];
  isProduction: boolean;
}

export function TranslationsManager({
  entries,
  systemContent,
  isProduction,
}: TranslationsManagerProps) {
  const t = useTranslations("AdminTranslations");
  const [draft, setDraft] = useState<Draft>({});
  const [isSaving, startSaving] = useTransition();

  const pendingCount = Object.keys(draft).length;

  const onSave = () => {
    const changes = Object.entries(draft).map(([key, value]) => {
      const [path, locale] = key.split("|");
      return { path: path!, locale: locale!, value };
    });

    startSaving(async () => {
      const result = await saveTranslations(changes);
      if (result.ok) {
        toast.success(t("saved", { count: result.saved }));
        setDraft({});
      } else {
        toast.error(t("saveError", { error: result.error }));
      }
    });
  };

  return (
    <div className="space-y-4">
      {isProduction && (
        <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{t("productionWarning")}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("pendingChanges", { count: pendingCount })}
        </p>
        <Button onClick={onSave} disabled={pendingCount === 0 || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>

      <Tabs defaultValue="interface" className="space-y-4">
        <TabsList>
          <TabsTrigger value="interface">
            {t("tabInterface", { count: entries.length })}
          </TabsTrigger>
          <TabsTrigger value="content">
            {t("tabContent", { count: systemContent.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interface">
          <InterfaceEditor
            entries={entries}
            draft={draft}
            setDraft={setDraft}
          />
        </TabsContent>

        <TabsContent value="content">
          <SystemContentEditor
            items={systemContent}
            draft={draft}
            setDraft={setDraft}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InterfaceEditor({
  entries,
  draft,
  setDraft,
}: {
  entries: TranslationEntry[];
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const t = useTranslations("AdminTranslations");
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (
        onlyMissing &&
        SUPPORTED_LOCALES.every((locale) => entry.values[locale]?.trim())
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        entry.path.toLowerCase().includes(needle) ||
        SUPPORTED_LOCALES.some((locale) =>
          entry.values[locale]?.toLowerCase().includes(needle),
        )
      );
    });
  }, [entries, search, onlyMissing]);

  const shown = filtered.slice(0, visible);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">{t("interfaceTitle")}</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Button
            variant={onlyMissing ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setOnlyMissing((value) => !value);
              setVisible(PAGE_SIZE);
            }}
          >
            {t("onlyMissing")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("resultCount", { count: filtered.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        )}

        {shown.map((entry) => (
          <div key={entry.path} className="space-y-2 rounded border p-3">
            <code className="text-xs text-muted-foreground">{entry.path}</code>
            <div className="grid gap-3 md:grid-cols-2">
              {SUPPORTED_LOCALES.map((locale) => {
                const key = draftKey(entry.path, locale);
                const value = draft[key] ?? entry.values[locale] ?? "";
                const isMissing = !value.trim();
                return (
                  <div key={locale} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs uppercase">
                        {locale}
                      </Badge>
                      {isMissing && (
                        <Badge variant="destructive" className="text-xs">
                          {t("missing")}
                        </Badge>
                      )}
                      {key in draft && (
                        <Badge variant="secondary" className="text-xs">
                          {t("modified")}
                        </Badge>
                      )}
                    </div>
                    <Textarea
                      value={value}
                      rows={2}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {visible < filtered.length && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setVisible((value) => value + PAGE_SIZE)}
          >
            {t("loadMore")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SystemContentEditor({
  items,
  draft,
  setDraft,
}: {
  items: SystemContentItem[];
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const t = useTranslations("AdminTranslations");
  const targetLocales = SUPPORTED_LOCALES.filter(
    (locale) => locale !== DEFAULT_LOCALE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("contentTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("contentHelp")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("contentEmpty")}
          </p>
        )}

        {items.map((item) => (
          <div key={item.keyPrefix} className="space-y-3 rounded border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.category}</Badge>
              <code className="text-xs text-muted-foreground">
                {item.keyPrefix}
              </code>
            </div>

            {item.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {field.name}
                </p>
                <div className="rounded bg-muted/50 px-3 py-2 text-sm">
                  {field.source}
                </div>
                {targetLocales.map((locale) => {
                  const key = draftKey(
                    `${item.keyPrefix}.${field.name}`,
                    locale,
                  );
                  const value = draft[key] ?? field.translations[locale] ?? "";
                  return (
                    <div key={locale} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs uppercase">
                          {locale}
                        </Badge>
                        {!value.trim() && (
                          <Badge variant="destructive" className="text-xs">
                            {t("missing")}
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        value={value}
                        rows={field.name === "answer" ? 3 : 2}
                        placeholder={t("translationPlaceholder")}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
