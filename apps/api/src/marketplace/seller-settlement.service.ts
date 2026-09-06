import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { Currency } from "../common/enums/currency";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import {
  PayoutMethod,
  PayoutStatus,
  SellerAccountStatus,
  SellerAllocationStatus,
} from "../common/enums/seller-settlement";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import {
  AdminProcessPayoutDto,
  RequestPayoutDto,
  SellerSettlementSummaryDto,
  UpdatePayoutSettingsDto,
} from "./dto/seller-settlement.dto";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerAllocation } from "./entities/seller-allocation.entity";
import { SellerPayout } from "./entities/seller-payout.entity";
import { SellerSettlementAccount } from "./entities/seller-settlement-account.entity";

/**
 * Service managing seller escrow, order allocations, commissions, and payout ledger (MKT-06).
 */
@Injectable()
export class SellerSettlementService {
  constructor(
    @InjectRepository(SellerSettlementAccount)
    private readonly accountRepository: Repository<SellerSettlementAccount>,
    @InjectRepository(SellerAllocation)
    private readonly allocationRepository: Repository<SellerAllocation>,
    @InjectRepository(SellerPayout)
    private readonly payoutRepository: Repository<SellerPayout>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves or initializes a settlement account for a seller.
   */
  async getOrCreateAccount(
    sellerId: number,
    currency: Currency = Currency.EUR,
    manager?: EntityManager,
  ): Promise<SellerSettlementAccount> {
    const repo = manager
      ? manager.getRepository(SellerSettlementAccount)
      : this.accountRepository;

    let account = await repo.findOne({
      where: { seller: { id: sellerId }, currency },
      relations: ["seller"],
    });

    if (!account) {
      account = repo.create({
        seller: { id: sellerId } as User,
        currency,
        status: SellerAccountStatus.PENDING_ONBOARDING,
        payoutMethod: PayoutMethod.BANK_TRANSFER,
        balancePending: 0,
        balanceAvailable: 0,
        balancePaidOut: 0,
        balanceOnHold: 0,
        minimumPayoutAmount: 10.0,
      });
      await repo.save(account);
    }

    return account;
  }

  /**
   * Updates payout preferences and bank details for a seller.
   */
  async updatePayoutSettings(
    sellerId: number,
    dto: UpdatePayoutSettingsDto,
  ): Promise<SellerSettlementAccount> {
    const account = await this.getOrCreateAccount(sellerId);

    if (dto.payoutMethod) {
      account.payoutMethod = dto.payoutMethod;
    }

    const currentDetails = account.payoutDetails || {};
    const updatedDetails = {
      ...currentDetails,
      accountHolderName: dto.accountHolderName ?? currentDetails.accountHolderName,
      bic: dto.bic ?? currentDetails.bic,
      bankName: dto.bankName ?? currentDetails.bankName,
      ibanMasked: dto.iban
        ? `${dto.iban.substring(0, 4)} **** **** ${dto.iban.slice(-4)}`
        : currentDetails.ibanMasked,
    };

    account.payoutDetails = updatedDetails;

    // Automatically transition to ACTIVE once basic bank details are supplied
    if (
      account.status === SellerAccountStatus.PENDING_ONBOARDING &&
      updatedDetails.accountHolderName &&
      (updatedDetails.ibanMasked || updatedDetails.providerAccountId)
    ) {
      account.status = SellerAccountStatus.ACTIVE;
    }

    return this.accountRepository.save(account);
  }

  /**
   * Creates immutable order allocations for each seller upon payment confirmation.
   */
  async createAllocationsForOrder(
    order: Order,
    manager?: EntityManager,
  ): Promise<SellerAllocation[]> {
    const allocRepo = manager
      ? manager.getRepository(SellerAllocation)
      : this.allocationRepository;
    const itemRepo = manager
      ? manager.getRepository(OrderItem)
      : this.orderItemRepository;

    const items = await itemRepo.find({
      where: { order: { id: order.id } },
      relations: ["seller", "order"],
    });

    // Group items by seller
    const sellerItemsMap = new Map<number, OrderItem[]>();
    for (const item of items) {
      if (!item.seller?.id) continue;
      const list = sellerItemsMap.get(item.seller.id) || [];
      list.push(item);
      sellerItemsMap.set(item.seller.id, list);
    }

    const createdAllocations: SellerAllocation[] = [];
    const commissionRate = 0.05; // 5% marketplace commission

    for (const [sellerId, sellerItems] of sellerItemsMap.entries()) {
      const grossAmount = sellerItems.reduce(
        (sum, it) => sum + Number(it.unitPrice) * it.quantity,
        0,
      );
      const shippingAmount = sellerItems.reduce(
        (sum, it) => sum + Number(it.shippingCost || 0),
        0,
      );
      const commissionAmount =
        Math.round(grossAmount * commissionRate * 100) / 100;
      const netAmount =
        Math.round((grossAmount + shippingAmount - commissionAmount) * 100) /
        100;

      const allocation = allocRepo.create({
        order,
        seller: { id: sellerId } as User,
        currency: order.currency,
        grossAmount,
        shippingAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        refundedAmount: 0,
        status: SellerAllocationStatus.PENDING_DELIVERY,
      });

      const savedAlloc = await allocRepo.save(allocation);
      createdAllocations.push(savedAlloc);

      // Increment seller pending balance
      const account = await this.getOrCreateAccount(
        sellerId,
        order.currency,
        manager,
      );
      account.balancePending =
        Math.round((Number(account.balancePending) + netAmount) * 100) / 100;
      const accRepo = manager
        ? manager.getRepository(SellerSettlementAccount)
        : this.accountRepository;
      await accRepo.save(account);
    }

    return createdAllocations;
  }

  /**
   * Releases pending allocation to available balance when all items of a seller in an order are delivered.
   */
  async onItemDelivered(
    orderItem: OrderItem,
    manager?: EntityManager,
  ): Promise<void> {
    if (!orderItem.seller?.id || !orderItem.order?.id) return;

    const allocRepo = manager
      ? manager.getRepository(SellerAllocation)
      : this.allocationRepository;
    const itemRepo = manager
      ? manager.getRepository(OrderItem)
      : this.orderItemRepository;
    const accRepo = manager
      ? manager.getRepository(SellerSettlementAccount)
      : this.accountRepository;

    const allocation = await allocRepo.findOne({
      where: {
        order: { id: orderItem.order.id },
        seller: { id: orderItem.seller.id },
      },
    });

    if (
      !allocation ||
      allocation.status !== SellerAllocationStatus.PENDING_DELIVERY
    ) {
      return;
    }

    // Verify all items from this seller in the order are DELIVERED
    const sellerItems = await itemRepo.find({
      where: {
        order: { id: orderItem.order.id },
        seller: { id: orderItem.seller.id },
      },
    });

    const allDelivered = sellerItems.every(
      (it) => it.fulfillmentStatus === FulfillmentStatus.DELIVERED,
    );

    if (allDelivered) {
      allocation.status = SellerAllocationStatus.AVAILABLE;
      allocation.eligibleAt = new Date();
      await allocRepo.save(allocation);

      const account = await this.getOrCreateAccount(
        orderItem.seller.id,
        allocation.currency,
        manager,
      );

      const netAmount = Number(allocation.netAmount);
      account.balancePending = Math.max(
        0,
        Math.round((Number(account.balancePending) - netAmount) * 100) / 100,
      );
      account.balanceAvailable =
        Math.round((Number(account.balanceAvailable) + netAmount) * 100) / 100;

      await accRepo.save(account);
    }
  }

  /**
   * Puts allocation on dispute hold if a claim is opened against an order item.
   */
  async onClaimOpened(
    orderId: number,
    sellerId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const allocRepo = manager
      ? manager.getRepository(SellerAllocation)
      : this.allocationRepository;
    const accRepo = manager
      ? manager.getRepository(SellerSettlementAccount)
      : this.accountRepository;

    const allocation = await allocRepo.findOne({
      where: {
        order: { id: orderId },
        seller: { id: sellerId },
      },
    });

    if (!allocation || allocation.status === SellerAllocationStatus.DISPUTED_HOLD) {
      return;
    }

    const previousStatus = allocation.status;
    allocation.status = SellerAllocationStatus.DISPUTED_HOLD;
    await allocRepo.save(allocation);

    const account = await this.getOrCreateAccount(
      sellerId,
      allocation.currency,
      manager,
    );

    const netAmount = Number(allocation.netAmount);

    if (previousStatus === SellerAllocationStatus.AVAILABLE) {
      account.balanceAvailable = Math.max(
        0,
        Math.round((Number(account.balanceAvailable) - netAmount) * 100) / 100,
      );
    } else if (previousStatus === SellerAllocationStatus.PENDING_DELIVERY) {
      account.balancePending = Math.max(
        0,
        Math.round((Number(account.balancePending) - netAmount) * 100) / 100,
      );
    }

    account.balanceOnHold =
      Math.round((Number(account.balanceOnHold) + netAmount) * 100) / 100;

    await accRepo.save(account);
  }

  /**
   * Adjusts seller allocation and balances following an approved refund.
   */
  async onRefundApplied(
    orderId: number,
    sellerId: number,
    refundAmount: number,
    manager?: EntityManager,
  ): Promise<void> {
    const allocRepo = manager
      ? manager.getRepository(SellerAllocation)
      : this.allocationRepository;
    const accRepo = manager
      ? manager.getRepository(SellerSettlementAccount)
      : this.accountRepository;

    const allocation = await allocRepo.findOne({
      where: {
        order: { id: orderId },
        seller: { id: sellerId },
      },
    });

    if (!allocation) return;

    allocation.refundedAmount =
      Math.round((Number(allocation.refundedAmount) + refundAmount) * 100) /
      100;
    allocation.netAmount = Math.max(
      0,
      Math.round((Number(allocation.netAmount) - refundAmount) * 100) / 100,
    );

    if (allocation.netAmount === 0) {
      allocation.status = SellerAllocationStatus.CANCELLED;
    }

    await allocRepo.save(allocation);

    const account = await this.getOrCreateAccount(
      sellerId,
      allocation.currency,
      manager,
    );

    if (allocation.status === SellerAllocationStatus.AVAILABLE) {
      account.balanceAvailable = Math.max(
        0,
        Math.round((Number(account.balanceAvailable) - refundAmount) * 100) / 100,
      );
    } else {
      account.balancePending = Math.max(
        0,
        Math.round((Number(account.balancePending) - refundAmount) * 100) / 100,
      );
    }

    await accRepo.save(account);
  }

  /**
   * Allows an eligible seller to request payout of their available balance.
   */
  async requestPayout(
    seller: User,
    dto: RequestPayoutDto,
  ): Promise<SellerPayout> {
    const currency = dto.currency || Currency.EUR;
    const account = await this.getOrCreateAccount(seller.id, currency);

    if (account.status === SellerAccountStatus.SUSPENDED) {
      throw new ForbiddenException(
        "Votre compte vendeur est suspendu. Impossible de demander un virement.",
      );
    }

    const available = Number(account.balanceAvailable);
    if (available < dto.amount) {
      throw new BadRequestException(
        `Solde disponible insuffisant (${available.toFixed(2)} ${currency}). Montant demandé : ${dto.amount.toFixed(2)} ${currency}`,
      );
    }

    if (dto.amount < Number(account.minimumPayoutAmount)) {
      throw new BadRequestException(
        `Le montant minimum de retrait est de ${account.minimumPayoutAmount} ${currency}`,
      );
    }

    // Deduct from available balance
    account.balanceAvailable =
      Math.round((available - dto.amount) * 100) / 100;
    await this.accountRepository.save(account);

    const reference = `PAYOUT-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const payout = this.payoutRepository.create({
      seller,
      account,
      currency,
      amount: dto.amount,
      status: PayoutStatus.REQUESTED,
      reference,
      payoutMethod: account.payoutMethod,
      payoutDestinationSnapshot: account.payoutDetails || null,
    });

    const savedPayout = await this.payoutRepository.save(payout);

    await this.auditService.record({
      actorId: seller.id,
      actorRole: seller.role,
      targetType: "SELLER_PAYOUT",
      targetId: String(savedPayout.id),
      action: "REQUEST_PAYOUT",
      reason: `Seller requested payout of ${dto.amount} ${currency}`,
      afterState: {
        payoutId: savedPayout.id,
        reference,
        amount: dto.amount,
        remainingAvailable: account.balanceAvailable,
      },
    });

    return savedPayout;
  }

  /**
   * Processes or completes/fails a payout as an administrator.
   */
  async adminProcessPayout(
    payoutId: number,
    admin: User,
    dto: AdminProcessPayoutDto,
  ): Promise<SellerPayout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
      relations: ["seller", "account"],
    });

    if (!payout) {
      throw new NotFoundException("Demande de virement introuvable.");
    }

    const account =
      payout.account ||
      (await this.getOrCreateAccount(payout.seller.id, payout.currency));

    switch (dto.action) {
      case "PROCESS":
        payout.status = PayoutStatus.PROCESSING;
        payout.processedAt = new Date();
        break;

      case "COMPLETE":
        payout.status = PayoutStatus.COMPLETED;
        payout.completedAt = new Date();
        account.balancePaidOut =
          Math.round((Number(account.balancePaidOut) + Number(payout.amount)) * 100) /
          100;
        await this.accountRepository.save(account);
        break;

      case "FAIL":
        payout.status = PayoutStatus.FAILED;
        payout.failureReason = dto.failureReason || "Rejet bancaire / motif administratif";
        // Restore amount back to available balance
        account.balanceAvailable =
          Math.round((Number(account.balanceAvailable) + Number(payout.amount)) * 100) /
          100;
        await this.accountRepository.save(account);
        break;
    }

    const savedPayout = await this.payoutRepository.save(payout);

    await this.auditService.record({
      actorId: admin.id,
      actorRole: admin.role,
      targetType: "SELLER_PAYOUT",
      targetId: String(payout.id),
      action: `ADMIN_PAYOUT_${dto.action}`,
      reason: dto.failureReason,
      afterState: {
        status: payout.status,
        action: dto.action,
        transactionReference: dto.transactionReference,
      },
    });

    return savedPayout;
  }

  /**
   * Returns financial overview and ledger state for a seller.
   */
  async getSellerSummary(
    sellerId: number,
    currency: Currency = Currency.EUR,
  ): Promise<SellerSettlementSummaryDto> {
    const account = await this.getOrCreateAccount(sellerId, currency);

    return {
      sellerId,
      currency: account.currency,
      status: account.status,
      payoutMethod: account.payoutMethod,
      balancePending: Number(account.balancePending),
      balanceAvailable: Number(account.balanceAvailable),
      balancePaidOut: Number(account.balancePaidOut),
      balanceOnHold: Number(account.balanceOnHold),
      minimumPayoutAmount: Number(account.minimumPayoutAmount),
      payoutDetails: account.payoutDetails,
    };
  }

  /**
   * Lists order allocations for a seller with order context.
   */
  async getSellerAllocations(sellerId: number): Promise<SellerAllocation[]> {
    return this.allocationRepository.find({
      where: { seller: { id: sellerId } },
      relations: ["order"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Lists payout history for a seller.
   */
  async getSellerPayouts(sellerId: number): Promise<SellerPayout[]> {
    return this.payoutRepository.find({
      where: { seller: { id: sellerId } },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Global settlement overview across all sellers for administrative monitoring.
   */
  async getAdminSettlementOverview(): Promise<{
    totalPending: number;
    totalAvailable: number;
    totalPaidOut: number;
    totalOnHold: number;
    pendingPayoutsCount: number;
  }> {
    const accounts = await this.accountRepository.find();
    const pendingPayoutsCount = await this.payoutRepository.count({
      where: { status: PayoutStatus.REQUESTED },
    });

    return {
      totalPending: accounts.reduce((s, a) => s + Number(a.balancePending), 0),
      totalAvailable: accounts.reduce((s, a) => s + Number(a.balanceAvailable), 0),
      totalPaidOut: accounts.reduce((s, a) => s + Number(a.balancePaidOut), 0),
      totalOnHold: accounts.reduce((s, a) => s + Number(a.balanceOnHold), 0),
      pendingPayoutsCount,
    };
  }
}
