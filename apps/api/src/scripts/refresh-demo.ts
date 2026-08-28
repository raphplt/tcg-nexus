import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { DemoRefreshService } from "../seed/demo-refresh.service";

/**
 * Realigns the demo dataset with the presentation script.
 *
 * Unlike `importData.ts`, this never truncates anything: it updates the demo
 * fixtures in place and can be run again the morning of a presentation, which
 * is the point — the seeded dates are absolute and drift as days pass.
 *
 * Local:      npm run refresh:demo
 * Deployed:   docker exec tcg-nexus-api npm run refresh:demo:prod
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const report = await app.get(DemoRefreshService).refresh();

    console.log("\n\x1b[36m➡️  Demo dataset refresh\x1b[0m");
    for (const step of report.steps) {
      console.log(`\x1b[32m  ✔ ${step}\x1b[0m`);
    }
    for (const warning of report.warnings) {
      console.log(`\x1b[33m  ⚠ ${warning}\x1b[0m`);
    }

    if (report.warnings.length > 0) {
      console.log(
        `\n\x1b[33m${report.warnings.length} step(s) could not complete.\x1b[0m`,
      );
      process.exitCode = 1;
      return;
    }

    console.log("\n\x1b[32m✅ Demo dataset is aligned with the script.\x1b[0m");
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error("\x1b[31m❌ Demo refresh failed:\x1b[0m", error);
  process.exit(1);
});
