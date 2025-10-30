import { CardState } from "@/utils/enums";

export const getCardStateColor = (cardState: string) => {
  switch (cardState) {
    case CardState.NM:
    case "NM":
      return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
    case CardState.EX:
    case "EX":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case CardState.GD:
    case "GD":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case CardState.LP:
    case "LP":
      return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case CardState.PL:
    case "PL":
      return "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30";
    case CardState.Poor:
    case "Poor":
      return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};
