import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import CasualGameBoard from "@/components/match/CasualGameBoard";
import { Button } from "@/components/ui/button";

interface CasualMatchPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function CasualMatchPage({
  params,
}: CasualMatchPageProps) {
  const { sessionId } = await params;
  const numericSessionId = Number(sessionId);

  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    notFound();
  }

  return (
    <PageWrapper maxWidth="xl" gradient="none" className="tcg-page--play">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/play">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à Jouer
            </Link>
          </Button>
        </div>

        <CasualGameBoard sessionId={numericSessionId} />
      </div>
    </PageWrapper>
  );
}
