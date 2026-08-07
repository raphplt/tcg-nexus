import { Rss } from "lucide-react";
import { FeedList } from "./_components/FeedList";

export default function FeedPage() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Rss className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Activité</h1>
          <p className="text-sm text-muted-foreground">
            Decks publiés et tournois rejoints par les joueurs que vous suivez
          </p>
        </div>
      </div>
      <FeedList />
    </main>
  );
}
