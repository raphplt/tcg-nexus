"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Swords, Coffee, Clock, CheckCircle } from "lucide-react";
import { SwissPairing, Match } from "@/types/tournament";

interface SwissPairingsProps {
  pairings: SwissPairing | Match[];
  currentRound: number;
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

interface PairingRowProps {
  pairing: {
    playerA: { id: number; name: string };
    playerB?: { id: number; name: string };
    tableNumber: number;
    matchId?: number;
    status?: string;
  };
  onMatchClick?: (matchId: number) => void;
  interactive?: boolean;
}

function PairingRow({
  pairing,
  onMatchClick,
  interactive = true,
}: PairingRowProps) {
  const isBye = !pairing.playerB;
  const isFinished = pairing.status === "finished";
  const isInProgress = pairing.status === "in_progress";

  const getStatusIcon = () => {
    if (isFinished) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (isInProgress) return <Clock className="w-4 h-4 text-blue-500" />;
    return <Swords className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = () => {
    if (isBye) return <Badge variant="outline">Bye</Badge>;
    if (isFinished) return <Badge variant="default">Terminé</Badge>;
    if (isInProgress) return <Badge variant="secondary">En cours</Badge>;
    return <Badge variant="outline">Programmé</Badge>;
  };

  return (
    <TableRow
      className={`${interactive && pairing.matchId ? "hover:bg-muted/50 cursor-pointer" : ""} ${
        isBye ? "opacity-60" : ""
      }`}
      onClick={() => {
        if (interactive && pairing.matchId && onMatchClick) {
          onMatchClick(pairing.matchId);
        }
      }}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          Table {pairing.tableNumber}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-sm">
              {pairing.playerA.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{pairing.playerA.name}</span>
        </div>
      </TableCell>

      <TableCell className="text-center">
        {isBye ? (
          <Coffee className="w-5 h-5 mx-auto text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground font-bold">VS</span>
        )}
      </TableCell>

      <TableCell>
        {pairing.playerB ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-sm">
                {pairing.playerB.name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{pairing.playerB.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coffee className="w-4 h-4" />
            <span className="italic">Bye</span>
          </div>
        )}
      </TableCell>

      <TableCell>{getStatusBadge()}</TableCell>

      <TableCell>
        {interactive && pairing.matchId && (
          <Button
            variant="outline"
            size="sm"
          >
            Gérer
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function SwissPairings({
  pairings,
  currentRound,
  onMatchClick,
  interactive = true,
}: SwissPairingsProps) {
  // Convertir les données selon le format reçu
  const pairingData = "pairings" in pairings ? pairings.pairings : pairings;

  // Transformer les matches en format de paires si nécessaire
  const formattedPairings = Array.isArray(pairingData)
    ? pairingData.map((item, index) => {
        if ("playerA" in item && "playerB" in item) {
          // Format SwissPairing
          return {
            playerA: item.playerA,
            playerB: item.playerB,
            tableNumber: item.tableNumber,
            matchId: undefined,
            status: "scheduled",
          };
        } else {
          // Format Match
          const match = item as any;
          return {
            playerA: match.playerA,
            playerB: match.playerB,
            tableNumber: index + 1,
            matchId: match.id,
            status: match.status,
          };
        }
      })
    : [];

  const byeCount = formattedPairings.filter((p) => !p.playerB).length;
  const activeMatches = formattedPairings.filter((p) => p.playerB).length;

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Paires Swiss - Round {currentRound}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {activeMatches}
              </div>
              <div className="text-sm text-muted-foreground">
                Matches actifs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {byeCount}
              </div>
              <div className="text-sm text-muted-foreground">Byes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formattedPairings.length}
              </div>
              <div className="text-sm text-muted-foreground">Total paires</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des paires */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Joueur A</TableHead>
                <TableHead className="text-center">-</TableHead>
                <TableHead>Joueur B</TableHead>
                <TableHead>Statut</TableHead>
                {interactive && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {formattedPairings.length > 0 ? (
                formattedPairings.map((pairing, index) => (
                  <PairingRow
                    key={`${currentRound}-${index}`}
                    pairing={pairing}
                    onMatchClick={onMatchClick}
                    interactive={interactive}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={interactive ? 6 : 5}
                    className="text-center py-8"
                  >
                    <div className="text-muted-foreground">
                      <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune paire générée pour ce round</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Informations Swiss */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informations Swiss System</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Les paires sont générées selon les points actuels</p>
          <p>• Les joueurs ne s'affrontent qu'une seule fois</p>
          <p>• Un bye donne automatiquement la victoire (3 points)</p>
          <p>• Victoire = 3 points, Égalité = 1 point, Défaite = 0 point</p>
        </CardContent>
      </Card>
    </div>
  );
}
