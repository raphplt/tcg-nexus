import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { ScanRecognizeDto } from "./dto/scan-recognize.dto";
import { ScanService } from "./scan.service";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 Mo

@ApiTags("scan")
@ApiBearerAuth("bearerAuth")
@Controller("scan")
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post("recognize")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("image", { limits: { fileSize: MAX_IMAGE_SIZE } }),
  )
  async recognize(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ScanRecognizeDto,
  ): Promise<ScanRecognizeResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        "Aucune image reçue. Envoie l'image dans le champ multipart `image`.",
      );
    }

    return this.scanService.recognize(file.buffer, dto.game);
  }
}
