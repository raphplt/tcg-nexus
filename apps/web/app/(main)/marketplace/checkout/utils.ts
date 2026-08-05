const CHECKOUT_SHIPPING_KEY = "tcg_nexus_checkout_shipping";

export function saveCheckoutShippingAddress(address: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_SHIPPING_KEY, address);
}

export function loadCheckoutShippingAddress(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
}

export function clearCheckoutShippingAddress(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_SHIPPING_KEY);
}
