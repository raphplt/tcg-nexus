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
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";

export function LocaleSelector() {
  const locale = useLocale() as SupportedLocale;
  const { isAuthenticated } = useAuth();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    // la préférence suit l'utilisateur d'un navigateur à l'autre
    if (isAuthenticated) {
      userService
        .updateProfile({ preferredLocale: next })
        .catch(() => undefined);
    }

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
