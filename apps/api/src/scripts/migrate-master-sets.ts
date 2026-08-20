import { PokemonSetTranslation } from "../pokemon-set/entities/pokemon-set-translation.entity";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { Collection } from "src/collection/entities/collection.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import { getRepositoryToken } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";

/**
 * Reads the display name of a set from its translation rows.
 *
 * @param translations - Translation rows of a single set.
 * @param fallback - Value returned when no translation carries a name.
 * @returns Localized set name.
 */
function resolveSetName(
  translations: PokemonSetTranslation[],
  fallback: string,
): string {
  const preferred =
    translations.find((translation) => translation.locale === DEFAULT_LOCALE) ??
    translations[0];
  return preferred?.name?.trim() || fallback;
}

/**
 * Renames Master Set collections whose labels were built before the set name
 * was resolved: `PokemonSet.name` is virtual and reads as `undefined` unless
 * the translations are loaded, which used to produce "Master Set — undefined".
 */
async function repairMasterSetLabels(
  collectionRepo: Repository<Collection>,
  translationRepo: Repository<PokemonSetTranslation>,
): Promise<void> {
  const broken = await collectionRepo.find({
    where: { name: Like("%undefined%") },
    relations: ["masterSet"],
  });
  const repairable = broken.flatMap((collection) =>
    collection.masterSet
      ? [{ collection, setId: collection.masterSet.id }]
      : [],
  );

  if (repairable.length === 0) {
    console.log("✅ Aucun libellé de Master Set à réparer.");
    return;
  }

  const setIds = repairable.map(({ setId }) => setId);
  const translations = await translationRepo.find({
    where: { setId: In(setIds) },
  });
  const translationsBySetId = new Map<string, PokemonSetTranslation[]>();
  for (const translation of translations) {
    const group = translationsBySetId.get(translation.setId) ?? [];
    group.push(translation);
    translationsBySetId.set(translation.setId, group);
  }

  console.log(`🩹 ${repairable.length} libellé(s) à réparer...`);

  for (const { collection, setId } of repairable) {
    const setName = resolveSetName(translationsBySetId.get(setId) ?? [], setId);
    collection.name = `Master Set — ${setName}`;
    collection.description = `Master Set pour l'extension ${setName}`;
    await collectionRepo.save(collection);
    console.log(
      `  ✅ Collection #${collection.id} renommée → ${collection.name}`,
    );
  }
}

async function bootstrap() {
  console.log(
    "🔄 Migration: rattacher les anciens Master Sets au PokemonSet correspondant...",
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  const collectionRepo = app.get<Repository<Collection>>(
    getRepositoryToken(Collection),
  );
  const setRepo = app.get<Repository<PokemonSet>>(
    getRepositoryToken(PokemonSet),
  );
  const translationRepo = app.get<Repository<PokemonSetTranslation>>(
    getRepositoryToken(PokemonSetTranslation),
  );

  try {
    // Find PokemonSet "Surging Sparks" ("Étincelles Déferlantes")
    // Set names originate from translations table: query via translation repository.
    const translation = await translationRepo.findOne({
      where: { name: "Étincelles Déferlantes" },
    });

    const ev08 = translation
      ? await setRepo.findOne({ where: { id: translation.setId } })
      : null;

    if (!ev08) {
      console.log(
        "⚠️ PokemonSet 'Étincelles Déferlantes' not found in database. Nothing to migrate.",
      );
    } else {
      // Find all collections with matching name lacking masterSet relationship
      const collections = await collectionRepo.find({
        where: { name: "Étincelles Déferlantes" },
        relations: ["masterSet"],
      });

      const toMigrate = collections.filter((c) => !c.masterSet);

      if (toMigrate.length === 0) {
        console.log("✅ Aucune collection à rattacher. Tout est déjà à jour.");
      } else {
        console.log(`📦 ${toMigrate.length} collection(s) à migrer...`);

        const setName = translation?.name?.trim() || ev08.id;
        for (const collection of toMigrate) {
          collection.masterSet = ev08;
          collection.name = `Master Set — ${setName}`;
          collection.description = `Master Set pour l'extension ${setName}`;
          await collectionRepo.save(collection);
          console.log(
            `  ✅ Collection #${collection.id} migrée → Master Set ${setName}`,
          );
        }
      }
    }

    await repairMasterSetLabels(collectionRepo, translationRepo);

    console.log("🎉 Migration terminée avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
  }

  await app.close();
}

void bootstrap();
