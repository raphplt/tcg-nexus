import { notFound } from "next/navigation";

// sans ce catch-all, une URL inconnue tombe sur le 404 par défaut de Next, non traduit
export default function CatchAllPage() {
  notFound();
}
