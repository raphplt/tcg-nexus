import { Injectable, Logger } from "@nestjs/common";
import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string = "";
  private publicUrl: string = "";

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || "";
    this.publicUrl = process.env.R2_PUBLIC_URL || "";

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log("R2 S3Client initialized successfully.");
    } else {
      this.logger.warn(
        "R2 environment variables are missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY). Uploads will fail.",
      );
    }
  }

  /**
   * Uploads a file buffer to Cloudflare R2
   * @param buffer File buffer to upload
   * @param key Destination path in R2 bucket
   * @param contentType Content type of the file (e.g. image/webp)
   * @returns Public URL of the uploaded asset, or null if R2 is not configured
   */
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string | null> {
    if (!this.s3Client) {
      this.logger.error("Cannot upload: R2 S3Client is not initialized.");
      return null;
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      const url = `${this.publicUrl}/${key}`;
      this.logger.log(`Successfully uploaded asset to R2: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload file to R2 under key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a file from Cloudflare R2 if it belongs to our public CDN url
   * @param fileUrl The full public URL or key of the file
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.s3Client) {
      this.logger.error("Cannot delete: R2 S3Client is not initialized.");
      return;
    }

    try {
      let key = fileUrl;
      // If it is a full URL, strip the public URL base to extract the key
      if (fileUrl.startsWith(this.publicUrl)) {
        key = fileUrl.replace(`${this.publicUrl}/`, "");
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Successfully deleted asset from R2: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from R2 for url/key ${fileUrl}:`, error);
    }
  }
}
