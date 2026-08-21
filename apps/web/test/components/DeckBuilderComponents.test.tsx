import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CardListSection } from "@/app/[locale]/(main)/decks/create/_components/form-parts/CardListSection";
import { SelectedCardsSection } from "@/app/[locale]/(main)/decks/create/_components/form-parts/SelectedCardsSection";
import type { PokemonCardType } from "@/types/cardPokemon";

const pikachu = {
  id: "card-1",
  name: "Pikachu",
  image: "/pikachu.png",
  set: { id: "base", name: "Base Set" },
} satisfies PokemonCardType;

describe("deck builder controls", () => {
  it("limits quantities to owned copies when browsing a collection", async () => {
    const addCard = vi.fn();
    const setQtyByCard = vi.fn();
    const user = userEvent.setup();

    render(
      <CardListSection
        cardsLoading={false}
        allCards={[pikachu]}
        page={1}
        setPage={vi.fn()}
        qtyByCard={{ "card-1": 1 }}
        setQtyByCard={setQtyByCard}
        roleByCard={{}}
        setRoleByCard={vi.fn()}
        addCard={addCard}
        ownedQuantityByCard={{ "card-1": 2 }}
      />,
    );

    expect(screen.getByText("x2 possédée(s)")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Quantité de Pikachu" }),
      { target: { value: "8" } },
    );
    expect(setQtyByCard).toHaveBeenCalled();
    const updateOwnedQuantity = setQtyByCard.mock.calls[0]?.[0] as (
      previous: Record<string, number>,
    ) => Record<string, number>;
    expect(updateOwnedQuantity({ "card-1": 1 })).toEqual({ "card-1": 2 });

    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(addCard).toHaveBeenCalledWith(pikachu, 1, "main");
  });

  it("offers one-tap quantity controls in the deck preview", async () => {
    const updateCardQty = vi.fn();
    const removeCard = vi.fn();
    const user = userEvent.setup();

    render(
      <SelectedCardsSection
        cards={[
          {
            cardId: pikachu.id,
            card: pikachu,
            qty: 1,
            role: "main",
          },
        ]}
        mainCount={1}
        sideCount={0}
        updateCardQty={updateCardQty}
        removeCard={removeCard}
        sticky={false}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Augmenter la quantité de Pikachu",
      }),
    );
    expect(updateCardQty).toHaveBeenCalledWith("card-1", "main", 2);

    await user.click(
      screen.getByRole("button", { name: "Retirer Pikachu du deck" }),
    );
    expect(removeCard).toHaveBeenCalledWith("card-1", "main");
  });
});
