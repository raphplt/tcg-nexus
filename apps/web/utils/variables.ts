import { CardState } from "./enums";

export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

export const cardStates = [
  { label: "Near Mint", value: CardState.NM },
  { label: "Excellent", value: CardState.EX },
  { label: "Good", value: CardState.GD },
  { label: "Lightly Played", value: CardState.LP },
  { label: "Played", value: CardState.PL },
  { label: "Poor", value: CardState.Poor },
];

export const languages = [
  { label: "Anglais", value: "en" },
  { label: "Français", value: "fr" },
  { label: "Allemand", value: "de" },
  { label: "Espagnol", value: "es" },
  { label: "Italien", value: "it" },
  { label: "Portugais", value: "pt" },
  { label: "Japonais", value: "ja" },
  { label: "Coréen", value: "ko" },
  { label: "Chinois Simplifié", value: "zh-CN" },
  { label: "Chinois Traditionnel", value: "zh-TW" },
];

export const currencyOptions = [
  { label: "Euro", value: "EUR" },
  { label: "Dollar Américain", value: "USD" },
  { label: "Livre Sterling", value: "GBP" },
  { label: "Yen Japonais", value: "JPY" },
  { label: "Franc Suisse", value: "CHF" },
  { label: "Dollar Canadien", value: "CAD" },
];
