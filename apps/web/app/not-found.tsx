import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold font-heading text-primary">404</h1>
          <h2 className="text-2xl font-bold font-heading">
            Page introuvable
          </h2>
          <p className="text-muted-foreground">
            La page que vous recherchez n&apos;existe pas ou a ete deplacee.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Retour a l&apos;accueil
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pokemon">
              <Search className="mr-2 h-4 w-4" />
              Explorer les cartes
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
