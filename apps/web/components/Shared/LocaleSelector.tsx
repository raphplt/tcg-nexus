"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSelector() {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const query = Object.fromEntries(
      new URLSearchParams(window.location.search),
    );

    startTransition(() => {
      router.replace({ pathname, query }, { locale: next as SupportedLocale });
    });
  };

  return (
    <Select value={locale} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className=" h-8" aria-label={t("changeLanguage")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
