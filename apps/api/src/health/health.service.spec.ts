import { DataSource } from "typeorm";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;
  let mockDataSource: {
    isInitialized: boolean;
    query: jest.Mock;
    showMigrations: jest.Mock;
  };

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn(),
      showMigrations: jest.fn().mockResolvedValue(false),
    };
    service = new HealthService(mockDataSource as unknown as DataSource);
  });

  describe("getLiveness", () => {
    it("returns an ok liveness status with timestamp and uptime", () => {
      const liveness = service.getLiveness();
      expect(liveness.status).toBe("ok");
      expect(liveness.timestamp).toBeDefined();
      expect(typeof liveness.uptime).toBe("number");
    });
  });

  describe("getReadiness", () => {
    it("returns ok when database, pgvector and migrations succeed", async () => {
      mockDataSource.query.mockImplementation((queryStr: string) => {
        if (queryStr === "SELECT 1")
          return Promise.resolve([{ "?column?": 1 }]);
        if (queryStr.includes("pg_extension"))
          return Promise.resolve([{ "?column?": 1 }]);
        return Promise.resolve([]);
      });

      const report = await service.getReadiness();
      expect(report.checks.database.status).toBe("up");
      expect(report.checks.pgvector.status).toBe("up");
      expect(report.checks.migrations.status).toBe("up");
    });

    it("marks status down when database query throws", async () => {
      mockDataSource.query.mockRejectedValue(new Error("Connection refused"));

      const report = await service.getReadiness();
      expect(report.status).toBe("down");
      expect(report.checks.database.status).toBe("down");
      expect(report.checks.database.error).toBe("Connection refused");
    });

    it("marks status degraded when pgvector is missing", async () => {
      mockDataSource.query.mockImplementation((queryStr: string) => {
        if (queryStr === "SELECT 1")
          return Promise.resolve([{ "?column?": 1 }]);
        if (queryStr.includes("pg_extension")) return Promise.resolve([]);
        return Promise.resolve([]);
      });

      const report = await service.getReadiness();
      expect(report.status).toBe("degraded");
      expect(report.checks.database.status).toBe("up");
      expect(report.checks.pgvector.status).toBe("down");
    });
  });

  describe("getDetails", () => {
    it("includes memory and environment diagnostics", async () => {
      mockDataSource.query.mockResolvedValue([{ "?column?": 1 }]);
      const details = await service.getDetails();
      expect(details.memory).toBeDefined();
      expect(details.memory.heapUsedMb).toBeGreaterThan(0);
      expect(details.environment).toBeDefined();
      expect(details.nodeVersion).toBeDefined();
    });
  });
});
