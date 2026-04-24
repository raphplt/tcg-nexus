import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchKeyboard } from "@/hooks/useSearchKeyboard";

type Handlers = {
  onOpen: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
  onSelect: ReturnType<typeof vi.fn>;
  onSelectedIndexChange: ReturnType<typeof vi.fn>;
};

const setup = (
  overrides: Partial<Parameters<typeof useSearchKeyboard>[0]> = {},
) => {
  const handlers: Handlers = {
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onSelectedIndexChange: vi.fn(),
  };

  renderHook(() =>
    useSearchKeyboard({
      isOpen: false,
      itemCount: 0,
      selectedIndex: 0,
      ...handlers,
      ...overrides,
    }),
  );

  return handlers;
};

const dispatch = (init: KeyboardEventInit) => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", init));
  });
};

describe("useSearchKeyboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ouvre la recherche avec Cmd+K", () => {
    const handlers = setup();
    dispatch({ key: "k", metaKey: true });
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  it("ouvre la recherche avec Ctrl+K", () => {
    const handlers = setup();
    dispatch({ key: "k", ctrlKey: true });
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  it("ouvre la recherche avec '/' quand elle est fermée", () => {
    const handlers = setup({ isOpen: false });
    dispatch({ key: "/" });
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  it("n'intercepte pas '/' quand la recherche est déjà ouverte (permet de taper)", () => {
    const handlers = setup({ isOpen: true, itemCount: 3 });
    dispatch({ key: "/" });
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("ferme la recherche avec Escape quand elle est ouverte", () => {
    const handlers = setup({ isOpen: true });
    dispatch({ key: "Escape" });
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it("ignore les raccourcis de navigation quand la recherche est fermée", () => {
    const handlers = setup({ isOpen: false, itemCount: 5 });
    dispatch({ key: "ArrowDown" });
    dispatch({ key: "Enter" });
    expect(handlers.onSelectedIndexChange).not.toHaveBeenCalled();
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it("incrémente l'index sélectionné sur ArrowDown sans dépasser la fin", () => {
    const handlers = setup({ isOpen: true, itemCount: 3, selectedIndex: 2 });
    dispatch({ key: "ArrowDown" });
    // déjà sur le dernier index (2 = 3 - 1), on reste à 2
    expect(handlers.onSelectedIndexChange).toHaveBeenCalledWith(2);
  });

  it("décrémente l'index sélectionné sur ArrowUp sans passer en négatif", () => {
    const handlers = setup({ isOpen: true, itemCount: 3, selectedIndex: 0 });
    dispatch({ key: "ArrowUp" });
    expect(handlers.onSelectedIndexChange).toHaveBeenCalledWith(0);
  });

  it("valide la sélection sur Enter quand il y a des items", () => {
    const handlers = setup({ isOpen: true, itemCount: 2, selectedIndex: 1 });
    dispatch({ key: "Enter" });
    expect(handlers.onSelect).toHaveBeenCalledWith(1);
  });

  it("ignore Enter quand la liste est vide", () => {
    const handlers = setup({ isOpen: true, itemCount: 0, selectedIndex: 0 });
    dispatch({ key: "Enter" });
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });
});
