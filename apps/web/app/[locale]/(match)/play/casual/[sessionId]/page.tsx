import { notFound } from "next/navigation";
import CasualGameBoard from "@/components/match/CasualGameBoard";

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

  return <CasualGameBoard sessionId={numericSessionId} />;
}
