"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  SanitizedHandCardView,
  SanitizedPokemonCardView,
  SanitizedPlayerView,
} from "@/types/match-online";
import type { MatchBoardActionInput } from "@/components/match/MatchBoardView";

export type InteractionMode =
  | "idle"
  | "placing_pokemon"
  | "attaching_energy"
  | "evolving"
  | "playing_trainer"
  | "choosing_attack"
  | "retreating";

interface InteractionState {
  mode: InteractionMode;
  selectedHandCard: SanitizedHandCardView | null;
  hintText: string | null;
}

const INITIAL_STATE: InteractionState = {
  mode: "idle",
  selectedHandCard: null,
  hintText: null,
};

export function useGameBoardInteraction(
  viewer: SanitizedPlayerView | null,
  canAct: boolean,
  onDispatchAction: (action: MatchBoardActionInput) => void,
) {
  const [state, setState] = useState<InteractionState>(INITIAL_STATE);

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const selectHandCard = useCallback(
    (card: SanitizedHandCardView) => {
      if (!canAct) return;

      // Toggle off if same card
      if (state.selectedHandCard?.instanceId === card.instanceId) {
        cancel();
        return;
      }

      if (card.category === "Pokémon" && card.stage === "De base") {
        setState({
          mode: "placing_pokemon",
          selectedHandCard: card,
          hintText: "Cliquez sur un emplacement du banc pour jouer ce Pokémon.",
        });
      } else if (card.category === "Énergie") {
        setState({
          mode: "attaching_energy",
          selectedHandCard: card,
          hintText: "Cliquez sur un Pokémon pour attacher cette énergie.",
        });
      } else if (card.category === "Pokémon" && card.stage !== "De base") {
        setState({
          mode: "evolving",
          selectedHandCard: card,
          hintText: "Cliquez sur le Pokémon à faire évoluer.",
        });
      } else if (card.category === "Dresseur") {
        // Trainers are played immediately
        onDispatchAction({
          type: "PLAY_TRAINER",
          payload: { trainerCardInstanceId: card.instanceId },
        });
        cancel();
      }
    },
    [canAct, state.selectedHandCard, cancel, onDispatchAction],
  );

  const selectTarget = useCallback(
    (targetInstanceId: string) => {
      if (!state.selectedHandCard) return;

      switch (state.mode) {
        case "placing_pokemon":
          onDispatchAction({
            type: "PLAY_POKEMON_TO_BENCH",
            payload: { cardInstanceId: state.selectedHandCard.instanceId },
          });
          break;
        case "attaching_energy":
          onDispatchAction({
            type: "ATTACH_ENERGY",
            payload: {
              energyCardInstanceId: state.selectedHandCard.instanceId,
              targetPokemonInstanceId: targetInstanceId,
            },
          });
          break;
        case "evolving":
          onDispatchAction({
            type: "EVOLVE_POKEMON",
            payload: {
              evolutionCardInstanceId: state.selectedHandCard.instanceId,
              targetPokemonInstanceId: targetInstanceId,
            },
          });
          break;
      }
      cancel();
    },
    [state, onDispatchAction, cancel],
  );

  const openAttackPanel = useCallback(() => {
    if (!canAct) return;
    setState({
      mode: "choosing_attack",
      selectedHandCard: null,
      hintText: "Choisissez une attaque.",
    });
  }, [canAct]);

  const closeAttackPanel = useCallback(() => {
    cancel();
  }, [cancel]);

  const dispatchAttack = useCallback(
    (attackIndex: number) => {
      onDispatchAction({ type: "ATTACK", payload: { attackIndex } });
      cancel();
    },
    [onDispatchAction, cancel],
  );

  const dispatchRetreat = useCallback(
    (benchPokemonInstanceId: string, discardedEnergyInstanceIds: string[]) => {
      onDispatchAction({
        type: "RETREAT",
        payload: { benchPokemonInstanceId, discardedEnergyInstanceIds },
      });
      cancel();
    },
    [onDispatchAction, cancel],
  );

  // Compute valid target IDs for highlighting
  const validTargetIds = useMemo<string[]>(() => {
    if (!viewer) return [];

    switch (state.mode) {
      case "placing_pokemon":
        // Bench slots (or active if empty)
        return ["empty_bench"];
      case "attaching_energy":
        // All own pokemon
        return [
          ...(viewer.active ? [viewer.active.instanceId] : []),
          ...viewer.bench.map((p) => p.instanceId),
        ];
      case "evolving":
        // Pokemon that can evolve
        return [
          ...(viewer.active ? [viewer.active.instanceId] : []),
          ...viewer.bench.map((p) => p.instanceId),
        ];
      default:
        return [];
    }
  }, [viewer, state.mode]);

  return {
    ...state,
    validTargetIds,
    selectHandCard,
    selectTarget,
    openAttackPanel,
    closeAttackPanel,
    dispatchAttack,
    dispatchRetreat,
    cancel,
  };
}
