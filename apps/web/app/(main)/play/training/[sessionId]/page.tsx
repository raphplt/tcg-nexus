import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import TrainingBoard from "@/components/match/TrainingBoard";
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
      <TrainingBoard sessionId={numericSessionId} />
    </PageWrapper>
  );
}
