import { permanentRedirect } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

/**
 * La fiche carte a été fusionnée avec la page marketplace, orientée vente.
 * On conserve l'ancienne URL pour ne pas casser les liens existants.
 */
export default async function PokemonCardRedirectPage({ params }: PageProps) {
  const { id, locale } = await params;
  permanentRedirect({ href: `/marketplace/cards/${id}`, locale });
}
