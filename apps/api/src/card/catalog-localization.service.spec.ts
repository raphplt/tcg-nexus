import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "./catalog-localization.service";
import { PokemonSerieTranslation } from "../pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSerie } from "../pokemon-series/entities/pokemon-serie.entity";
import { SealedProductLocale } from "../sealed-product/entities/sealed-product-locale.entity";
import { PokemonSetTranslation } from "../pokemon-set/entities/pokemon-set-translation.entity";
import { CardTranslation } from "./entities/card-translation.entity";

describe("CatalogLocalizationService", () => {
  let service: CatalogLocalizationService;
  const find = jest.fn();
  const findSets = jest.fn().mockResolvedValue([]);
  const findSeries = jest.fn().mockResolvedValue([]);
  const findSealed = jest.fn().mockResolvedValue([]);

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
        {
          provide: getRepositoryToken(SealedProductLocale),
          useValue: { find: findSealed },
        },
      ],
    }).compile();

    service = module.get(CatalogLocalizationService);
    find.mockReset();
    findSets.mockReset().mockResolvedValue([]);
    findSeries.mockReset().mockResolvedValue([]);
    findSealed.mockReset().mockResolvedValue([]);
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

  it("retombe sur n'importe quelle langue quand ni la langue demandée ni la langue par défaut n'existent", async () => {
    // Certains sets n'existent qu'en anglais : leurs cartes doivent tout de
    // même porter un nom pour un visiteur francophone.
    find.mockResolvedValue([
      { cardId: "1", locale: "en", name: "Charizard ex" },
    ]);

    const payload = await service.localize(card("1", "ignoré"), "fr");

    expect(payload.name).toBe("Charizard ex");
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

  const sealedProduct = (id: string) =>
    ({ id, productType: "booster" }) as {
      id: string;
      productType: string;
      name?: string;
      translations?: Record<string, { name: string }>;
    };

  it("nomme un produit scellé dans la langue demandée", async () => {
    findSealed.mockResolvedValue([
      {
        sealedProductId: "jtg-bundle",
        locale: "fr",
        name: "Aventures Ensemble - Coffret Dresseur",
      },
      {
        sealedProductId: "jtg-bundle",
        locale: "en",
        name: "Journey Together - Booster Bundle",
      },
    ]);

    const payload = await service.localize(sealedProduct("jtg-bundle"), "en");

    expect(payload.name).toBe("Journey Together - Booster Bundle");
  });

  it("retombe sur le français quand le produit scellé n'a pas de nom anglais", async () => {
    // 28 % des produits n'ont pas de nom composable : ils gardent le français
    // plutôt qu'un libellé à moitié traduit.
    findSealed.mockResolvedValue([
      {
        sealedProductId: "swsh8-envolee",
        locale: "fr",
        name: "Envolée Orageuse",
      },
    ]);

    const payload = await service.localize(
      sealedProduct("swsh8-envolee"),
      "en",
    );

    expect(payload.name).toBe("Envolée Orageuse");
  });

  it("attache toutes les langues d'un produit scellé pour l'admin", async () => {
    findSealed.mockResolvedValue([
      { sealedProductId: "jtg-bundle", locale: "fr", name: "Coffret Dresseur" },
      { sealedProductId: "jtg-bundle", locale: "en", name: "Booster Bundle" },
    ]);

    const payload = await service.localize(sealedProduct("jtg-bundle"), "fr", {
      withTranslations: true,
    });

    const translations = payload.translations ?? {};
    expect(Object.keys(translations)).toEqual(["fr", "en"]);
    expect(translations.en.name).toBe("Booster Bundle");
  });

  it("comble champ par champ ce qui manque dans la langue demandée", async () => {
    // TCGdex illustrates many old sets in English only: the French name must
    // survive while the artwork is borrowed from English.
    find.mockResolvedValue([
      { cardId: "1", locale: "fr", name: "Dialga", image: null },
      { cardId: "1", locale: "en", name: "Dialga", image: "en/dp/dp1/1" },
    ]);

    const payload: { name: string; image?: string } = await service.localize(
      card("1", "ignoré"),
      "fr",
    );

    expect(payload.name).toBe("Dialga");
    expect(payload.image).toBe("en/dp/dp1/1");
  });

  it("traduit toutes les occurrences d'une même entité, pas seulement la dernière", async () => {
    findSeries.mockResolvedValue([
      { serieId: "mc", locale: "fr", name: "Promo McDonald's" },
    ]);

    // The same series hangs off every set of a list: each occurrence is a
    // distinct object and all of them are displayed.
    const payload = await service.localize(
      [
        { id: "2015xy", serie: { id: "mc" } as { id: string; name?: string } },
        { id: "2016xy", serie: { id: "mc" } as { id: string; name?: string } },
      ],
      "fr",
    );

    expect(payload.map((set) => set.serie.name)).toEqual([
      "Promo McDonald's",
      "Promo McDonald's",
    ]);
  });

  it("reconnaît une entité TypeORM réduite à son identifiant", async () => {
    findSeries.mockResolvedValue([
      { serieId: "base", locale: "fr", name: "Base", logo: "logo.webp" },
    ]);

    // The series list endpoint only selects the id: nothing in the object's
    // shape says "series", only its class does.
    const serie = Object.assign(new PokemonSerie(), { id: "base" });
    const payload = await service.localize([serie], "fr");

    expect(payload[0].name).toBe("Base");
    expect(payload[0].logo).toBe("logo.webp");
  });

  it("leaves non-set object untouched", async () => {
    find.mockResolvedValue([]);
    // No database translation for this ID: DB filter eliminates false positives.
    findSets.mockResolvedValue([]);

    const payload = await service.localize(
      {
        id: "un-objet-quelconque",
        name: "inchangé",
        releaseDate: "2020-01-01",
      },
      "en",
    );

    expect(payload.name).toBe("inchangé");
  });
});
