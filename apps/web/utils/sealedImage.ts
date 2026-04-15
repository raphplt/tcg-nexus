import { SealedProduct } from "@/types/sealed-product";
import { NEXT_PUBLIC_SEALED_CDN_URL } from "./variables";

/**
 * Retourne l'URL de l'image d'un produit scellé.
 * - Si `image` est déjà une URL absolue (https://...) → la retourner telle quelle.
 * - Si c'est un chemin relatif → concaténer avec le CDN R2.
 * - Sinon → null.
 */
export function getSealedImageUrl(
  product: Pick<SealedProduct, "image"> | null | undefined,
): string | null {
  if (!product?.image) return null;
  if (product.image.startsWith("http")) return product.image;
  const trimmed = product.image.replace(/^\/+/, "");
  return `${NEXT_PUBLIC_SEALED_CDN_URL}/${trimmed}`;
}
