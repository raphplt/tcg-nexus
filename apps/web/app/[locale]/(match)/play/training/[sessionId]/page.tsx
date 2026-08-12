import { notFound } from "next/navigation";
import TrainingBoard from "@/components/match/TrainingBoard";

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

  return <TrainingBoard sessionId={numericSessionId} />;
}
