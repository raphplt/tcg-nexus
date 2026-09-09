import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadCardsFromCSV,
  exportCardInputsToJSON,
  type PipelineOptions,
} from "../src/pipeline.js";

describe("pipeline", () => {
  function setupTestDir(): string {
    return mkdtempSync(join(tmpdir(), "effect-parser-pipeline-test-"));
  }

  it("should parse cards and details from CSV with effect filtering", () => {
    const testDir = setupTestDir();
    try {
      const cardsCsv = [
        "id,tcgDexId,name,category",
        "c1,sv3-1,Pikachu,Pokémon",
        "c2,sv3-2,Bulbizarre,Pokémon",
        "c3,sv3-3,Potion,Dresseur",
        "c4,sv3-4,Inconnu,Inconnu",
        "c5,sv3-5,SansDetail,Pokémon",
      ].join("\n");

      const detailsCsv = [
        "card_id,category,hp,types,stage,suffix,evolveFrom,effect,attacks,abilities,weaknesses,resistances,retreat,trainerType,energyType",
        'c1,Pokémon,70,"[""Électrique""]",Base,,,,"[{""name"":""Éclair"",""cost"":[""Électrique""],""damage"":30,""effect"":""Paralyse.""}]","[{""name"":""Statique"",""effect"":""Quand touché, paralyse.""}]",,,1,,',
        'c2,Pokémon,60,"[""Plante""]",Base,,,,"[{""name"":""Charge"",""cost"":[""Incolore""],""damage"":10}]",,,,1,,',
        "c3,Dresseur,,,,,,Soigne 30 dégâts.,,,,,,Objet,",
        "c4,Inconnu,,,,,,,,,,,,,",
      ].join("\n");

      const cardsCsvPath = join(testDir, "cards.csv");
      const detailsCsvPath = join(testDir, "details.csv");
      const outputPath = join(testDir, "output.json");

      writeFileSync(cardsCsvPath, cardsCsv, "utf-8");
      writeFileSync(detailsCsvPath, detailsCsv, "utf-8");

      const opts: PipelineOptions = {
        cardsCsvPath,
        detailsCsvPath,
        outputPath,
        filterWithEffects: true,
      };

      const results = loadCardsFromCSV(opts);

      // Only c1 (Pikachu) and c3 (Potion) should be included (c2 has no effects, c4 invalid category, c5 no details)
      assert.equal(results.length, 2);

      const pikachu = results.find((c) => c.id === "sv3-1");
      assert.ok(pikachu);
      assert.equal(pikachu.name, "Pikachu");
      assert.equal(pikachu.category, "Pokémon");
      assert.equal(pikachu.hp, 70);
      assert.equal(pikachu.retreat, 1);
      assert.deepEqual(pikachu.types, ["Électrique"]);
      assert.equal(pikachu.ability?.name, "Statique");
      assert.equal(pikachu.attacks?.length, 1);
      assert.equal(pikachu.attacks?.[0]?.name, "Éclair");

      const potion = results.find((c) => c.id === "sv3-3");
      assert.ok(potion);
      assert.equal(potion.name, "Potion");
      assert.equal(potion.category, "Dresseur");
      assert.equal(potion.trainerType, "Objet");
      assert.equal(potion.effect, "Soigne 30 dégâts.");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should keep cards without effects when filterWithEffects is false", () => {
    const testDir = setupTestDir();
    try {
      const cardsCsv = [
        "id,tcgDexId,name,category",
        "c1,sv3-1,Vanilla,Pokemon",
        "c2,,SimpleTrainer,Trainer",
      ].join("\n");

      const detailsCsv = [
        "card_id,category,hp,types,stage,suffix,evolveFrom,effect,attacks,abilities,weaknesses,resistances,retreat,trainerType,energyType",
        'c1,Pokemon,50,"[""Incolore""]",Base,,,,"[{""name"":""Coup"",""cost"":[""Incolore""],""damage"":10}]",,,,,1,,',
        "c2,Trainer,,,,,,,,,,,,,,,Supporter,",
      ].join("\n");

      const cardsCsvPath = join(testDir, "cards.csv");
      const detailsCsvPath = join(testDir, "details.csv");
      const outputPath = join(testDir, "output.json");

      writeFileSync(cardsCsvPath, cardsCsv, "utf-8");
      writeFileSync(detailsCsvPath, detailsCsv, "utf-8");

      const results = loadCardsFromCSV({
        cardsCsvPath,
        detailsCsvPath,
        outputPath,
        filterWithEffects: false,
      });

      assert.equal(results.length, 2);
      assert.equal(results[0]?.id, "sv3-1");
      assert.equal(results[0]?.category, "Pokémon");
      // c2 has no tcgDexId so falls back to id
      assert.equal(results[1]?.id, "c2");
      assert.equal(results[1]?.category, "Dresseur");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should export card inputs to JSON file", () => {
    const testDir = setupTestDir();
    try {
      const cardsCsv = [
        "id,tcgDexId,name,category",
        "c1,energy-1,Double Rainbow,Énergie",
        "c2,energy-2,Basic Fire,Energy",
      ].join("\n");

      const detailsCsv = [
        "card_id,category,hp,types,stage,suffix,evolveFrom,effect,attacks,abilities,weaknesses,resistances,retreat,trainerType,energyType",
        "c1,Énergie,,,,,,,,,,,,,,,,Special",
        "c2,Energy,,,,,,,,,,,,,,,,Basic",
      ].join("\n");

      const cardsCsvPath = join(testDir, "cards.csv");
      const detailsCsvPath = join(testDir, "details.csv");
      const outputPath = join(testDir, "exported.json");

      writeFileSync(cardsCsvPath, cardsCsv, "utf-8");
      writeFileSync(detailsCsvPath, detailsCsv, "utf-8");

      exportCardInputsToJSON({
        cardsCsvPath,
        detailsCsvPath,
        outputPath,
        filterWithEffects: false,
      });

      const writtenContent = readFileSync(outputPath, "utf-8");
      const parsed = JSON.parse(writtenContent);
      assert.equal(parsed.length, 2);
      assert.equal(parsed[0].name, "Double Rainbow");
      assert.equal(parsed[0].category, "Énergie");
      assert.equal(parsed[1].name, "Basic Fire");
      assert.equal(parsed[1].category, "Énergie");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should handle corrupted or escaped JSON fields gracefully", () => {
    const testDir = setupTestDir();
    try {
      const cardsCsv = [
        "id,tcgDexId,name,category",
        "c1,sv3-1,TestEscaped,Pokémon",
        "c2,sv3-2,TestInvalid,Pokémon",
      ].join("\n");

      const detailsCsv = [
        "card_id,category,hp,types,stage,suffix,evolveFrom,effect,attacks,abilities,weaknesses,resistances,retreat,trainerType,energyType",
        // c1: double-double quotes that succeed via replace(/""/g, '"')
        'c1,Pokémon,80,"[""Feu""]",,,,,,"[{""name"":""Fire"",""effect"":""Burn""}]",,,,',
        // c2: truly malformed JSON
        'c2,Pokémon,90,{not-valid-json},,,,,"{still-not-json}",,,,',
      ].join("\n");

      const cardsCsvPath = join(testDir, "cards.csv");
      const detailsCsvPath = join(testDir, "details.csv");
      const outputPath = join(testDir, "output.json");

      writeFileSync(cardsCsvPath, cardsCsv, "utf-8");
      writeFileSync(detailsCsvPath, detailsCsv, "utf-8");

      const results = loadCardsFromCSV({
        cardsCsvPath,
        detailsCsvPath,
        outputPath,
        filterWithEffects: true,
      });

      assert.equal(results.length, 1);
      assert.equal(results[0]?.name, "TestEscaped");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
