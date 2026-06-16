const LEGACY_R2_HOSTS = ["pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev"];
const PLACEHOLDER_CARD = "https://tcg-nexus.org/placeholder.png";

export function rewriteLegacyHost(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  const next = url.trim();
  if (!next) return undefined;
  for (const host of LEGACY_R2_HOSTS) {
    if (next.includes(host)) {
      return next.replace(host, "cdn.tcg-nexus.org");
    }
  }
  return next;
}

export function getCardImage(
  image: string | null | undefined,
  quality: "high" | "low" = "high",
): string {
  if (!image) {
    return PLACEHOLDER_CARD;
  }

  const base = rewriteLegacyHost(image);
  if (!base) return PLACEHOLDER_CARD;

  // Si l'image possède déjà une extension, on ne rajoute pas le /high.png
  if (base.match(/\.(png|jpg|jpeg|webp)$/i)) {
    return base.startsWith("http") ? base : `https://tcg-nexus.org${base}`;
  }

  const suffix = quality === "low" ? "/low" : "/high";
  const finalUrl = `${base}${suffix}.png`;

  return finalUrl.startsWith("http") ? finalUrl : `https://tcg-nexus.org${finalUrl}`;
}
