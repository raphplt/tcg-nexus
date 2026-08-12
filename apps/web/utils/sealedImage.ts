import { SealedProduct } from "@/types/sealed-product";
import { NEXT_PUBLIC_SEALED_CDN_URL } from "./variables";

export const SEALED_PLACEHOLDER = "/images/carte-pokemon-dos.jpg";

/**
 * Returns the image URL for a sealed product. Absolute URLs are returned
 * unchanged; relative paths are prefixed with the R2 CDN URL.
 *
 * @param product Sealed product bearing an image path.
 * @returns Absolute image URL, or null when the product has no image.
 */
export function getSealedImageUrl(
  product: Pick<SealedProduct, "image"> | null | undefined,
): string | null {
  if (!product?.image) return null;
  if (product.image.startsWith("http")) return product.image;
  const trimmed = product.image.replace(/^\/+/, "");
  return `${NEXT_PUBLIC_SEALED_CDN_URL}/${trimmed}`;
}
