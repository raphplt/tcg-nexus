/**
 * Shared Cloudflare R2 utilities for fetch scripts. The public bucket hosts set assets, sealed products, and card images.
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

/** Long-lived cache policy for immutable published assets. */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * Uploads a buffer to R2 under the supplied key.
 *
 * @returns Public URL, or null when the upload fails.
 */
export async function uploadBufferToR2(
  body: Buffer,
  key: string,
  options: { contentType?: string; cacheControl?: string } = {},
): Promise<string | null> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: options.contentType || "application/octet-stream",
        CacheControl: options.cacheControl || IMMUTABLE_CACHE,
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error(`Échec upload -> ${key}:`, error);
    return null;
  }
}

/**
 * Downloads a remote resource and uploads it to R2 under the supplied key.
 *
 * @returns Public URL, or null when the upload fails.
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
    const buffer = Buffer.from(await response.arrayBuffer());

    return await uploadBufferToR2(buffer, key, {
      contentType: response.headers.get("content-type") || "image/png",
    });
  } catch (error) {
    console.error(`Échec upload ${sourceUrl} -> ${key}:`, error);
    return null;
  }
}

const TCGDEX_HOST = "assets.tcgdex.net";
const CARDS_PREFIX = "cards";

/**
 * Derives an R2 key prefix from an extensionless TCGdex image URL.
 *
 * @returns R2 key prefix, or null when the URL is not a TCGdex image.
 */
export function cardKeyPrefixFromTcgdex(imageBase: string): string | null {
  if (!imageBase || !imageBase.includes(TCGDEX_HOST)) return null;
  try {
    const u = new URL(imageBase);
    const path = u.pathname.replace(/^\/+/, "");
    if (!path) return null;
    return `${CARDS_PREFIX}/${path}`;
  } catch {
    return null;
  }
}

export interface CardImageMigrationResult {
  /** New extensionless CDN base URL to store in `image`. */
  newBase: string;
  /** Whether at least one quality was uploaded. */
  uploaded: boolean;
}

/**
 * Migrates a card image from TCGdex to R2 for the requested qualities.
 *
 * @param imageBase - TCGdex base URL from the card `image` field.
 * @param qualities - Image qualities to migrate.
 * @returns New base URL to store, or null when not applicable.
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
