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

export const DeckInfoSection: React.FC<DeckInfoSectionProps> = ({
  form,
  formats,
  isEditMode,
}) => {
  return (
    <Card className="xl:col-span-2 border border-primary/20 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {isEditMode ? "Modifier le deck" : "Informations du deck"}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? "Modifiez les informations et la composition de votre deck."
            : "Donnez une identité claire à votre liste avant de composer votre sélection de cartes."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du deck</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Nom du deck"
                  className="h-11"
                />
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
              <FormLabel>Format</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choisissez un format" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {formats.map((v: any) => (
                    <SelectItem
                      key={v.id}
                      value={v.id.toString()}
                    >
                      {v.type}
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
            <FormItem className="col-span-full flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div className="space-y-0.5">
                <FormLabel>Deck public</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Partagez automatiquement votre deck avec la communauté.
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
