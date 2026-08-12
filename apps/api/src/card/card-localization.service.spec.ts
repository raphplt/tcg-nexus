import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CardLocalizationService } from "./card-localization.service";
import { CardTranslation } from "./entities/card-translation.entity";

describe("CardLocalizationService", () => {
  let service: CardLocalizationService;
  const find = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardLocalizationService,
        {
          provide: getRepositoryToken(CardTranslation),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get(CardLocalizationService);
    find.mockReset();
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
    // Une seule requête, quel que soit le nombre de cartes du payload.
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("ne requête rien quand le payload ne contient aucune carte", async () => {
    await service.localize({ message: "ok" }, "en");
    expect(find).not.toHaveBeenCalled();
  });
});
