import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { decksService } from "@/services/decks.service";

export const SAVED_DECK_IDS_KEY = ["saved-deck-ids"] as const;

export function useSavedDeckIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: SAVED_DECK_IDS_KEY,
    queryFn: () => decksService.getSavedDeckIds(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useToggleSavedDeck() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SAVED_DECK_IDS_KEY });
    queryClient.invalidateQueries({ queryKey: ["saved-decks"] });
  };

  const saveMutation = useMutation({
    mutationFn: (deckId: number) => decksService.saveDeckToLibrary(deckId),
    onMutate: async (deckId: number) => {
      await queryClient.cancelQueries({ queryKey: SAVED_DECK_IDS_KEY });
      const previous =
        queryClient.getQueryData<number[]>(SAVED_DECK_IDS_KEY) ?? [];
      queryClient.setQueryData<number[]>(
        SAVED_DECK_IDS_KEY,
        previous.includes(deckId) ? previous : [...previous, deckId],
      );
      return { previous };
    },
    onError: (_err, _deckId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SAVED_DECK_IDS_KEY, context.previous);
      }
      toast.error("Impossible d'ajouter ce deck à votre bibliothèque");
    },
    onSuccess: () => {
      toast.success("Deck ajouté à votre bibliothèque");
    },
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (deckId: number) => decksService.removeDeckFromLibrary(deckId),
    onMutate: async (deckId: number) => {
      await queryClient.cancelQueries({ queryKey: SAVED_DECK_IDS_KEY });
      const previous =
        queryClient.getQueryData<number[]>(SAVED_DECK_IDS_KEY) ?? [];
      queryClient.setQueryData<number[]>(
        SAVED_DECK_IDS_KEY,
        previous.filter((id) => id !== deckId),
      );
      return { previous };
    },
    onError: (_err, _deckId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SAVED_DECK_IDS_KEY, context.previous);
      }
      toast.error("Impossible de retirer ce deck de votre bibliothèque");
    },
    onSuccess: () => {
      toast.success("Deck retiré de votre bibliothèque");
    },
    onSettled: invalidate,
  });

  return {
    save: (deckId: number) => saveMutation.mutate(deckId),
    remove: (deckId: number) => removeMutation.mutate(deckId),
    isPending: saveMutation.isPending || removeMutation.isPending,
  };
}
