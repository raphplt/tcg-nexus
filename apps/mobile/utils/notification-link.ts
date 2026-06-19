export function resolveDeepLink(
  link: string | undefined | null,
): string | null {
  if (!link || typeof link !== "string") {
    return null;
  }

  const tournamentMatch = link.match(/^\/tournaments\/(\d+)(?:\/.*)?$/);
  if (tournamentMatch) {
    return `/(protected)/(tabs)/tournaments/${tournamentMatch[1]}`;
  }

  if (link === "/profile") {
    return "/(protected)/(tabs)/profile";
  }

  return null;
}
