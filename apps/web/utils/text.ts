import { Rarity } from "@/types/listing";

export const slugify = (text: string) => {
  return text.toLowerCase().replace(/ /g, "_");
};

export const getUserInitials = (firstName: string, lastName: string) =>
  `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
  "U";

export const getUserDisplayName = (firstName: string, lastName: string) =>
  `${firstName} ${lastName}`.trim() || "Utilisateur";
