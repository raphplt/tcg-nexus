import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CatalogBreadcrumb,
  CatalogBrowser,
  CatalogExplorer,
} from "@/components/Catalog/CatalogExplorer";
import type { CatalogNavigation } from "@/hooks/useCatalogNavigation";
import type { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";

const sword = {
  id: "swsh",
  name: "Épée et Bouclier",
} satisfies PokemonSerieType;
const scarlet = {
  id: "sv",
  name: "Écarlate et Violet",
} satisfies PokemonSerieType;
const withoutSets = {
  id: "empty",
  name: "Série vide",
} satisfies PokemonSerieType;

const paldea = {
  id: "sv02",
  name: "Évolutions à Paldea",
  releaseDate: "2023-06-09",
  serie: scarlet,
  cardCount: { total: 279, official: 193, reverse: 0, holo: 0, firstEd: 0 },
  legal: { standard: true, expanded: true },
} satisfies PokemonSetType;
const scarletBase = {
  id: "sv01",
  name: "Écarlate et Violet",
  releaseDate: "2023-03-31",
  serie: scarlet,
} satisfies PokemonSetType;
const swordBase = {
  id: "swsh1",
  name: "Épée et Bouclier",
  releaseDate: "2020-02-07",
  serie: sword,
} satisfies PokemonSetType;

// API order: series by oldest release, sets newest first.
const series = [sword, scarlet, withoutSets];
const sets = [paldea, scarletBase, swordBase];

const navigation = (
  overrides: Partial<CatalogNavigation> = {},
): CatalogNavigation => ({
  isBrowsing: true,
  showAllCards: false,
  serieId: undefined,
  setId: undefined,
  browseSerie: vi.fn(),
  browseSet: vi.fn(),
  showAll: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

describe("catalogue explorer", () => {
  it("lists series newest first and opens one", async () => {
    const onSelectSerie = vi.fn();
    const user = userEvent.setup();

    render(
      <CatalogBrowser
        series={series}
        sets={sets}
        onSelectSerie={onSelectSerie}
        onSelectSet={vi.fn()}
      />,
    );

    // The test translator does not expand ICU plurals: only assert on the rest.
    const tiles = screen.getAllByRole("button");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveTextContent("Écarlate et Violet");
    expect(tiles[0]).toHaveTextContent("· 2023");
    expect(tiles[1]).toHaveTextContent("Épée et Bouclier");
    expect(tiles[1]).toHaveTextContent("· 2020");
    expect(screen.queryByText("Série vide")).not.toBeInTheDocument();

    await user.click(tiles[0]!);
    expect(onSelectSerie).toHaveBeenCalledWith("sv");
  });

  it("shows only the sets of the chosen series", async () => {
    const onSelectSet = vi.fn();
    const user = userEvent.setup();

    render(
      <CatalogBrowser
        series={series}
        sets={sets}
        serieId="sv"
        onSelectSerie={vi.fn()}
        onSelectSet={onSelectSet}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Épée et Bouclier/ }),
    ).not.toBeInTheDocument();
    const paldeaTile = screen.getByRole("button", {
      name: /Évolutions à Paldea/,
    });
    expect(paldeaTile).toHaveTextContent("Standard");
    expect(paldeaTile).toHaveTextContent("2023 ·");

    await user.click(paldeaTile);
    expect(onSelectSet).toHaveBeenCalledWith(paldea);
  });

  it("lets users step back up from a set", async () => {
    const onRoot = vi.fn();
    const onSerie = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <CatalogBreadcrumb
        serie={scarlet}
        set={paldea}
        showAllCards={false}
        onRoot={onRoot}
        onSerie={onSerie}
      />,
    );

    expect(screen.getByText("Évolutions à Paldea")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await user.click(
      screen.getByRole("button", { name: "Écarlate et Violet" }),
    );
    expect(onSerie).toHaveBeenCalledWith("sv");
    await user.click(screen.getByRole("button", { name: "Séries" }));
    expect(onRoot).toHaveBeenCalled();

    rerender(
      <CatalogBreadcrumb
        showAllCards={false}
        onRoot={onRoot}
        onSerie={onSerie}
      />,
    );
    expect(screen.getByText("Séries")).toHaveAttribute("aria-current", "page");
  });

  it("offers every card while browsing and shows the list otherwise", async () => {
    const nav = navigation({ serieId: "sv" });
    const user = userEvent.setup();

    const { rerender } = render(
      <CatalogExplorer nav={nav} series={series} sets={sets}>
        <p>Liste des cartes</p>
      </CatalogExplorer>,
    );

    expect(screen.queryByText("Liste des cartes")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Toute la série" }));
    expect(nav.showAll).toHaveBeenCalled();

    rerender(
      <CatalogExplorer
        nav={navigation({ isBrowsing: false, setId: "sv02" })}
        series={series}
        sets={sets}
      >
        <p>Liste des cartes</p>
      </CatalogExplorer>,
    );

    expect(screen.getByText("Liste des cartes")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Toutes les cartes" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Évolutions à Paldea")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
