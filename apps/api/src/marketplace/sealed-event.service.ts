import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { Repository } from "typeorm";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEvent } from "./entities/sealed-event.entity";

@Injectable()
export class SealedEventService {
  constructor(
    @InjectRepository(SealedEvent)
    private readonly sealedEventRepository: Repository<SealedEvent>,
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
  ) {}

  /**
   * Records a user interaction event for a sealed product.
   *
   * @param dto Sealed product event DTO.
   * @param userId Optional user ID.
   * @param ipAddress Client IP address.
   * @param userAgent User agent header string.
   * @param sessionId Session identifier.
   */
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
      throw new NotFoundException({
        code: "SEALED_PRODUCT_NOT_FOUND",
        message: "Produit scellé introuvable",
      });
    }

    // Hash IP address for GDPR compliance
    const hashedIp = ipAddress
      ? createHash("sha256").update(ipAddress).digest("hex").substring(0, 16)
      : undefined;

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
