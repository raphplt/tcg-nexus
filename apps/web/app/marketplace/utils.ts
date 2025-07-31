import { CardState } from "@/utils/enums";

export const getCardStateColor = (cardState: CardState) => {
  switch (cardState) {
    case CardState.NM:
      return "bg-green-500";
    case CardState.EX:
      return "bg-yellow-500";
    case CardState.GD:
      return "bg-red-500";
    case CardState.LP:
      return "bg-blue-500";
    case CardState.PL:
      return "bg-purple-500";
    case CardState.Poor:
  }
};
