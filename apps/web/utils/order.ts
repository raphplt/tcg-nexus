import { FulfillmentStatus, OrderItem, OrderStatus } from "@/types/order";
import { getCardImage } from "./images";
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "./sealedImage";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "bg-yellow-500 hover:bg-yellow-600",
  [OrderStatus.PAID]: "bg-green-500 hover:bg-green-600",
  [OrderStatus.SHIPPED]: "bg-blue-500 hover:bg-blue-600",
  [OrderStatus.DELIVERED]: "bg-emerald-600 hover:bg-emerald-700",
  [OrderStatus.CANCELLED]: "bg-red-500 hover:bg-red-600",
  [OrderStatus.REFUNDED]: "bg-gray-500 hover:bg-gray-600",
};

const FULFILLMENT_STYLES: Record<FulfillmentStatus, string> = {
  [FulfillmentStatus.TO_SHIP]: "bg-amber-500 hover:bg-amber-600",
  [FulfillmentStatus.PREPARING]: "bg-blue-500 hover:bg-blue-600",
  [FulfillmentStatus.SHIPPED]: "bg-indigo-500 hover:bg-indigo-600",
  [FulfillmentStatus.DELIVERED]: "bg-emerald-600 hover:bg-emerald-700",
  [FulfillmentStatus.CANCELLED]: "bg-red-500 hover:bg-red-600",
};

export const getOrderStatusColor = (status: OrderStatus): string =>
  ORDER_STATUS_STYLES[status] ?? "bg-gray-500";

export const getOrderStatusKey = (status: OrderStatus): string =>
  `orderStatus.${status}`;

export const getFulfillmentKey = (status: FulfillmentStatus): string =>
  `fulfillment.${status}`;

export const getFulfillmentColor = (status: FulfillmentStatus): string =>
  FULFILLMENT_STYLES[status] ?? "bg-gray-500";

export const getOrderItemImage = (item: OrderItem): string => {
  if (item.productKind === "sealed") {
    return (
      getSealedImageUrl(item.listing?.sealedProduct) ||
      getSealedImageUrl({ image: item.productImage ?? undefined }) ||
      SEALED_PLACEHOLDER
    );
  }

  return item.listing?.pokemonCard
    ? getCardImage(item.listing.pokemonCard)
    : SEALED_PLACEHOLDER;
};

export const getOrderItemUrl = (item: OrderItem): string | null => {
  if (item.productKind === "sealed" && item.listing?.sealedProduct?.id) {
    return `/marketplace/sealed/${item.listing.sealedProduct.id}`;
  }
  if (item.listing?.pokemonCard?.id) {
    return `/marketplace/cards/${item.listing.pokemonCard.id}`;
  }
  return null;
};
