"use client";

import { Info, Save, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

const PAGE_SIZE = 60;

type Draft = Record<string, string>;

const draftKey = (path: string, locale: SupportedLocale) => `${path}|${locale}`;

interface TranslationsManagerProps {
  entries: TranslationEntry[];
  systemContent: SystemContentItem[];
}

export function TranslationsManager({
  entries,
  systemContent,
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
      <div className="flex items-start gap-2 rounded border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>{t("storageNotice")}</span>
      </div>

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

/** Textarea sized to its content; one line is sufficient for most keys. */
function AutoTextarea({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, []);

  useEffect(resize, [resize, value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => {
        onChange(event.target.value);
        resize();
      }}
      className={cn(
        "w-full resize-none overflow-hidden rounded border bg-background px-2 py-1 text-sm leading-snug",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        invalid && "border-destructive/60",
      )}
    />
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
  const [namespace, setNamespace] = useState("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const namespaces = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.path.split(".")[0]!))].sort(),
    [entries],
  );

  const missingCount = useMemo(
    () =>
      entries.filter((entry) =>
        SUPPORTED_LOCALES.some((locale) => !entry.values[locale]?.trim()),
      ).length,
    [entries],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (namespace !== "all" && !entry.path.startsWith(`${namespace}.`)) {
        return false;
      }
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
  }, [entries, search, namespace, onlyMissing]);

  const shown = filtered.slice(0, visible);
  const resetPaging = () => setVisible(PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPaging();
            }}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9"
          />
        </div>

        <select
          value={namespace}
          onChange={(event) => {
            setNamespace(event.target.value);
            resetPaging();
          }}
          className="h-9 rounded border bg-background px-2 text-sm"
        >
          <option value="all">{t("allNamespaces")}</option>
          {namespaces.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <Button
          variant={onlyMissing ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setOnlyMissing((value) => !value);
            resetPaging();
          }}
        >
          {t("onlyMissing")} ({missingCount})
        </Button>

        <span className="text-sm text-muted-foreground">
          {t("resultCount", { count: filtered.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded border">
        <div className="grid grid-cols-[minmax(160px,1fr)_1.6fr_1.6fr] gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("columnKey")}</span>
          {SUPPORTED_LOCALES.map((locale) => (
            <span key={locale}>{locale.toUpperCase()}</span>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        )}

        {shown.map((entry) => (
          <div
            key={entry.path}
            className="grid grid-cols-[minmax(160px,1fr)_1.6fr_1.6fr] items-start gap-3 border-b px-3 py-1.5 last:border-b-0 hover:bg-muted/30"
          >
            <code
              title={entry.path}
              className="truncate pt-1.5 text-xs text-muted-foreground"
            >
              {namespace === "all"
                ? entry.path
                : entry.path.slice(namespace.length + 1)}
            </code>

            {SUPPORTED_LOCALES.map((locale) => {
              const key = draftKey(entry.path, locale);
              const value = draft[key] ?? entry.values[locale] ?? "";
              return (
                <div key={locale} className="flex items-start gap-1.5">
                  <AutoTextarea
                    value={value}
                    invalid={!value.trim()}
                    onChange={(next) =>
                      setDraft((prev) => ({ ...prev, [key]: next }))
                    }
                  />
                  {(key in draft || entry.overridden[locale]) && (
                    <span
                      title={key in draft ? t("modified") : t("customised")}
                      className={cn(
                        "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                        key in draft ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {visible < filtered.length && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setVisible((value) => value + PAGE_SIZE)}
        >
          {t("loadMore")}
        </Button>
      )}
    </div>
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
