"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerRevenue, salesService } from "@/services/sales.service";
import { FulfillmentStatus, SellerSale } from "@/types/order";
import {
  getFulfillmentColor,
  getFulfillmentLabel,
  getOrderItemImage,
} from "@/utils/order";
import { formatPrice } from "@/utils/price";
import { formatHandlingTime } from "@/utils/shipping";
import ShipSaleDialog from "./_components/ShipSaleDialog";

const FILTERS: Array<{ label: string; value: FulfillmentStatus | "all" }> = [
  { label: "Toutes", value: "all" },
  { label: "À expédier", value: FulfillmentStatus.TO_SHIP },
  { label: "En préparation", value: FulfillmentStatus.PREPARING },
  { label: "Expédiées", value: FulfillmentStatus.SHIPPED },
  { label: "Livrées", value: FulfillmentStatus.DELIVERED },
];

export default function SellerSalesPage() {
  const [sales, setSales] = useState<SellerSale[]>([]);
  const [revenue, setRevenue] = useState<SellerRevenue | null>(null);
  const [filter, setFilter] = useState<FulfillmentStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saleToShip, setSaleToShip] = useState<SellerSale | null>(null);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await salesService.getMySales({
        page,
        limit: 10,
        fulfillmentStatus: filter === "all" ? undefined : filter,
      });
      setSales(result.data);
      setTotalPages(result.meta.totalPages);
    } catch {
      setError("Impossible de charger vos ventes. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    salesService
      .getMyRevenue()
      .then(setRevenue)
      .catch(() => setRevenue(null));
  }, []);

  const applyFulfillment = async (
    sale: SellerSale,
    fulfillmentStatus: FulfillmentStatus,
    extra?: { carrier: string; trackingNumber: string },
  ) => {
    try {
      await salesService.updateFulfillment(sale.id, {
        fulfillmentStatus,
        ...extra,
      });
      toast.success("Vente mise à jour");
      await loadSales();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "La mise à jour a échoué.";
      toast.error(message);
      throw err;
    }
  };

  const currencies = Object.entries(revenue?.revenueByCurrency ?? {});

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes ventes</h1>
          <p className="text-muted-foreground mt-1">
            Préparez et expédiez les commandes reçues.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/profile">Gérer mes annonces</Link>
          </Button>
          <Button asChild>
            <Link href="/marketplace/create">
              <Plus className="mr-2 h-4 w-4" />
              Vendre une carte
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventes réalisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{revenue?.totalSales ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encaissé pour vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currencies.length === 0 ? (
              <p className="text-3xl font-bold">—</p>
            ) : (
              <div className="space-y-1">
                {currencies.map(([currency, amount]) => (
                  <p key={currency} className="text-2xl font-bold">
                    {formatPrice(amount, currency)}
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Articles et frais de port compris. Montant perçu par TCG Nexus sur
              vos ventes payées : le reversement vers votre compte bancaire
              n&apos;est pas implémenté.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <span className="text-sm">{error}</span>
            <Button size="sm" variant="outline" onClick={loadSales}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : sales.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Vous n'avez encore rien vendu. Publiez une annonce pour commencer."
                : "Aucune vente dans cet état."}
            </p>
            {filter === "all" && (
              <Button asChild>
                <Link href="/marketplace/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Vendre une carte
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative h-24 w-16 shrink-0">
                  <Image
                    src={getOrderItemImage(sale)}
                    alt={sale.productName}
                    fill
                    className="object-contain rounded"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{sale.productName}</span>
                    <Badge
                      className={getFulfillmentColor(sale.fulfillmentStatus)}
                    >
                      {getFulfillmentLabel(sale.fulfillmentStatus)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Commande #{sale.order?.id} ·{" "}
                    {sale.order?.createdAt &&
                      format(new Date(sale.order.createdAt), "d MMMM yyyy", {
                        locale: fr,
                      })}{" "}
                    · x{sale.quantity} ·{" "}
                    {formatPrice(
                      sale.unitPrice * sale.quantity,
                      sale.order?.currency ?? "EUR",
                    )}
                    {sale.shippingCost > 0 &&
                      ` + ${formatPrice(sale.shippingCost, sale.order?.currency ?? "EUR")} de port`}
                  </p>
                  {sale.fulfillmentStatus === FulfillmentStatus.TO_SHIP && (
                    <p className="text-sm text-muted-foreground">
                      {formatHandlingTime(sale.handlingTimeDays)} — annoncé à
                      l&apos;acheteur
                    </p>
                  )}

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {sale.order?.shippingAddress || "Adresse non renseignée"}
                    </span>
                  </div>

                  {sale.trackingNumber && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      {sale.carrier} · {sale.trackingNumber}
                    </p>
                  )}
                </div>

                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  {sale.fulfillmentStatus === FulfillmentStatus.TO_SHIP && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        applyFulfillment(sale, FulfillmentStatus.PREPARING)
                      }
                    >
                      En préparation
                    </Button>
                  )}
                  {(sale.fulfillmentStatus === FulfillmentStatus.TO_SHIP ||
                    sale.fulfillmentStatus === FulfillmentStatus.PREPARING) && (
                    <Button size="sm" onClick={() => setSaleToShip(sale)}>
                      Marquer expédiée
                    </Button>
                  )}
                  {sale.fulfillmentStatus === FulfillmentStatus.SHIPPED && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        applyFulfillment(sale, FulfillmentStatus.DELIVERED)
                      }
                    >
                      Marquer livrée
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Page précédente"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Page suivante"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ShipSaleDialog
        sale={saleToShip}
        onClose={() => setSaleToShip(null)}
        onConfirm={async (carrier, trackingNumber) => {
          if (!saleToShip) return;
          await applyFulfillment(saleToShip, FulfillmentStatus.SHIPPED, {
            carrier,
            trackingNumber,
          });
          setSaleToShip(null);
        }}
      />
    </div>
  );
}
