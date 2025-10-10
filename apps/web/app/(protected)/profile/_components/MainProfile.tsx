"use client";
import Loader from "@/components/Layout/Loader";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState } from "react";
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
  ShoppingBag,
  Search,
  Eye,
  EyeOff,
  Trash2,
  X as XIcon,
  Euro,
  DollarSign,
  PoundSterling,
} from "lucide-react";
import { marketplaceService } from "@/services/marketplace.service";
import { Listing } from "@/types/listing";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getUserInitials, getRoleBadgeColor, getRoleLabel } from "../utils";

const MainProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      loadMyListings();
    }
  }, [user]);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, statusFilter]);

  const handleEditToggle = () => {
    if (isEditing) {
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

    const loadMyListings = async () => {
    try {
      setSalesLoading(true);
      const data = await marketplaceService.getMyListings();
      setListings(data);
    } catch (error) {
      console.error("Erreur lors du chargement des ventes:", error);
      toast.error("Erreur lors du chargement de vos ventes");
    } finally {
      setSalesLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = listings;

    if (searchTerm) {
      filtered = filtered.filter(
        (listing) =>
          (listing.pokemonCard?.name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ) ||
          (listing.pokemonCard?.set?.name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ),
      );
    }

    if (statusFilter === "active") {
      filtered = filtered.filter((listing) => listing.quantityAvailable > 0);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((listing) => listing.quantityAvailable === 0);
    }

    setFilteredListings(filtered);
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "EUR":
        return <Euro className="w-4 h-4" />;
      case "USD":
        return <DollarSign className="w-4 h-4" />;
      case "GBP":
        return <PoundSterling className="w-4 h-4" />;
      default:
        return <Euro className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (quantity: number) => {
    if (quantity > 0) {
      return <Badge className="bg-green-500 text-white">Actif</Badge>;
    } else {
      return <Badge className="bg-gray-500 text-white">Inactif</Badge>;
    }
  };

  const handleEdit = async (listing: Listing) => {
    try {
      router.push(`/marketplace/${listing.id}/edit`);
    } catch (error) {
      toast.error("Erreur lors de la navigation vers l'édition");
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    try {
      setActionLoading(listing.id);
      const newQuantity = listing.quantityAvailable > 0 ? 0 : 1;

      await marketplaceService.updateListing(listing.id.toString(), {
        quantityAvailable: newQuantity,
      });

      // Mettre à jour la liste locale
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, quantityAvailable: newQuantity } : l,
        ),
      );

      toast.success(
        newQuantity > 0
          ? "Vente réactivée avec succès"
          : "Vente désactivée avec succès",
      );
    } catch (error) {
      toast.error("Erreur lors du changement de statut");
      console.error("Erreur toggle status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) {
      return;
    }

    try {
      setActionLoading(listing.id);
      await marketplaceService.deleteListing(listing.id.toString());

      // Mettre à jour la liste locale
      setListings((prev) => prev.filter((l) => l.id !== listing.id));

      toast.success("Vente supprimée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Erreur suppression:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateFirstSale = () => {
    router.push("/marketplace/create");
  };

  const handleRefreshSales = () => {
    loadMyListings();
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

      {/* Mes tournois */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Mes tournois</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">Spring Championship 2024</span>
                <Badge className="bg-green-500 text-white text-xs">
                  Terminé
                </Badge>
                <Badge className="bg-purple-500 text-white text-xs">
                  Elimination simple
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Paris, France • 15-17 mars 2024
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-green-600">Champion</div>
              <div className="text-sm text-muted-foreground">1er place</div>
              <div className="text-sm font-medium text-green-600">+100 pts</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">Winter Cup 2024</span>
                <Badge className="bg-green-500 text-white text-xs">
                  Terminé
                </Badge>
                <Badge className="bg-teal-500 text-white text-xs">
                  Système suisse
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Lyon, France • 20-21 janvier 2024
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-blue-600">Demi-finaliste</div>
              <div className="text-sm text-muted-foreground">3e place</div>
              <div className="text-sm font-medium text-green-600">+50 pts</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">Regional Qualifier</span>
                <Badge className="bg-green-500 text-white text-xs">
                  Terminé
                </Badge>
                <Badge className="bg-purple-500 text-white text-xs">
                  Elimination simple
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Marseille, France • 10 février 2024
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-orange-600">Finaliste</div>
              <div className="text-sm text-muted-foreground">2e place</div>
              <div className="text-sm font-medium text-green-600">+75 pts</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">Community Tournament</span>
                <Badge className="bg-green-500 text-white text-xs">
                  Terminé
                </Badge>
                <Badge className="bg-orange-500 text-white text-xs">
                  Round robin
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Bordeaux, France • 5 janvier 2024
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-600">
                Quart de finaliste
              </div>
              <div className="text-sm text-muted-foreground">5e place</div>
              <div className="text-sm font-medium text-green-600">+25 pts</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mes ventes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Mes ventes</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{listings.length} ventes</Badge>
              {filteredListings.length !== listings.length && (
                <Badge variant="outline">
                  {filteredListings.length} résultats
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSales}
              disabled={salesLoading}
              title="Actualiser la liste des ventes"
              aria-label="Actualiser la liste des ventes"
            >
              {salesLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              ) : (
                "Actualiser"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateFirstSale}
              title="Créer une nouvelle vente"
              aria-label="Créer une nouvelle vente"
            >
              Créer une vente
            </Button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label
              htmlFor="search"
              className="sr-only"
            >
              Rechercher
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Rechercher par nom de carte ou série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              title="Afficher toutes les ventes"
              aria-label="Afficher toutes les ventes"
            >
              Tous
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              title="Afficher seulement les ventes actives"
              aria-label="Afficher seulement les ventes actives"
            >
              Actifs
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("inactive")}
              title="Afficher seulement les ventes inactives"
              aria-label="Afficher seulement les ventes inactives"
            >
              Inactifs
            </Button>
          </div>
        </div>

        {salesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Chargement de vos ventes...
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {listings.length === 0
                ? "Vous n'avez pas encore créé de ventes"
                : "Aucune vente ne correspond à vos critères"}
            </p>
            {listings.length === 0 ? (
              <div className="space-y-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Commencez par vendre vos cartes Pokémon !
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Créez votre première vente pour commencer à gagner de
                    l'argent avec votre collection
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={handleCreateFirstSale}
                    className="px-6"
                  >
                    Créer ma première vente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Aucune vente ne correspond à vos critères de recherche
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-lg">
                        {listing.pokemonCard?.name || "N/A"}
                      </span>
                      {getStatusBadge(listing.quantityAvailable)}
                      <Badge variant="outline">{listing.cardState}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <span>
                          Set: {listing.pokemonCard?.set?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>État: {listing.cardState}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <div className="flex items-center space-x-1">
                        {getCurrencyIcon(listing.currency)}
                        <span className="font-medium">{listing.price}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span
                          className={
                            listing.quantityAvailable > 0
                              ? "text-green-600"
                              : "text-gray-500"
                          }
                        >
                          Quantité: {listing.quantityAvailable}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>
                          Créé le:{" "}
                          {new Date(listing.createdAt).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {listing.expiresAt && (
                        <div className="flex items-center space-x-1">
                          <span className="text-orange-600">
                            Expire le:{" "}
                            {new Date(listing.expiresAt).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(listing)}
                      className="h-8 w-8 p-0"
                      disabled={actionLoading === listing.id}
                      title="Modifier cette vente"
                      aria-label="Modifier cette vente"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(listing)}
                      className="h-8 w-8 p-0"
                      disabled={actionLoading === listing.id}
                      title={
                        listing.quantityAvailable > 0
                          ? "Désactiver cette vente"
                          : "Réactiver cette vente"
                      }
                      aria-label={
                        listing.quantityAvailable > 0
                          ? "Désactiver cette vente"
                          : "Réactiver cette vente"
                      }
                    >
                      {actionLoading === listing.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      ) : listing.quantityAvailable > 0 ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(listing)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={actionLoading === listing.id}
                      title="Supprimer cette vente"
                      aria-label="Supprimer cette vente"
                    >
                      {actionLoading === listing.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MainProfile;
