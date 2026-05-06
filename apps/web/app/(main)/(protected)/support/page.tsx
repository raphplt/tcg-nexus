"use client";

import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@components/Shared/Titles";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Skeleton } from "@components/ui/skeleton";
import { EmptyState } from "@components/Shared/EmptyState";
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supportTicketService } from "@/services/support-ticket.service";
import { SupportTicket } from "@/types/support-ticket";
import { PaginatedResult } from "@/types/pagination";

export default function SupportPage() {
  const [data, setData] = useState<PaginatedResult<SupportTicket> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    supportTicketService
      .getPaginated({ page, limit: 20 })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <PageWrapper gradient="secondary">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <H1 variant="primary">Support</H1>
            <p className="text-muted-foreground">
              Besoin d&apos;aide ? Créez un ticket et notre équipe vous
              répondra.
            </p>
          </div>
          <Button asChild>
            <Link href="/support/create">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau ticket
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucun ticket"
            description="Vous n'avez pas encore créé de ticket de support."
            action={{ label: "Créer un ticket", href: "/support/create" }}
          />
        ) : (
          <div className="space-y-3">
            {data.data.map((ticket) => (
              <Link key={ticket.id} href={`/support/${ticket.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-3">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{ticket.subject}</p>
                          <TicketStatusBadge status={ticket.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          #{ticket.id} &middot; Créé le{" "}
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}

            {data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précédent
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  Page {page} / {data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function TicketStatusBadge({ status }: { status: string }) {
  if (status === "closed") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Fermé
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1">
      <Clock className="w-3 h-3" />
      Ouvert
    </Badge>
  );
}
