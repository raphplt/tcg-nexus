import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerBoard } from "@/components/MiniGames/CaseOpening/PlayerBoard";
import { type BoosterCard, RarityTier } from "@/types/mini-game";

const createCard = (id: string, name: string, trend: number, tier: RarityTier): BoosterCard =>
  ({
    id,
    name,
    rarityTier: tier,
    image: `https://assets.tcgdex.net/fr/sv/sv01/${id}`,
    set: { id: "sv01", name: "Écarlate et Violet" },
    pricing: { cardmarket: { trend } },
  }) as never;

describe("PlayerBoard", () => {
  it("renders empty state when no packs are opened", () => {
    render(
      <PlayerBoard
        name="Joueur 1"
        score={0}
        packs={[]}
        accent="blue"
      />,
    );

    expect(screen.getByText("Joueur 1")).toBeInTheDocument();
    expect(screen.getByText("Aucune carte pour l'instant")).toBeInTheDocument();
  });

  it("renders round 1 with detailed cards and round header", () => {
    const pack1 = [
      createCard("1", "Pikachu", 1.5, RarityTier.Common),
      createCard("2", "Dracaufeu", 50, RarityTier.Ultra),
    ];

    render(
      <PlayerBoard
        name="Joueur 1"
        score={51.5}
        packs={[pack1]}
        accent="blue"
      />,
    );

    expect(screen.getByText("Joueur 1")).toBeInTheDocument();
    expect(screen.getByText("Manche 1")).toBeInTheDocument();
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Dracaufeu")).toBeInTheDocument();
  });

  it("renders rounds 1 and 2 with round headers and subtotals", () => {
    const pack1 = [createCard("1", "Pikachu", 1.5, RarityTier.Common)];
    const pack2 = [createCard("2", "Mewtwo", 25, RarityTier.Secret)];

    render(
      <PlayerBoard
        name="Joueur 1"
        score={26.5}
        packs={[pack1, pack2]}
        accent="blue"
      />,
    );

    expect(screen.getByText("Manche 1")).toBeInTheDocument();
    expect(screen.getByText("Manche 2")).toBeInTheDocument();
    expect(screen.getByText("Dernière")).toBeInTheDocument();
  });

  it("supports collapsing and expanding rounds when 3 or more packs exist", () => {
    const pack1 = [createCard("1", "Pikachu", 1.5, RarityTier.Common)];
    const pack2 = [createCard("2", "Mewtwo", 25, RarityTier.Secret)];
    const pack3 = [createCard("3", "Dracaufeu", 100, RarityTier.Secret)];

    render(
      <PlayerBoard
        name="Joueur 1"
        score={126.5}
        packs={[pack1, pack2, pack3]}
        accent="blue"
      />,
    );

    expect(screen.getByText("Tout replier")).toBeInTheDocument();

    // Toggle round 1
    const round1Btn = screen.getByText("Manche 1").closest("button");
    expect(round1Btn).not.toBeNull();
    fireEvent.click(round1Btn!);

    // Collapse all
    const collapseAllBtn = screen.getByText("Tout replier");
    fireEvent.click(collapseAllBtn);
    expect(screen.getByText("Tout déplier")).toBeInTheDocument();

    // Expand all
    fireEvent.click(screen.getByText("Tout déplier"));
    expect(screen.getByText("Tout replier")).toBeInTheDocument();
  });
});
