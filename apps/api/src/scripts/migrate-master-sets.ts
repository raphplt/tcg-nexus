import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { Collection } from "src/collection/entities/collection.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

async function bootstrap() {
  console.log("🔄 Migration: rattacher les anciens Master Sets au PokemonSet correspondant...");

  const app = await NestFactory.createApplicationContext(AppModule);
  const collectionRepo = app.get<Repository<Collection>>(getRepositoryToken(Collection));
  const setRepo = app.get<Repository<PokemonSet>>(getRepositoryToken(PokemonSet));

  try {
    // Trouver le PokemonSet "Étincelles Déferlantes"
    const ev08 = await setRepo.findOne({ where: { name: "Étincelles Déferlantes" } });
    if (!ev08) {
      console.log("⚠️ PokemonSet 'Étincelles Déferlantes' non trouvé en base. Rien à migrer.");
      await app.close();
      return;
    }

    // Trouver toutes les collections avec ce nom qui n'ont pas encore de masterSet
    const collections = await collectionRepo.find({
      where: { name: "Étincelles Déferlantes" },
      relations: ["masterSet"],
    });

    const toMigrate = collections.filter((c) => !c.masterSet);

    if (toMigrate.length === 0) {
      console.log("✅ Aucune collection à migrer. Tout est déjà à jour.");
      await app.close();
      return;
    }

    console.log(`📦 ${toMigrate.length} collection(s) à migrer...`);

    for (const collection of toMigrate) {
      collection.masterSet = ev08;
      collection.name = `Master Set — ${ev08.name}`;
      collection.description = `Master Set pour l'extension ${ev08.name}`;
      await collectionRepo.save(collection);
      console.log(`  ✅ Collection #${collection.id} migrée → Master Set ${ev08.name}`);
    }

    console.log("🎉 Migration terminée avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
  }

  await app.close();
}

void bootstrap();
