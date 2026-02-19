"use client";

import React, { useEffect, useState } from "react";
import { collectionService } from "@/services/collection.service";
import { Collection } from "@/types/collection";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@/components/Shared/Titles";
import { useRouter } from "next/navigation";
import { Search, Plus, Heart, Eye, Users, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CreateCollection from "./_components/CreateCollection";
import Image from "next/image";
import { getCardImage } from "@/utils/images";

const Page = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchCollections = async () => {
      if (!user?.id) {
        console.error("User ID is not available");
        setLoading(false);
        return;
      }

      try {
        const result = await collectionService.getByUserId(user.id);

        const collectionsData = Array.isArray(result)
          ? result
          : result.data || [];
        setCollections(collectionsData);
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [user?.id]);

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const refreshCollections = async () => {
    if (!user?.id) return;

    try {
      const result = await collectionService.getByUserId(user.id);
      const collectionsData = Array.isArray(result)
        ? result
        : result.data || [];
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error refreshing collections:", error);
    }
  };

  if (loading) {
    return (
      <PageWrapper gradient="secondary">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Chargement de vos collections...
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const onPressCardSwipe = () => {
    router.push("/pokemon/smash-or-pass");
  };

  return (
    <PageWrapper gradient="secondary">
      <div className="text-center mb-12">
          <H1
            className="mb-4"
            variant="primary"
          >
            Mes Collections
          </H1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Gérez vos collections de cartes Pokémon et découvrez de nouvelles
            cartes avec notre fonctionnalité de swipe
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              variant="default"
              size="lg"
              className="discovery-button bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
              onClick={onPressCardSwipe}
            >
              <Heart className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Card Discovery
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                Nouveau
              </span>
            </Button>

            <CreateCollection onCollectionCreated={refreshCollections} />
          </div>

          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher une collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-10 pr-4 py-3 border-2 border-border/50 focus:border-primary/50 rounded-lg bg-background/80 backdrop-blur-sm"
            />
          </div>
        </div>

        {filteredCollections.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-12 max-w-md mx-auto border border-border/50">
              <div className="empty-state-icon w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery
                  ? "Aucune collection trouvée"
                  : "Aucune collection"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Essayez avec d'autres mots-clés"
                  : "Créez votre première collection pour commencer"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollections.map((collection) => {
              const image1 = getCardImage(collection.items[0]?.pokemonCard);
              const image2 = getCardImage(collection.items[1]?.pokemonCard);
              const image3 = getCardImage(collection.items[2]?.pokemonCard);

              return (
                <Card
                  key={collection.id}
                  className="collection-grid-item collection-card group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-xl overflow-hidden"
                  onClick={() => router.push(`/collection/${collection.id}`)}
                >
                  <div className="collection-card-preview relative h-32 bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
                    {collection.items.length > 0 ? (
                      <div className="flex gap-2 justify-center items-center h-full">
                        <Image
                          src={image1}
                          alt={
                            collection.items[0]?.pokemonCard?.name ||
                            "Carte Pokémon"
                          }
                          width={100}
                          height={100}
                          className="object-contain rounded-lg shadow-lg w-16 h-20"
                        />
                        <Image
                          src={image2}
                          alt={
                            collection.items[1]?.pokemonCard?.name ||
                            "Carte Pokémon"
                          }
                          width={100}
                          height={100}
                          className="object-contain rounded-lg shadow-lg w-16 h-20"
                        />
                        <Image
                          src={image3}
                          alt={
                            collection.items[2]?.pokemonCard?.name ||
                            "Carte Pokémon"
                          }
                          width={100}
                          height={100}
                          className="object-contain rounded-lg shadow-lg w-16 h-20"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center items-center h-full">
                        <div className="card-preview-placeholder w-12 h-16 bg-primary/20 rounded border-2 border-dashed border-primary/40 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-primary/60" />
                        </div>
                        <div className="card-preview-placeholder w-12 h-16 bg-secondary/20 rounded border-2 border-dashed border-secondary/40 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-secondary/60" />
                        </div>
                        <div className="card-preview-placeholder w-12 h-16 bg-accent/20 rounded border-2 border-dashed border-accent/40 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-accent/60" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={collection.isPublic ? "default" : "secondary"}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {collection.isPublic ? "Public" : "Privé"}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {collection.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {collection.description || "Aucune description"}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />
                        <span>{collection.isPublic ? "Public" : "Privé"}</span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        <span>~{collection.items.length} cartes</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/collection/${collection.id}`);
                      }}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Voir la collection
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </PageWrapper>
  );
};

export default Page;
