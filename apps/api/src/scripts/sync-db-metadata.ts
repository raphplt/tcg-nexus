import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "../app.module";
import { PokemonSerie } from "../pokemon-series/entities/pokemon-serie.entity";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { CardGame } from "../common/enums/cardGame";

async function bootstrap() {
  console.log("🌱 Starting Database Metadata Synchronization (Series & Sets)...");

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const pokemonSerieRepository = dataSource.getRepository(PokemonSerie);
  const pokemonSetRepository = dataSource.getRepository(PokemonSet);

  const seriesJsonPath = path.resolve(__dirname, "../../../../data/pokemon_series.json");
  const setsJsonPath = path.resolve(__dirname, "../../../../data/pokemon_sets.json");

  // 1. Sync Series
  if (fs.existsSync(seriesJsonPath)) {
    try {
      console.log("\n--- Synchronizing Pokemon Series ---");
      const seriesData = JSON.parse(fs.readFileSync(seriesJsonPath, "utf-8"));
      let seriesUpdated = 0;
      let seriesCreated = 0;

      for (const serieData of seriesData) {
        if (!serieData.id) continue;

        let dbSerie = await pokemonSerieRepository.findOne({
          where: { id: serieData.id },
        });

        if (dbSerie) {
          let hasChanges = false;
          if (dbSerie.logo !== serieData.logo) {
            dbSerie.logo = serieData.logo;
            hasChanges = true;
          }
          if (dbSerie.name !== serieData.name) {
            dbSerie.name = serieData.name;
            hasChanges = true;
          }

          if (hasChanges) {
            await pokemonSerieRepository.save(dbSerie);
            seriesUpdated++;
          }
        } else {
          console.log(`  [NEW] Creating series: ${serieData.name} (${serieData.id})`);
          dbSerie = pokemonSerieRepository.create({
            id: serieData.id,
            name: serieData.name,
            logo: serieData.logo,
          });
          await pokemonSerieRepository.save(dbSerie);
          seriesCreated++;
        }
      }
      console.log(`✅ Series sync complete: ${seriesCreated} created, ${seriesUpdated} updated.`);
    } catch (error) {
      console.error("❌ Failed to synchronize series:", error);
    }
  } else {
    console.warn(`⚠️ Series JSON file not found at ${seriesJsonPath}`);
  }

  // 2. Sync Sets
  if (fs.existsSync(setsJsonPath)) {
    try {
      console.log("\n--- Synchronizing Pokemon Sets ---");
      const setsData = JSON.parse(fs.readFileSync(setsJsonPath, "utf-8"));
      let setsUpdated = 0;
      let setsCreated = 0;

      for (const setData of setsData) {
        if (!setData.id) continue;

        // Resolve serie relation
        const serieId = setData.serieId || setData.serie?.id;
        let dbSerie: PokemonSerie | null = null;
        if (serieId) {
          dbSerie = await pokemonSerieRepository.findOne({
            where: { id: serieId },
          });
        }

        let dbSet = await pokemonSetRepository.findOne({
          where: { id: setData.id },
          relations: ["serie"],
        });

        if (dbSet) {
          let hasChanges = false;

          if (dbSet.name !== setData.name) {
            dbSet.name = setData.name;
            hasChanges = true;
          }
          if (dbSet.logo !== setData.logo) {
            dbSet.logo = setData.logo;
            hasChanges = true;
          }
          if (dbSet.symbol !== setData.symbol) {
            dbSet.symbol = setData.symbol;
            hasChanges = true;
          }
          if (dbSet.releaseDate !== setData.releaseDate) {
            dbSet.releaseDate = setData.releaseDate;
            hasChanges = true;
          }
          if (dbSet.tcgOnline !== setData.tcgOnline) {
            dbSet.tcgOnline = setData.tcgOnline;
            hasChanges = true;
          }

          // Check embedded cardCount and legal
          if (setData.cardCount) {
            if (!dbSet.cardCount) dbSet.cardCount = { total: 0, official: 0, reverse: 0, holo: 0, firstEd: 0 };
            if (
              dbSet.cardCount.total !== setData.cardCount.total ||
              dbSet.cardCount.official !== setData.cardCount.official ||
              dbSet.cardCount.reverse !== setData.cardCount.reverse ||
              dbSet.cardCount.holo !== setData.cardCount.holo ||
              dbSet.cardCount.firstEd !== setData.cardCount.firstEd
            ) {
              dbSet.cardCount = {
                total: setData.cardCount.total || 0,
                official: setData.cardCount.official || 0,
                reverse: setData.cardCount.reverse || 0,
                holo: setData.cardCount.holo || 0,
                firstEd: setData.cardCount.firstEd || 0,
              };
              hasChanges = true;
            }
          }

          if (setData.legal) {
            if (!dbSet.legal) dbSet.legal = { standard: false, expanded: false };
            if (
              dbSet.legal.standard !== setData.legal.standard ||
              dbSet.legal.expanded !== setData.legal.expanded
            ) {
              dbSet.legal = {
                standard: !!setData.legal.standard,
                expanded: !!setData.legal.expanded,
              };
              hasChanges = true;
            }
          }

          // Check relation
          if (dbSerie && (!dbSet.serie || dbSet.serie.id !== dbSerie.id)) {
            console.log(`  Updating series relation for set ${dbSet.name} (${dbSet.id}): ${dbSet.serie?.id || "None"} -> ${dbSerie.id}`);
            dbSet.serie = dbSerie;
            hasChanges = true;
          }

          if (hasChanges) {
            await pokemonSetRepository.save(dbSet);
            setsUpdated++;
          }
        } else {
          console.log(`  [NEW] Creating set: ${setData.name} (${setData.id})`);
          const newSet = pokemonSetRepository.create({
            id: setData.id,
            game: CardGame.Pokemon,
            name: setData.name,
            logo: setData.logo,
            symbol: setData.symbol,
            releaseDate: setData.releaseDate,
            tcgOnline: setData.tcgOnline,
            cardCount: setData.cardCount ? {
              total: setData.cardCount.total || 0,
              official: setData.cardCount.official || 0,
              reverse: setData.cardCount.reverse || 0,
              holo: setData.cardCount.holo || 0,
              firstEd: setData.cardCount.firstEd || 0,
            } : { total: 0, official: 0, reverse: 0, holo: 0, firstEd: 0 },
            legal: setData.legal ? {
              standard: !!setData.legal.standard,
              expanded: !!setData.legal.expanded,
            } : { standard: false, expanded: false },
            serie: dbSerie || undefined,
          });

          await pokemonSetRepository.save(newSet);
          setsCreated++;
        }
      }
      console.log(`✅ Sets sync complete: ${setsCreated} created, ${setsUpdated} updated.`);
    } catch (error) {
      console.error("❌ Failed to synchronize sets:", error);
    }
  } else {
    console.warn(`⚠️ Sets JSON file not found at ${setsJsonPath}`);
  }

  console.log("\n🎉 Database Metadata Synchronization finished!");
  await app.close();
}

void bootstrap();
