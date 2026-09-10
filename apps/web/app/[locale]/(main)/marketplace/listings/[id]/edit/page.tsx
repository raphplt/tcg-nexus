"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { SmartImage } from "@/components/ui/SmartImage";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouter } from "@/i18n/navigation";
import { marketplaceService } from "@/services/marketplace.service";
import { Listing, ListingStatus } from "@/types/listing";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "@/utils/sealedImage";
import {
  ListingFields,
  type ListingFieldsValues,
  useListingSchema,
} from "../../../_components/ListingFields";

/** Edits an existing listing; mounted once the listing is loaded so its schema is fixed. */
function EditListingForm({ listing }: { listing: Listing }) {
  const t = useTranslations("EditListing");
  const tf = useTranslations("ListingForm");
  const router = useRouter();
  const isSealed = Boolean(listing.sealedProduct);
  const schema = useListingSchema(!isSealed);
  const [status, setStatus] = useState<ListingStatus>(
    listing.status ?? "active",
  );

  const form = useForm<ListingFieldsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: Number(listing.price),
      currency: listing.currency,
      quantityAvailable: listing.quantityAvailable,
      cardState: listing.cardState ?? undefined,
      language: listing.language ?? "fr",
      description: listing.description ?? "",
    },
  });

  const onSubmit = async (values: ListingFieldsValues) => {
    try {
      await marketplaceService.updateListing(String(listing.id), {
        ...values,
        currency: values.currency as Listing["currency"],
        cardState: values.cardState as Listing["cardState"],
        status,
      });
      toast.success(t("updated"));
      router.push("/profile");
    } catch (error: unknown) {
      const message = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message || t("updateFailed"),
      );
    }
  };

  const productName = isSealed
    ? listing.sealedProduct?.name || t("sealedProduct")
    : (listing.pokemonCard?.name ?? "");
  const productImage = isSealed
    ? getSealedImageUrl(listing.sealedProduct) || SEALED_PLACEHOLDER
    : getCardImage(listing.pokemonCard, "low");
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 pb-20 sm:pb-0"
      >
        <Card>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-md bg-muted sm:w-16">
                <SmartImage
                  src={productImage}
                  fallbackSrc={
                    isSealed
                      ? SEALED_PLACEHOLDER
                      : "/images/carte-pokemon-dos.jpg"
                  }
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">
                  {productName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("listingNumber", { id: listing.id })}
                </p>
              </div>
            </div>

            <ListingFields
              form={form}
              productKind={isSealed ? "sealed" : "card"}
              cardId={listing.pokemonCard?.id}
            >
              <div className="flex h-9 items-center justify-between gap-3 self-end rounded-md border px-3">
                <Label htmlFor="listing-status">{tf("onSale")}</Label>
                <Switch
                  id="listing-status"
                  checked={status === "active"}
                  onCheckedChange={(checked) =>
                    setStatus(checked ? "active" : "inactive")
                  }
                />
              </div>
            </ListingFields>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background/95 p-3 backdrop-blur-sm sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            asChild
          >
            <Link href="/profile">{t("cancel")}</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function EditListingPage() {
  const t = useTranslations("EditListing");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    marketplaceService
      .getListingById(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  const errorMessage = !listing
    ? t("notFound")
    : user && listing.seller?.id !== user.id
      ? t("ownListingsOnly")
      : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/10 px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : errorMessage || !listing ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center text-destructive">
            {errorMessage}
          </p>
        ) : (
          <EditListingForm listing={listing} />
        )}
      </div>
    </div>
  );
}
