import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { hashIpAddress } from "src/common/utils";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { Repository } from "typeorm";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEvent } from "./entities/sealed-event.entity";

@Injectable()
export class SealedEventService {
  private readonly logger = new Logger(SealedEventService.name);

  constructor(
    @InjectRepository(SealedEvent)
    private readonly sealedEventRepository: Repository<SealedEvent>,
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
  ) {}

  async recordEvent(
    dto: CreateSealedEventDto,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ): Promise<void> {
    const product = await this.sealedProductRepository.findOne({
      where: { id: dto.sealedProductId },
      select: ["id"],
    });
    if (!product) {
      throw new BadRequestException("Sealed product not found");
    }

    const hashedIp = hashIpAddress(ipAddress);

    const event = this.sealedEventRepository.create({
      sealedProduct: { id: dto.sealedProductId } as SealedProduct,
      eventType: dto.eventType,
      user: userId ? { id: userId } : undefined,
      sessionId: sessionId || dto.sessionId,
      ipAddress: hashedIp,
      userAgent,
      context: dto.context,
    });

    await this.sealedEventRepository.save(event);
  }
}
