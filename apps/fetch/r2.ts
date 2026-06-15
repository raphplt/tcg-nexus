/**
 * Utilitaires Cloudflare R2 partagés par les scripts de fetch.
 *
 * Le bucket R2 est exposé publiquement via le domaine custom
 * `R2_PUBLIC_URL` (= https://cdn.tcg-nexus.org en prod). On y héberge :
 *  - les logos/symboles de sets      -> clés `sets/<slug>/...`
 *  - les produits scellés            -> clés gérées ailleurs
 *  - les images de cartes            -> clés `cards/<locale>/<serie>/<set>/<localId>/<quality>.png`
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export function assertR2Config(): void {
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_PUBLIC_URL
  ) {
    throw new Error(
      "Configuration R2 incomplète. Variables requises : R2_ACCOUNT_ID, " +
        "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.",
    );
  }
}

export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Télécharge une ressource distante et l'upload sur R2 sous la clé donnée.
 * Retourne l'URL publique finale, ou null en cas d'échec.
 */
export async function uploadToR2(
  sourceUrl: string,
  key: string,
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} sur ${sourceUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get("content-type") || "image/png",
        // Cache long : ces assets sont immuables une fois publiés.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error(`Échec upload ${sourceUrl} -> ${key}:`, error);
    return null;
  }
}

const TCGDEX_HOST = "assets.tcgdex.net";
const CARDS_PREFIX = "cards";

/**
 * À partir d'une URL d'image TCGdex "de base" (sans extension), ex.
 * `https://assets.tcgdex.net/fr/sv/sv08.5/109`, calcule le préfixe de clé R2
 * correspondant : `cards/fr/sv/sv08.5/109`.
 *
 * Retourne null si l'URL n'est pas une image TCGdex (déjà migrée, etc.).
 */
export function cardKeyPrefixFromTcgdex(imageBase: string): string | null {
  if (!imageBase || !imageBase.includes(TCGDEX_HOST)) return null;
  try {
    const u = new URL(imageBase);
    const path = u.pathname.replace(/^\/+/, ""); // ex: "fr/sv/sv08.5/109"
    if (!path) return null;
    return `${CARDS_PREFIX}/${path}`;
  } catch {
    return null;
  }
}

export interface CardImageMigrationResult {
  /** Nouvelle URL "de base" sur le CDN (sans extension), à stocker en `image`. */
  newBase: string;
  /** true si au moins une qualité a été (ré)uploadée. */
  uploaded: boolean;
}

/**
 * Migre les images d'une carte vers R2 : télécharge `<base>/high.png` et
 * `<base>/low.png` depuis TCGdex et les ré-héberge sous
 * `cards/<locale>/<serie>/<set>/<localId>/<quality>.png`.
 *
 * @param imageBase URL TCGdex de base (champ `image` de la carte)
 * @param qualities qualités à migrer (par défaut high + low)
 * @returns la nouvelle URL de base à stocker, ou null si non applicable
 */
export async function migrateCardImageToR2(
  imageBase: string,
  qualities: Array<"high" | "low"> = ["high", "low"],
): Promise<CardImageMigrationResult | null> {
  const keyPrefix = cardKeyPrefixFromTcgdex(imageBase);
  if (!keyPrefix) return null;

  let uploaded = false;
  for (const quality of qualities) {
    const sourceUrl = `${imageBase}/${quality}.png`;
    const key = `${keyPrefix}/${quality}.png`;
    const result = await uploadToR2(sourceUrl, key);
    if (result) uploaded = true;
  }

  return {
    newBase: `${R2_PUBLIC_URL}/${keyPrefix}`,
    uploaded,
  };
}
