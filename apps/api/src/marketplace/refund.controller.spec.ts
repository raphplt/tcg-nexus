import { Test, TestingModule } from "@nestjs/testing";
import { User } from "src/user/entities/user.entity";
import { InventoryDisposition } from "src/common/enums/inventory-disposition";
import { RefundController } from "./refund.controller";
import { RefundService } from "./refund.service";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateDispositionDto } from "./dto/update-disposition.dto";

describe("RefundController", () => {
  let controller: RefundController;
  let service: jest.Mocked<RefundService>;

  const mockUser = {
    id: 42,
    email: "user@example.com",
    role: "buyer",
  } as unknown as User;

  const mockRefundService = {
    getAuthorizedRefundBalance: jest.fn(),
    findRefundsByOrder: jest.fn(),
    createRefund: jest.fn(),
    findReturnsByOrder: jest.fn(),
    createReturnRequest: jest.fn(),
    setReturnDisposition: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundController],
      providers: [
        {
          provide: RefundService,
          useValue: mockRefundService,
        },
      ],
    }).compile();

    controller = module.get<RefundController>(RefundController);
    service = module.get(RefundService);
  });

  describe("getRemainingRefundable", () => {
    it("should calculate remaining refundable balance", async () => {
      const balance = { remainingAmount: 50.0, currency: "EUR" };
      mockRefundService.getAuthorizedRefundBalance.mockResolvedValue(
        balance as any,
      );

      const result = await controller.getRemainingRefundable(10, mockUser);

      expect(service.getAuthorizedRefundBalance).toHaveBeenCalledWith(
        10,
        mockUser,
      );
      expect(result).toBe(balance);
    });
  });

  describe("getOrderRefunds", () => {
    it("should list all refund operations for an order", async () => {
      const refunds = [{ id: "ref-1", amount: 25.0 }];
      mockRefundService.findRefundsByOrder.mockResolvedValue(refunds as any);

      const result = await controller.getOrderRefunds(10, mockUser);

      expect(service.findRefundsByOrder).toHaveBeenCalledWith(10, mockUser);
      expect(result).toBe(refunds);
    });
  });

  describe("createRefund", () => {
    it("should create a refund on an order", async () => {
      const dto: CreateRefundDto = {
        amount: 30.0,
        reason: "Item arrived damaged",
      };
      const createdRefund = { id: "ref-2", amount: 30.0 };
      mockRefundService.createRefund.mockResolvedValue(createdRefund as any);

      const result = await controller.createRefund(10, dto, mockUser);

      expect(service.createRefund).toHaveBeenCalledWith(10, dto, mockUser);
      expect(result).toBe(createdRefund);
    });
  });

  describe("getOrderReturns", () => {
    it("should list physical return requests for an order", async () => {
      const returns = [{ id: "ret-1", reason: "Damaged card" }];
      mockRefundService.findReturnsByOrder.mockResolvedValue(returns as any);

      const result = await controller.getOrderReturns(10, mockUser);

      expect(service.findReturnsByOrder).toHaveBeenCalledWith(10, mockUser);
      expect(result).toBe(returns);
    });
  });

  describe("createReturnRequest", () => {
    it("should submit a return request on an order item", async () => {
      const dto: CreateReturnDto = {
        quantity: 1,
        reason: "Corner of card bent",
      };
      const returnRequest = { id: "ret-2", status: "PENDING" };
      mockRefundService.createReturnRequest.mockResolvedValue(
        returnRequest as any,
      );

      const result = await controller.createReturnRequest(101, dto, mockUser);

      expect(service.createReturnRequest).toHaveBeenCalledWith(
        101,
        dto,
        mockUser,
      );
      expect(result).toBe(returnRequest);
    });
  });

  describe("setDisposition", () => {
    it("should set inspected inventory disposition for returned goods", async () => {
      const dto: UpdateDispositionDto = {
        disposition: InventoryDisposition.RESTOCK,
        notes: "Item in original mint condition",
      };
      const updated = {
        id: "ret-1",
        disposition: InventoryDisposition.RESTOCK,
      };
      mockRefundService.setReturnDisposition.mockResolvedValue(updated as any);

      const result = await controller.setDisposition("ret-1", dto, mockUser);

      expect(service.setReturnDisposition).toHaveBeenCalledWith(
        "ret-1",
        dto,
        mockUser,
      );
      expect(result).toBe(updated);
    });
  });
});
