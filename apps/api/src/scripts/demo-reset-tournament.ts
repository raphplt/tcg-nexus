import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { DemoService } from "../seed/demo.service";

async function run() {
  console.log("🔄 Resetting TCG Nexus Demo Tournament...");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    const demoService = app.get(DemoService);
    const result = await demoService.resetDemoTournament();

    console.log("\n=======================================================");
    if (result.success) {
      console.log(
        `✅ Demo tournament #${result.tournamentId} successfully reset!`,
      );
      console.log(`ℹ️  ${result.message}`);
    } else {
      console.log(`⚠️  Warning: ${result.message}`);
    }
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ Error resetting demo tournament:", error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run();
