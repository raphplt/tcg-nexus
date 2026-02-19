"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users,
  Mail,
  Bell,
  UserCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Organizer, Notification } from "@/types/tournament";

interface TabOrganizersProps {
  organizers: Organizer[];
  notifications: Notification[];
}

const notificationStatusConfig: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  sent: {
    icon: <CheckCircle2 className="size-3" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  pending: {
    icon: <Clock className="size-3" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  failed: {
    icon: <AlertCircle className="size-3" />,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function TabOrganizers({
  organizers,
  notifications,
}: TabOrganizersProps) {
  return (
    <div className="space-y-6">
      {/* Organisateurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-primary" />
            Équipe d'organisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organizers && organizers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizers.map((organizer) => (
                <div
                  key={organizer.id}
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border"
                >
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {organizer.name?.slice(0, 2)?.toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">
                        {organizer.name}
                      </h4>
                      {organizer.role && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {organizer.role}
                        </Badge>
                      )}
                    </div>
                    {organizer.email && (
                      <a
                        href={`mailto:${organizer.email}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
                      >
                        <Mail className="size-3" />
                        <span className="truncate">{organizer.email}</span>
                      </a>
                    )}
                  </div>
                  {organizer.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`mailto:${organizer.email}`}>
                        <MessageSquare className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCircle className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Aucun organisateur renseigné pour ce tournoi.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="size-5 text-primary" />
            Notifications & Annonces
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const status =
                  notificationStatusConfig[notification.status || "sent"] ??
                  notificationStatusConfig.sent;
                return (
                  <div
                    key={notification.id}
                    className="p-4 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {notification.title}
                          </h4>
                          {notification.type && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {notification.message}
                          </p>
                        )}
                      </div>
                      {notification.status && status && (
                        <Badge
                          variant="outline"
                          className={`gap-1 shrink-0 ${status.color}`}
                        >
                          {status.icon}
                          <span className="capitalize">
                            {notification.status}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Aucune notification pour le moment.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Les annonces des organisateurs apparaîtront ici.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="size-5 text-primary" />
            Besoin d'aide ?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Si vous avez des questions concernant ce tournoi, n'hésitez pas à
            contacter l'équipe d'organisation.
          </p>
          {organizers && organizers.length > 0 && organizers[0]?.email ? (
            <Button asChild>
              <a href={`mailto:${organizers[0].email}`}>
                <Mail className="size-4 mr-2" />
                Contacter les organisateurs
              </a>
            </Button>
          ) : (
            <Button disabled>
              <Mail className="size-4 mr-2" />
              Contact non disponible
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
