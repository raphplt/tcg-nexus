"use client";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loader from "@/components/Layout/Loader";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileActivity } from "./ProfileActivity";
import { ProfileTournaments } from "./ProfileTournaments";
import { ProfileSales } from "./ProfileSales";
import { toast } from "react-hot-toast";

const MainProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // TODO: Implémenter la sauvegarde des modifications
    toast.success("Profil mis à jour avec succès");
    setIsEditing(false);
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
      <ProfileHeader
        user={user}
        isEditing={isEditing}
        onEditToggle={handleEditToggle}
        onSave={handleSave}
      />

      <Tabs
        defaultValue="overview"
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="tournaments">Tournois</TabsTrigger>
          <TabsTrigger value="sales">Ventes</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProfileActivity />
            </div>
            <div className="space-y-6">
              <ProfileStats />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tournaments">
          <ProfileTournaments />
        </TabsContent>

        <TabsContent value="sales">
          <ProfileSales />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainProfile;
