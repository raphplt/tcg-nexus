"use client";
import Loader from "@/components/Layout/Loader";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Edit3,
  Save,
  X,
  Trophy,
  Target,
  Calendar,
  Shield,
  Star,
} from "lucide-react";

const MainProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // Initialiser le formulaire avec les données utilisateur
  React.useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user]);

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

  const handleEditToggle = () => {
    if (isEditing) {
      // Annuler les modifications
      if (user) {
        setEditForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // TODO: Implémenter la sauvegarde des modifications
    console.log("Sauvegarde des modifications:", editForm);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Vous devez être connecté pour accéder à votre profil
          </h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* En-tête du profil */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src=""
                alt={`${user.firstName} ${user.lastName}`}
              />
              <AvatarFallback className="text-2xl">
                {getUserInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <Badge className={getRoleBadgeColor(user.role)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getRoleLabel(user.role)}
                </Badge>
              </div>

              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>

              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Membre depuis janvier 2024</span>
              </div>
            </div>
          </div>

          <Button
            onClick={isEditing ? handleSave : handleEditToggle}
            className="space-x-2"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Modifier</span>
              </>
            )}
          </Button>

          {isEditing && (
            <Button
              variant="outline"
              onClick={handleEditToggle}
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations personnelles */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <User className="w-5 h-5" />
              <h2 className="text-xl font-semibold">
                Informations personnelles
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {user.firstName}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {user.lastName}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-muted rounded-md">
                    {user.email}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="role">Rôle</Label>
                <div className="mt-1 p-2 bg-muted rounded-md">
                  {getRoleLabel(user.role)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Trophy className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Statistiques</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Tournois participés
                </span>
                <span className="font-semibold">12</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Victoires</span>
                <span className="font-semibold text-green-600">8</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Défaites</span>
                <span className="font-semibold text-red-600">4</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taux de victoire</span>
                <span className="font-semibold">66.7%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Récompenses</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">Champion régional 2024</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-silver-500 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">10 victoires consécutives</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Activité récente */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span>
              Participation au tournoi &ldquo;Spring Championship&rdquo;
            </span>
            <span className="text-muted-foreground text-sm">
              Il y a 2 jours
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span>Victoire contre Jean Dupont</span>
            <span className="text-muted-foreground text-sm">
              Il y a 1 semaine
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span>Nouveau deck créé : &ldquo;Dragon Rush&rdquo;</span>
            <span className="text-muted-foreground text-sm">
              Il y a 2 semaines
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MainProfile;
