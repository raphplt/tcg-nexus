import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { DemoService } from "../seed/demo.service";

async function run() {
  console.log("🚀 Initializing TCG Nexus Demo Preparation...");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    const demoService = app.get(DemoService);
    const report = await demoService.prepareDemo();

    console.log("\n=======================================================");
    console.log("✅ TCG NEXUS — DEMO PREPARATION REPORT");
    console.log("=======================================================");
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`\n👥 Demo Users (${report.users.length}):`);
    console.table(report.users);
    console.log(`\n🏆 Demo Tournament:`);
    console.log(
      `   ID: #${report.tournament.id} | Name: "${report.tournament.name}" | Status: ${report.tournament.status}`,
    );
    console.log(
      `   Participants: ${report.tournament.participantsCount} | Initial matches: ${report.tournament.matchesCount}`,
    );
    console.log(`\n📰 Demo Articles (${report.articles.length}):`);
    console.table(report.articles);
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ Error preparing demo dataset:", error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

run();
