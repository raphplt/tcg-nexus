import { ProductKind } from "src/common/enums/product-kind";

export const SHIPPING_POLICY = {
  handlingTimeDays: 3,
  rates: {
    [ProductKind.CARD]: { cost: 3.5, label: "Lettre suivie" },
    [ProductKind.SEALED]: { cost: 6.9, label: "Colis suivi" },
  },
} as const;

export function getShippingCost(productKind: ProductKind): number {
  return SHIPPING_POLICY.rates[productKind].cost;
}

export function getShippingPolicy() {
  return {
    handlingTimeDays: SHIPPING_POLICY.handlingTimeDays,
    rates: Object.entries(SHIPPING_POLICY.rates).map(([productKind, rate]) => ({
      productKind: productKind as ProductKind,
      ...rate,
    })),
  };
}
