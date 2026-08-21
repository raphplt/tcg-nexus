import { useTranslations } from "next-intl";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Sparkles } from "lucide-react";
import { DeckFormValues } from "../deckForm.schema";

interface DeckInfoSectionProps {
  form: UseFormReturn<DeckFormValues>;
  formats: { id: number; type: string }[];
  isEditMode: boolean;
}

/** Renders the compact identity and visibility controls for a deck. */
export const DeckInfoSection: React.FC<DeckInfoSectionProps> = ({
  form,
  formats,
  isEditMode,
}) => {
  const t = useTranslations("DeckForm");
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="space-y-0.5 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {isEditMode ? t("editTitle") : t("infoTitle")}
        </CardTitle>
        <CardDescription className="text-xs">
          {isEditMode ? t("editSubtitle") : t("createSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_14rem_minmax(15rem,0.8fr)] xl:items-end">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("name")} className="h-9" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="formatId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("format")}</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("chooseFormat")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {formats.map((format) => (
                    <SelectItem key={format.id} value={format.id.toString()}>
                      {format.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex min-h-9 items-center justify-between gap-3 rounded-md border bg-muted/35 px-3 py-2 sm:col-span-2 xl:col-span-1">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">{t("isPublic")}</FormLabel>
                <p className="hidden text-xs text-muted-foreground sm:block xl:hidden 2xl:block">
                  {t("publicHelp")}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
