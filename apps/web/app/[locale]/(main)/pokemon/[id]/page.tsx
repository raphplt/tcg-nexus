import { permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * La fiche carte a été fusionnée avec la page marketplace, orientée vente.
 * On conserve l'ancienne URL pour ne pas casser les liens existants.
 */
export default async function PokemonCardRedirectPage({ params }: PageProps) {
  const { id } = await params;
  permanentRedirect(`/marketplace/cards/${id}`);
}
