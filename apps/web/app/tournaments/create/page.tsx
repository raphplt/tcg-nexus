"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as z from "zod";
import usePlacesAutocomplete from "use-places-autocomplete";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CircleAlert,
  CheckCircle,
  ArrowLeft,
  ShieldAlert,
  ChevronsUpDown,
  Check,
  Users,
} from "lucide-react";
import {
  TournamentStatus,
  TournamentType,
  TournamentFormat,
  tournamentFormatTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { tournamentService } from "@/services/tournament.service";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTournamentDto } from "@/types/tournament";
import { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const formSchema = z
  .object({
    name: z.string().min(3, "Le nom est requis"),
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().min(1, "Date de début requise"),
    endDate: z.string().min(1, "Date de fin requise"),
    registrationDeadline: z.string().optional(),
    format: z.nativeEnum(TournamentFormat),
    type: z.nativeEnum(TournamentType),
    status: z.nativeEnum(TournamentStatus).optional(),
    isFinished: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    allowLateRegistration: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    maxPlayers: z.number().int().positive().optional(),
    minPlayers: z.number().int().positive().optional(),
    currentRound: z.number().int().min(0).optional(),
    totalRounds: z.number().int().min(0).optional(),
    rules: z.string().optional(),
    additionalInfo: z.string().optional(),
    ageRestrictionMin: z.number().min(0).optional(),
    ageRestrictionMax: z.number().min(0).optional(),
    allowedFormats: z.array(z.string()).optional(),
    fillWithPlayers: z.boolean().optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function CreateTournamentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

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
      format: TournamentFormat.STANDARD,
      type: TournamentType.SINGLE_ELIMINATION,
      status: TournamentStatus.DRAFT,
      isPublic: true,
      allowLateRegistration: false,
      requiresApproval: false,
      allowedFormats: [],
      currentRound: 0,
      totalRounds: 0,
      fillWithPlayers: false,
    },
  });

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

    try {
      // Si l'admin veut remplir avec des joueurs, on s'assure que les conditions sont remplies
      const shouldFillWithPlayers = isAdmin && values.fillWithPlayers;

      // Calculer une date limite d'inscription si non fournie et option admin activée
      let registrationDeadline = values.registrationDeadline
        ? new Date(values.registrationDeadline)
        : undefined;

      if (shouldFillWithPlayers && !registrationDeadline) {
        // Définir une date limite dans le futur (1 jour avant le début)
        const startDate = new Date(values.startDate);
        registrationDeadline = new Date(
          startDate.getTime() - 24 * 60 * 60 * 1000,
        );
        // Si cette date est déjà passée, mettre dans 1 semaine
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
        maxPlayers: shouldFillWithPlayers
          ? Math.max(values.maxPlayers || 8, 8)
          : values.maxPlayers,
        minPlayers: shouldFillWithPlayers
          ? Math.max(values.minPlayers || 2, 2)
          : values.minPlayers,
      };

      const tournament = await tournamentService.create(payload);

      // Si l'admin veut remplir le tournoi avec 8 joueurs
      if (shouldFillWithPlayers) {
        // D'abord ouvrir les inscriptions
        await tournamentService.updateStatus(
          tournament.id,
          "registration_open",
        );
        // Puis remplir avec 8 joueurs
        await tournamentService.fillWithPlayers(tournament.id, 8);
      }

      setSuccess("Tournoi créé avec succès !");
      setTimeout(() => {
        router.push(`/tournaments/${tournament.id}`);
      }, 1500);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Erreur lors de la création du tournoi.";
      setError(message);
    }
  };

  if (!user?.isPro) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous devez être un organisateur professionnel pour accéder à cette
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="flex mb-6 max-w-xl">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center">Créer un Tournoi</h2>

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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nom du tournoi</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom du tournoi"
                        {...field}
                      />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Description du tournoi"
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
                    <FormLabel>Lieu</FormLabel>
                    <Popover
                      open={locationOpen}
                      onOpenChange={setLocationOpen}
                    >
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
                              "Rechercher une adresse..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Rechercher une adresse..."
                            value={placesValue}
                            onValueChange={setPlacesValue}
                          />
                          <CommandList>
                            <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
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
                    <FormLabel>Date limite d'inscription</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
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
                    <FormLabel>Type de tournoi</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TournamentType).map((value) => (
                          <SelectItem
                            key={value}
                            value={value}
                          >
                            {tournamentTypeTranslation[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TournamentFormat).map((value) => (
                          <SelectItem
                            key={value}
                            value={value}
                          >
                            {tournamentFormatTranslation[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between col-span-2">
                    <FormLabel>Tournoi public</FormLabel>
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

              <div className="grid grid-cols-2 gap-4 col-span-2">
                <FormField
                  control={form.control}
                  name="ageRestrictionMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Âge minimum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || undefined)
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
                      <FormLabel>Âge maximum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || undefined)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Option admin pour remplir le tournoi avec 8 joueurs */}
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
                            Remplir avec 8 joueurs (Admin)
                          </FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            Ouvre automatiquement les inscriptions et inscrit 8
                            joueurs aléatoires
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

            <Button
              type="submit"
              className="w-full"
            >
              Créer le tournoi
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}