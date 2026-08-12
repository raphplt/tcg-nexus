"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
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
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "@/utils/sealedImage";
import { cardStates, currencyOptions, languages } from "@/utils/variables";
import { PriceSuggestionHint } from "../../../_components/PriceSuggestionHint";
import { ShippingPolicyNotice } from "../../../_components/ShippingPolicyNotice";

interface FormState {
  price: string;
  currency: string;
  quantityAvailable: string;
  cardState: string;
  language: string;
  status: ListingStatus;
  description: string;
}

export default function EditListingPage() {
  const t = useTranslations("EditListing");
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
          cardState: data.cardState ?? "",
          language: data.language ?? "fr",
          status: data.status ?? "active",
          description: data.description ?? "",
        });
      } catch {
        setError(t("notFoundOrDeleted"));
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

    if (!Number.isFinite(price) || price <= 0) {
      toast.error(t("priceInvalid"));
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error(t("quantityInvalid"));
      return;
    }
    setIsSaving(true);
    try {
      await marketplaceService.updateListing(id, {
        price,
        currency: form.currency as Listing["currency"],
        quantityAvailable: quantity,
        status: form.status,
        language: form.language,
        description: form.description,
        ...(form.cardState
          ? { cardState: form.cardState as Listing["cardState"] }
          : {}),
      });
      toast.success(t("updated"));
      router.push("/profile");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("updateFailed");
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
            <p className="text-destructive">{error ?? t("notFound")}</p>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              {t("backToSales")}
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
            <p className="text-destructive">{t("ownListingsOnly")}</p>
            <Button variant="outline" onClick={() => router.push("/profile")}>
              {t("backToSales")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSealed = !!listing.sealedProduct;
  const productName = isSealed
    ? listing.sealedProduct?.name || t("sealedProduct")
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
        {t("backToSales")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
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
                <Label htmlFor="price">{t("priceLabel")}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
                {!isSealed && (
                  <PriceSuggestionHint
                    cardId={listing.pokemonCard?.id}
                    cardState={form.cardState || undefined}
                    currency={form.currency}
                    onApply={(price) =>
                      setForm({ ...form, price: String(price) })
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t("currency")}</Label>
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
                <Label htmlFor="quantity">{t("quantityAvailable")}</Label>
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

              {!isSealed && (
                <div className="space-y-2">
                  <Label htmlFor="cardState">{t("cardCondition")}</Label>
                  <Select
                    value={form.cardState}
                    onValueChange={(value) =>
                      setForm({ ...form, cardState: value })
                    }
                  >
                    <SelectTrigger id="cardState">
                      <SelectValue placeholder={t("select")} />
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
                <Label htmlFor="language">{t("language")}</Label>
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
                <Label htmlFor="status">{t("visibility")}</Label>
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
                    <SelectItem value="active">{t("onSale")}</SelectItem>
                    <SelectItem value="inactive">{t("unlisted")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ShippingPolicyNotice productKind={isSealed ? "sealed" : "card"} />

            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
              >
                {t("cancel")}
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
