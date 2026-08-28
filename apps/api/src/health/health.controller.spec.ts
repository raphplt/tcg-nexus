import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  let mockHealthService: {
    getLiveness: jest.Mock;
    getReadiness: jest.Mock;
    getDetails: jest.Mock;
  };

  beforeEach(() => {
    mockHealthService = {
      getLiveness: jest.fn(),
      getReadiness: jest.fn(),
      getDetails: jest.fn(),
    };
    controller = new HealthController(
      mockHealthService as unknown as HealthService,
    );
  });

  describe("getLiveness", () => {
    it("returns liveness report", () => {
      mockHealthService.getLiveness.mockReturnValue({
        status: "ok",
        timestamp: "2026-08-28T00:00:00.000Z",
        uptime: 100,
      });

      const res = controller.getLiveness();
      expect(res.status).toBe("ok");
      expect(mockHealthService.getLiveness).toHaveBeenCalled();
    });
  });

  describe("getReadiness", () => {
    it("returns readiness report when status is ok", async () => {
      mockHealthService.getReadiness.mockResolvedValue({
        status: "ok",
        timestamp: "2026-08-28T00:00:00.000Z",
        uptime: 100,
        checks: {
          database: { status: "up" },
          pgvector: { status: "up" },
          migrations: { status: "up" },
          vision: { status: "up" },
        },
      });

      const res = await controller.getReadiness();
      expect(res.status).toBe("ok");
    });

    it("throws ServiceUnavailableException when status is down", async () => {
      mockHealthService.getReadiness.mockResolvedValue({
        status: "down",
        timestamp: "2026-08-28T00:00:00.000Z",
        uptime: 100,
        checks: {
          database: { status: "down" },
          pgvector: { status: "down" },
          migrations: { status: "down" },
          vision: { status: "degraded" },
        },
      });

      await expect(controller.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("getDetails", () => {
    it("returns detailed report", async () => {
      mockHealthService.getDetails.mockResolvedValue({
        status: "ok",
        environment: "production",
      });

      const res = await controller.getDetails();
      expect(res.environment).toBe("production");
    });
  });
});
