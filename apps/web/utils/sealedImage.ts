import { SealedProduct } from "@/types/sealed-product";
import { NEXT_PUBLIC_SEALED_CDN_URL } from "./variables";

/**
 * Construit l'URL absolue de l'image d'un produit scellé en concaténant
 * le base URL du CDN R2 avec le chemin relatif stocké en base.
 *
 * @returns L'URL absolue ou `null` si le produit n'a pas d'image.
 */
export function getSealedImageUrl(
  product: Pick<SealedProduct, "image"> | null | undefined,
): string | null {
  if (!product?.image) return null;
  const trimmed = product.image.replace(/^\/+/, "");
  return `${NEXT_PUBLIC_SEALED_CDN_URL}/${trimmed}`;
}
