import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Mail, Calendar, Edit3, Save, X } from "lucide-react";
import { User } from "@/types/auth";

interface ProfileHeaderProps {
  user: User;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

export const ProfileHeader = ({
  user,
  isEditing,
  onEditToggle,
  onSave,
}: ProfileHeaderProps) => {
  const getUserInitials = (firstName: string, lastName: string) => {
    return (
      `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U"
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500 text-white";
      case "moderator":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrateur";
      case "moderator":
        return "Modérateur";
      default:
        return "Utilisateur";
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-background to-muted/20 border-l-4 border-l-primary shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 w-full">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md">
            <AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {getUserInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {user.firstName} {user.lastName}
              </h1>
              <Badge className={`${getRoleBadgeColor(user.role)} shadow-sm`}>
                <Shield className="w-3 h-3 mr-1" />
                {getRoleLabel(user.role)}
              </Badge>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4 text-muted-foreground text-sm">
              <div className="flex items-center space-x-1.5">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="hidden md:block text-muted-foreground/30">•</div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4" />
                <span>Membre depuis janvier 2024</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
          <Button
            onClick={isEditing ? onSave : onEditToggle}
            className="space-x-2 min-w-[140px]"
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Modifier profil</span>
              </>
            )}
          </Button>

          {isEditing && (
            <Button variant="ghost" size="icon" onClick={onEditToggle}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
