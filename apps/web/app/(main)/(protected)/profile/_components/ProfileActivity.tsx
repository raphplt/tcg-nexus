import React from "react";
import { Card } from "@/components/ui/card";
import { Activity, Trophy, ShoppingBag, Plus } from "lucide-react";

export const ProfileActivity = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Activité récente</h2>
      </div>

      <div className="space-y-6">
        <div className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Participation au tournoi &ldquo;Spring Championship&rdquo;
              </span>
              <span className="text-xs text-muted-foreground">
                Il y a 2 jours
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Trophy className="w-3 h-3 mr-1" />
              <span>Terminé 1er</span>
            </div>
          </div>
        </div>

        <div className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-green-500" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Victoire contre Jean Dupont</span>
              <span className="text-xs text-muted-foreground">
                Il y a 1 semaine
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Match classé - Score 2-0
            </p>
          </div>
        </div>

        <div className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-blue-500" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Nouveau deck créé : &ldquo;Dragon Rush&rdquo;
              </span>
              <span className="text-xs text-muted-foreground">
                Il y a 2 semaines
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Plus className="w-3 h-3 mr-1" />
              <span>60 cartes ajoutées</span>
            </div>
          </div>
        </div>

        <div className="relative pl-6 border-l-2 border-muted last:pb-0">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-orange-500" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Vente réussie : Charizard VMAX</span>
              <span className="text-xs text-muted-foreground">
                Il y a 3 semaines
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <ShoppingBag className="w-3 h-3 mr-1" />
              <span>Vendu pour 150€</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
