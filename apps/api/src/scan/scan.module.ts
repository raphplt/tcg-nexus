import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CardModule } from "../card/card.module";
import { ScanLogger } from "./logging/scan-logger";
import { OcrService } from "./ocr/ocr.service";
import { ScanController } from "./scan.controller";
import { ScanService } from "./scan.service";
import { VisionService } from "./vision/vision.service";

@Module({
  imports: [ConfigModule, CardModule],
  controllers: [ScanController],
  providers: [ScanService, OcrService, VisionService, ScanLogger],
})
export class ScanModule {}
