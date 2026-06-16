import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { ScanRecognizeDto } from "./dto/scan-recognize.dto";
import { ScanService } from "./scan.service";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 Mo
const MAX_FRAMES = 8; // rafale best-of-N

@ApiTags("scan")
@ApiBearerAuth("bearerAuth")
@Controller("scan")
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post("recognize")
  @ApiConsumes("multipart/form-data")
  // `images` = rafale (best-of-N) ; `image` conservé pour la compat mono-frame.
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

    return this.scanService.recognize(buffers, dto.game);
  }
}
