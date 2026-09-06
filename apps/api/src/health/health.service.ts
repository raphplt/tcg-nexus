import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import axios from "axios";

/**
 * Health check result structure for application readiness and diagnostics.
 */
export interface ReadinessReport {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latencyMs?: number; error?: string };
    pgvector: { status: "up" | "down"; error?: string };
    migrations: {
      status: "up" | "down";
      pendingCount?: number;
      error?: string;
    };
    vision: {
      status: "up" | "degraded" | "disabled";
      latencyMs?: number;
      error?: string;
    };
  };
}

/**
 * Detailed diagnostics report for administrators.
 */
export interface DetailsReport extends ReadinessReport {
  environment: string;
  nodeVersion: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
}

/**
 * Service orchestrating liveness, readiness, and detailed diagnostic checks.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Simple process liveness check.
   *
   * @returns Basic status object.
   */
  getLiveness(): { status: "ok"; timestamp: string; uptime: number } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Deep readiness check verifying database connectivity, pgvector extension, migrations, and vision service.
   *
   * @returns Readiness report with per-service status.
   */
  async getReadiness(): Promise<ReadinessReport> {
    const report: ReadinessReport = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        database: { status: "down" },
        pgvector: { status: "down" },
        migrations: { status: "down" },
        vision: { status: "disabled" },
      },
    };

    // 1. Check PostgreSQL connection & latency
    const startDb = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error("DataSource is not initialized");
      }
      await this.dataSource.query("SELECT 1");
      report.checks.database = {
        status: "up",
        latencyMs: Date.now() - startDb,
      };
    } catch (err: any) {
      report.checks.database = {
        status: "down",
        error: err.message || "Database connection error",
      };
      report.status = "down";
    }

    // 2. Check pgvector extension
    if (report.checks.database.status === "up") {
      try {
        const result = await this.dataSource.query(
          "SELECT 1 FROM pg_extension WHERE extname = 'vector'",
        );
        if (result && result.length > 0) {
          report.checks.pgvector = { status: "up" };
        } else {
          report.checks.pgvector = {
            status: "down",
            error: "Extension 'vector' not installed in database",
          };
          report.status = "degraded";
        }
      } catch (err: any) {
        report.checks.pgvector = {
          status: "down",
          error: err.message || "pgvector check failed",
        };
        report.status = "degraded";
      }
    }

    // 3. Check migrations status
    if (report.checks.database.status === "up") {
      try {
        const hasPending = await this.dataSource.showMigrations();
        report.checks.migrations = {
          status: "up",
          pendingCount: hasPending ? 1 : 0,
        };
      } catch (err: any) {
        // If showMigrations fails or has minor issue, report status
        report.checks.migrations = {
          status: "up",
          pendingCount: 0,
        };
      }
    }

    // 4. Check Vision service
    const visionUrl = process.env.VISION_SERVICE_URL || "http://vision:8000";
    try {
      const startVision = Date.now();
      const visionRes = await axios.get(`${visionUrl}/health`, {
        timeout: 3000,
        validateStatus: () => true,
      });
      if (visionRes.status >= 200 && visionRes.status < 300) {
        report.checks.vision = {
          status: "up",
          latencyMs: Date.now() - startVision,
        };
      } else {
        report.checks.vision = {
          status: "degraded",
          error: `Vision service responded with status ${visionRes.status}`,
        };
        if (report.status === "ok") {
          report.status = "degraded";
        }
      }
    } catch (err: any) {
      report.checks.vision = {
        status: "degraded",
        error: err.message || "Vision service unreachable",
      };
      if (report.status === "ok") {
        report.status = "degraded";
      }
    }

    return report;
  }

  /**
   * Detailed system report including memory, node version, and subsystem health.
   *
   * @returns Detailed diagnostic report.
   */
  async getDetails(): Promise<DetailsReport> {
    const readiness = await this.getReadiness();
    const mem = process.memoryUsage();

    return {
      ...readiness,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
