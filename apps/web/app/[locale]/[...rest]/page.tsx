import { notFound } from "next/navigation";

// NOTE: This fallback exists so unknown localized paths render the translated
// not-found page instead of the built-in Next.js one. It must stay dynamic:
// if it is prerendered, a 404 produced while the route manifest is still being
// rebuilt gets cached under a real route's pathname and is then served on every
// subsequent request until the cache is invalidated.
export const dynamic = "force-dynamic";

export default function CatchAllPage() {
  notFound();
}
