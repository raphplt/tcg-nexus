"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  SanitizedHandCardView,
  SanitizedPokemonCardView,
  SanitizedPlayerView,
} from "@/types/match-online";
import type { MatchBoardActionInput } from "@/components/match/board/types";

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

/**
 * Drives board interactions (select a card, then pick its target).
 *
 * @param viewer - Sanitized state of the player using the board.
 * @param canAct - Whether the player is currently allowed to act.
 * @param onDispatchAction - Callback used to send the resulting action.
 * @param t - Translator used for the contextual hints.
 */
export function useGameBoardInteraction(
  viewer: SanitizedPlayerView | null,
  canAct: boolean,
  onDispatchAction: (action: MatchBoardActionInput) => void,
  t: (key: string) => string,
) {
  const [state, setState] = useState<InteractionState>(INITIAL_STATE);

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const selectHandCard = useCallback(
    (card: SanitizedHandCardView) => {
      if (!canAct) return;

      if (state.selectedHandCard?.instanceId === card.instanceId) {
        cancel();
        return;
      }

      if (card.category === "Pokémon" && card.stage === "De base") {
        setState({
          mode: "placing_pokemon",
          selectedHandCard: card,
          hintText: t("hintPlacePokemon"),
        });
      } else if (card.category === "Énergie") {
        setState({
          mode: "attaching_energy",
          selectedHandCard: card,
          hintText: t("hintAttachEnergy"),
        });
      } else if (card.category === "Pokémon" && card.stage !== "De base") {
        setState({
          mode: "evolving",
          selectedHandCard: card,
          hintText: t("hintEvolve"),
        });
      } else if (card.category === "Dresseur") {
        onDispatchAction({
          type: "PLAY_TRAINER",
          payload: { trainerCardInstanceId: card.instanceId },
        });
        cancel();
      }
    },
    [canAct, state.selectedHandCard, cancel, onDispatchAction, t],
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
      hintText: t("hintChooseAttack"),
    });
  }, [canAct, t]);

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

  const validTargetIds = useMemo<string[]>(() => {
    if (!viewer) return [];

    switch (state.mode) {
      case "placing_pokemon":
        return ["empty_bench"];
      case "attaching_energy":
        return [
          ...(viewer.active ? [viewer.active.instanceId] : []),
          ...viewer.bench.map((p) => p.instanceId),
        ];
      case "evolving":
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
