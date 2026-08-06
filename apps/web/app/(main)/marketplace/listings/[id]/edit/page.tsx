"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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
import { useAuth } from "@/contexts/AuthContext";
import { marketplaceService } from "@/services/marketplace.service";
import { Listing, ListingStatus } from "@/types/listing";
import { getCardImage } from "@/utils/images";
import {
  getSealedImageUrl,
  getSealedName,
  SEALED_PLACEHOLDER,
} from "@/utils/sealedImage";
import { cardStates, currencyOptions, languages } from "@/utils/variables";

interface FormState {
  price: string;
  currency: string;
  quantityAvailable: string;
  shippingCost: string;
  handlingTimeDays: string;
  cardState: string;
  language: string;
  status: ListingStatus;
  description: string;
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await marketplaceService.getListingById(id);
        setListing(data);
        setForm({
          price: String(data.price),
          currency: data.currency,
          quantityAvailable: String(data.quantityAvailable),
          shippingCost: String(data.shippingCost ?? 0),
          handlingTimeDays: String(data.handlingTimeDays ?? 3),
          cardState: data.cardState ?? "",
          language: data.language ?? "fr",
          status: data.status ?? "active",
          description: data.description ?? "",
        });
      } catch {
        setError("Cette annonce est introuvable ou a été supprimée.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const price = Number(form.price);
    const quantity = Number(form.quantityAvailable);
    const shippingCost = Number(form.shippingCost);
    const handlingTimeDays = Number(form.handlingTimeDays);

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Le prix doit être supérieur à 0.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("La quantité doit être d'au moins 1.");
      return;
    }
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      toast.error("Les frais de port ne peuvent pas être négatifs.");
      return;
    }
    if (!Number.isInteger(handlingTimeDays) || handlingTimeDays < 1) {
      toast.error("Le délai d'expédition doit être d'au moins 1 jour.");
      return;
    }

    setIsSaving(true);
    try {
      await marketplaceService.updateListing(id, {
        price,
        currency: form.currency as Listing["currency"],
        quantityAvailable: quantity,
        shippingCost,
        handlingTimeDays,
        status: form.status,
        language: form.language,
        description: form.description,
        ...(form.cardState
          ? { cardState: form.cardState as Listing["cardState"] }
          : {}),
      });
      toast.success("Annonce mise à jour");
      router.push("/profile");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "La mise à jour de l'annonce a échoué.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !listing || !form) {
    return (
      <div className="container mx-auto max-w-2xl py-10">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">
              {error ?? "Cette annonce est introuvable."}
            </p>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              Retour à mes ventes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && listing.seller?.id !== user.id) {
    return (
      <div className="container mx-auto max-w-2xl py-10">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">
              Vous ne pouvez modifier que vos propres annonces.
            </p>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              Retour à mes ventes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSealed = !!listing.sealedProduct;
  const productName = isSealed
    ? getSealedName(listing.sealedProduct) || "Produit scellé"
    : (listing.pokemonCard?.name ?? "Carte");
  const productImage = isSealed
    ? getSealedImageUrl(listing.sealedProduct) || SEALED_PLACEHOLDER
    : getCardImage(listing.pokemonCard);

  return (
    <div className="container mx-auto max-w-2xl py-10 space-y-6">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à mes ventes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Modifier l&apos;annonce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-24 shrink-0">
              <Image
                src={productImage}
                alt={productName}
                fill
                className="object-contain rounded"
              />
            </div>
            <div>
              <p className="font-semibold">{productName}</p>
              <p className="text-sm text-muted-foreground">
                Annonce #{listing.id}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) =>
                    setForm({ ...form, currency: value })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité disponible</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantityAvailable}
                  onChange={(e) =>
                    setForm({ ...form, quantityAvailable: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCost">Frais de port</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shippingCost}
                  onChange={(e) =>
                    setForm({ ...form, shippingCost: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Facturés une seule fois par commande, même si l&apos;acheteur
                  prend plusieurs de vos annonces. 0 pour les offrir.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handlingTimeDays">
                  Délai d&apos;expédition (jours ouvrés)
                </Label>
                <Input
                  id="handlingTimeDays"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={form.handlingTimeDays}
                  onChange={(e) =>
                    setForm({ ...form, handlingTimeDays: e.target.value })
                  }
                  required
                />
              </div>

              {!isSealed && (
                <div className="space-y-2">
                  <Label htmlFor="cardState">État de la carte</Label>
                  <Select
                    value={form.cardState}
                    onValueChange={(value) =>
                      setForm({ ...form, cardState: value })
                    }
                  >
                    <SelectTrigger id="cardState">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardStates.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select
                  value={form.language}
                  onValueChange={(value) =>
                    setForm({ ...form, language: value })
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Visibilité</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as ListingStatus })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">En vente</SelectItem>
                    <SelectItem value="inactive">
                      Retirée de la vente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Précisez l'état, les défauts éventuels, la provenance…"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
