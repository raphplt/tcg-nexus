import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import TrainingBoard from "@/components/match/TrainingBoard";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { Button } from "@/components/ui/button";

interface TrainingMatchPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function TrainingMatchPage({
  params,
}: TrainingMatchPageProps) {
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

        <TrainingBoard sessionId={numericSessionId} />
      </div>
    </PageWrapper>
  );
}
