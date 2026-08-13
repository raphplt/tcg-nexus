import type { SupportedLocale } from "@/i18n/config";
import { permanentRedirect } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ id: string; locale: SupportedLocale }>;
}

/**
 * The card page was merged into the sales-oriented marketplace page.
 * The legacy URL is retained to preserve existing links.
 */
export default async function PokemonCardRedirectPage({ params }: PageProps) {
  const { id, locale } = await params;
  permanentRedirect({ href: `/marketplace/cards/${id}`, locale });
}
