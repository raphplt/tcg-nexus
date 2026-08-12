"use client";

import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronsUpDown,
  CircleAlert,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { tournamentService } from "@/services/tournament.service";
import { UserRole } from "@/types/auth";
import { CreateTournamentDto } from "@/types/tournament";
import {
  TournamentStatus,
  TournamentType,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { FormValues, formSchema } from "../utils";

export default function CreateTournamentPage() {
  const t = useTranslations("CreateTournament");
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    ready: placesReady,
    value: placesValue,
    setValue: setPlacesValue,
    suggestions: { status: placesStatus, data: placesData },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {},
    debounce: 300,
  });

  const isAdmin = user?.role === UserRole.ADMIN;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: "",
      endDate: "",
      type: TournamentType.SINGLE_ELIMINATION,
      status: TournamentStatus.DRAFT,
      isPublic: true,
      allowLateRegistration: false,
      requiresApproval: false,
      allowedFormats: [],
      currentRound: 0,
      totalRounds: 0,
      fillWithPlayers: false,
      isExternal: false,
      externalRegistrationUrl: "",
    },
  });
  const isExternal = form.watch("isExternal");

  const handleLocationSelect = (
    address: string,
    field: { onChange: (value: string) => void },
  ) => {
    setPlacesValue(address, false);
    field.onChange(address);
    clearSuggestions();
    setLocationOpen(false);
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const shouldFillWithPlayers = isAdmin && values.fillWithPlayers;

      let registrationDeadline = values.registrationDeadline
        ? new Date(values.registrationDeadline)
        : undefined;

      if (shouldFillWithPlayers && !registrationDeadline) {
        const startDate = new Date(values.startDate);
        registrationDeadline = new Date(
          startDate.getTime() - 24 * 60 * 60 * 1000,
        );
        if (registrationDeadline <= new Date()) {
          registrationDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
      }

      const payload: CreateTournamentDto = {
        name: values.name,
        description: values.description,
        location: values.location,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        type: values.type,
        registrationDeadline,
        allowLateRegistration: values.allowLateRegistration,
        requiresApproval: values.requiresApproval,
        rules: values.rules,
        additionalInfo: values.additionalInfo,
        ageRestrictionMin: values.ageRestrictionMin,
        ageRestrictionMax: values.ageRestrictionMax,
        allowedFormats: values.allowedFormats,
        isPublic: values.isPublic,
        isExternal: values.isExternal,
        externalRegistrationUrl: values.isExternal
          ? values.externalRegistrationUrl
          : undefined,
        maxPlayers: shouldFillWithPlayers
          ? Math.max(values.maxPlayers || 8, 8)
          : values.maxPlayers,
        minPlayers: shouldFillWithPlayers
          ? Math.max(values.minPlayers || 2, 2)
          : values.minPlayers,
      };

      const tournament = await tournamentService.create(payload);

      if (shouldFillWithPlayers) {
        await tournamentService.updateStatus(
          tournament.id,
          "registration_open",
        );
        await tournamentService.fillWithPlayers(tournament.id, 8);
      }

      setSuccess(t("success"));
      setTimeout(() => {
        router.push(`/tournaments/${tournament.id}`);
      }, 1500);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("error");
      setError(message);
    }
  };

  if (
    !user?.isPro ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR)
  ) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t("accessDenied")}</AlertTitle>
          <AlertDescription>{t("organizerRequired")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="flex mb-6 max-w-xl">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center">{t("title")}</h2>

        {error && (
          <Alert variant="destructive">
            <CircleAlert className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("name")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("descriptionPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("location")}</FormLabel>
                    <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={locationOpen}
                            className="w-full justify-between font-normal"
                            disabled={!placesReady}
                          >
                            {field.value ||
                              placesValue ||
                              t("addressPlaceholder")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-100 p-0">
                        <Command>
                          <CommandInput
                            placeholder={t("addressPlaceholder")}
                            value={placesValue}
                            onValueChange={setPlacesValue}
                          />
                          <CommandList>
                            <CommandEmpty>{t("noAddressFound")}</CommandEmpty>
                            <CommandGroup>
                              {placesStatus === "OK" &&
                                placesData.map(({ place_id, description }) => (
                                  <CommandItem
                                    key={place_id}
                                    value={description}
                                    onSelect={() =>
                                      handleLocationSelect(description, field)
                                    }
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === description
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {description}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("registrationDeadline")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("startDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("endDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("typePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TournamentType).map((value) => (
                          <SelectItem
                            key={value}
                            value={value}
                            disabled={
                              !isExternal &&
                              value !== TournamentType.SINGLE_ELIMINATION
                            }
                          >
                            {tournamentTypeTranslation[value]}
                            {!isExternal &&
                            value !== TournamentType.SINGLE_ELIMINATION
                              ? " — gestion externe uniquement"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("formatNotice")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between col-span-2">
                    <FormLabel>{t("isPublic")}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="shadow-none focus:ring-0"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isExternal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>{t("isExternal")}</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("externalNotice")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (
                            !checked &&
                            form.getValues("type") !==
                              TournamentType.SINGLE_ELIMINATION
                          ) {
                            form.setValue(
                              "type",
                              TournamentType.SINGLE_ELIMINATION,
                              { shouldValidate: true },
                            );
                          }
                        }}
                        className="shadow-none focus:ring-0"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isExternal && (
                <FormField
                  control={form.control}
                  name="externalRegistrationUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("externalLink")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/register"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4 col-span-2">
                <FormField
                  control={form.control}
                  name="ageRestrictionMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("minAge")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              Number.isNaN(e.target.valueAsNumber)
                                ? undefined
                                : e.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageRestrictionMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maxAge")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              Number.isNaN(e.target.valueAsNumber)
                                ? undefined
                                : e.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {isAdmin && (
                <div className="col-span-2 p-4 border border-amber-500/30 rounded-lg bg-amber-500/5">
                  <FormField
                    control={form.control}
                    name="fillWithPlayers"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2 text-amber-600">
                            <Users className="h-4 w-4" />
                            {t("fillWithPlayers")}
                          </FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            {t("fillWithPlayersHelp")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="shadow-none focus:ring-0"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
