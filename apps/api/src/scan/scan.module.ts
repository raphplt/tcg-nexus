import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CardModule } from "../card/card.module";
import { OcrService } from "./ocr/ocr.service";
import { ScanController } from "./scan.controller";
import { ScanService } from "./scan.service";

@Module({
  imports: [ConfigModule, CardModule],
  controllers: [ScanController],
  providers: [ScanService, OcrService],
})
export class ScanModule {}
