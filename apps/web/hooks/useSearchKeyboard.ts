import { useEffect } from "react";

type UseSearchKeyboardOptions = {
  isOpen: boolean;
  itemCount: number;
  selectedIndex: number;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (index: number) => void;
  onSelectedIndexChange: (index: number) => void;
};

// Gère tous les raccourcis clavier de la barre de recherche globale :
// - Cmd/Ctrl+K et "/" pour ouvrir
// - Escape pour fermer
// - ArrowUp/ArrowDown pour naviguer dans la liste courante
// - Enter pour valider la sélection
export function useSearchKeyboard({
  isOpen,
  itemCount,
  selectedIndex,
  onOpen,
  onClose,
  onSelect,
  onSelectedIndexChange,
}: UseSearchKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
        return;
      }

      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        onOpen();
        return;
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelectedIndexChange(Math.min(selectedIndex + 1, itemCount - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (itemCount > 0) onSelect(selectedIndex);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    itemCount,
    selectedIndex,
    onOpen,
    onClose,
    onSelect,
    onSelectedIndexChange,
  ]);
}
