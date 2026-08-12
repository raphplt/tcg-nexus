import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "./catalog-localization.service";
import { PokemonSerieTranslation } from "../pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSetTranslation } from "../pokemon-set/entities/pokemon-set-translation.entity";
import { CardTranslation } from "./entities/card-translation.entity";

describe("CatalogLocalizationService", () => {
  let service: CatalogLocalizationService;
  const find = jest.fn();
  const findSets = jest.fn().mockResolvedValue([]);
  const findSeries = jest.fn().mockResolvedValue([]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogLocalizationService,
        {
          provide: getRepositoryToken(CardTranslation),
          useValue: { find },
        },
        {
          provide: getRepositoryToken(PokemonSetTranslation),
          useValue: { find: findSets },
        },
        {
          provide: getRepositoryToken(PokemonSerieTranslation),
          useValue: { find: findSeries },
        },
      ],
    }).compile();

    service = module.get(CatalogLocalizationService);
    find.mockReset();
    findSets.mockReset().mockResolvedValue([]);
    findSeries.mockReset().mockResolvedValue([]);
  });

  const card = (id: string, name: string) => ({
    id,
    tcgDexId: "base1-4",
    name,
    pokemonDetails: { description: "description française" },
  });

  it("applique la traduction de la langue demandée", async () => {
    find.mockResolvedValue([
      { cardId: "1", locale: "fr", name: "Dracaufeu" },
      {
        cardId: "1",
        locale: "en",
        name: "Charizard",
        description: "english description",
      },
    ]);

    const payload = await service.localize(card("1", "Dracaufeu"), "en");

    expect(payload.name).toBe("Charizard");
    expect(payload.pokemonDetails.description).toBe("english description");
  });

  it("retombe sur la langue par défaut quand la traduction manque", async () => {
    find.mockResolvedValue([{ cardId: "1", locale: "fr", name: "Dracaufeu" }]);

    const payload = await service.localize(card("1", "valeur héritée"), "en");

    expect(payload.name).toBe("Dracaufeu");
  });

  it("laisse la valeur en place plutôt que de la vider", async () => {
    find.mockResolvedValue([{ cardId: "1", locale: "en", name: undefined }]);

    const payload = await service.localize(card("1", "Dracaufeu"), "en");

    expect(payload.name).toBe("Dracaufeu");
  });

  it("traduit les cartes imbriquées dans un payload", async () => {
    find.mockResolvedValue([
      { cardId: "1", locale: "en", name: "Charizard" },
      { cardId: "2", locale: "en", name: "Blastoise" },
    ]);

    const payload = await service.localize(
      {
        items: [
          { id: "listing-1", card: card("1", "Dracaufeu") },
          { id: "listing-2", card: card("2", "Tortank") },
        ],
      },
      "en",
    );

    expect(payload.items[0].card.name).toBe("Charizard");
    expect(payload.items[1].card.name).toBe("Blastoise");
    // Single query regardless of card count in payload
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("does not execute query when payload contains no entities", async () => {
    await service.localize({ message: "ok" }, "en");
    expect(find).not.toHaveBeenCalled();
    expect(findSets).not.toHaveBeenCalled();
    expect(findSeries).not.toHaveBeenCalled();
  });

  it("translates set and series carried by a card", async () => {
    find.mockResolvedValue([]);
    findSets.mockResolvedValue([
      { setId: "base1", locale: "en", name: "Base Set" },
    ]);
    findSeries.mockResolvedValue([
      { serieId: "base", locale: "en", name: "Base" },
    ]);

    const payload = await service.localize(
      {
        ...card("1", "Dracaufeu"),
        set: {
          id: "base1",
          name: "Set de Base",
          releaseDate: "1999-01-09",
          serie: { id: "base", name: "Base" },
        },
      },
      "en",
    );

    expect(payload.set.name).toBe("Base Set");
    expect(payload.set.serie.name).toBe("Base");
  });

  it("leaves non-set object untouched", async () => {
    find.mockResolvedValue([]);
    // No database translation for this ID: DB filter eliminates false positives.
    findSets.mockResolvedValue([]);

    const payload = await service.localize(
      { id: "un-objet-quelconque", name: "inchangé", releaseDate: "2020-01-01" },
      "en",
    );

    expect(payload.name).toBe("inchangé");
  });
});
