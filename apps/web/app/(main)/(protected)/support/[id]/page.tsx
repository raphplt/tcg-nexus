"use client";

import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@components/Shared/Titles";
import { Button } from "@components/ui/button";
import { Card, CardContent, CardHeader } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Skeleton } from "@components/ui/skeleton";
import { Textarea } from "@components/ui/textarea";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Send,
  Lock,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supportTicketService } from "@/services/support-ticket.service";
import {
  SupportTicketWithMessages,
  SupportTicketMessage,
} from "@/types/support-ticket";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const data = await supportTicketService.getById(id);
      setTicket(data);
    } catch (error) {
      console.error("Failed to load ticket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const message = await supportTicketService.createMessage(id, {
        message: newMessage.trim(),
      });
      setTicket((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, message] }
          : prev,
      );
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await supportTicketService.closeTicket(id);
      setTicket((prev) => (prev ? { ...prev, status: "closed" } : prev));
    } catch (error) {
      console.error("Failed to close ticket:", error);
    } finally {
      setIsClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <PageWrapper gradient="secondary" maxWidth="lg">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (!ticket) {
    return (
      <PageWrapper gradient="secondary" maxWidth="lg">
        <div className="text-center space-y-4 py-16">
          <p className="text-muted-foreground">Ticket introuvable.</p>
          <Button variant="outline" asChild>
            <Link href="/support">Retour au support</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <PageWrapper gradient="secondary" maxWidth="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/support">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          {!isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isClosing}
            >
              <Lock className="w-4 h-4 mr-2" />
              {isClosing ? "Fermeture..." : "Fermer le ticket"}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-4">
            <div>
              <H1 variant="primary" className="text-2xl">
                {ticket.subject}
              </H1>
              <p className="text-sm text-muted-foreground mt-1">
                Ticket #{ticket.id} &middot; Créé le{" "}
                {new Date(ticket.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
              {ticket.messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun message pour le moment.
                </p>
              ) : (
                ticket.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.user?.id === user?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isClosed ? (
              <div className="border-t p-4 flex gap-3">
                <Textarea
                  placeholder="Votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[120px]"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                  className="shrink-0 self-end h-10 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-t p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Ce ticket est fermé. Vous ne pouvez plus envoyer de messages.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: SupportTicketMessage;
  isOwn: boolean;
}) {
  const displayName = message.user
    ? `${message.user.firstName} ${message.user.lastName}`
    : "Utilisateur";

  return (
    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          message.isStaff
            ? "bg-green-500/10 text-green-600"
            : "bg-primary/10 text-primary",
        )}
      >
        {message.isStaff ? (
          <ShieldCheck className="w-4 h-4" />
        ) : (
          <UserIcon className="w-4 h-4" />
        )}
      </div>

      <div className={cn("max-w-[75%] space-y-1", isOwn && "text-right")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {message.isStaff ? `${displayName} (Staff)` : displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm inline-block text-left",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted",
          )}
        >
          <p className="whitespace-pre-wrap">{message.message}</p>
        </div>
      </div>
    </div>
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
