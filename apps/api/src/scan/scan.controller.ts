import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { ScanRecognizeDto } from "./dto/scan-recognize.dto";
import { isSupportedImage } from "./image-validation";
import { ScanService } from "./scan.service";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_FRAMES = 8; // Maximum frames per burst scan
const MAX_TOTAL_UPLOAD_SIZE = 24 * 1024 * 1024; // Cumulative burst payload size budget

/**
 * Controller handling real-time camera burst card scanning and OCR recognition.
 */
@ApiTags("scan")
@ApiBearerAuth("bearerAuth")
@Controller("scan")
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * Recognizes a trading card from a multi-frame camera burst using OCR and CLIP visual similarity.
   *
   * @param files - Multipart files object containing uploaded frame buffers.
   * @param dto - Card scan query options (game ecosystem).
   * @returns Recognition result including identified card, candidates, and confidence score.
   * @throws BadRequestException If no images are supplied, upload budget is exceeded, or file format is unsupported.
   */
  @Post("recognize")
  // OCR + vision matching are CPU-bound: cap each caller well below the
  // global quota so a single account cannot saturate the workers.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Recognize trading card from multi-frame camera burst",
  })
  @ApiResponse({
    status: 200,
    description: "Card recognition candidates and confidence score",
  })
  @ApiResponse({
    status: 400,
    description:
      "Invalid upload payload, size exceeded, or unsupported image format",
  })
  // `images` = multi-frame burst; `image` kept for single-frame backwards compatibility
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "images", maxCount: MAX_FRAMES },
        { name: "image", maxCount: 1 },
      ],
      { limits: { fileSize: MAX_IMAGE_SIZE } },
    ),
  )
  async recognize(
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Body() dto: ScanRecognizeDto,
  ): Promise<ScanRecognizeResponse> {
    const buffers = [...(files?.images ?? []), ...(files?.image ?? [])]
      .map((f) => f.buffer)
      .filter((b) => b?.length);

    if (buffers.length === 0) {
      throw new BadRequestException(
        "Aucune image reçue. Envoie les frames dans le champ multipart `images` (ou `image`).",
      );
    }

    // Per-file limits alone still allow ~72 Mo of buffers per request before
    // Base64 encoding and OCR: cap the burst as a whole.
    const totalSize = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
      throw new BadRequestException(
        "Rafale trop volumineuse. Réduis le nombre ou la taille des images.",
      );
    }

    // The declared MIME type is client-controlled: sniff the real bytes.
    if (!buffers.every(isSupportedImage)) {
      throw new BadRequestException(
        "Format d'image non supporté. Utilise JPEG, PNG, WebP ou HEIC.",
      );
    }

    return this.scanService.recognize(buffers, dto.game);
  }
}
