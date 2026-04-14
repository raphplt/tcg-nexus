"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Deck } from "@/types/Decks";
import { DeckAnalysis } from "@/types/deck-analysis";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import { DeckHeader } from "./_components/DeckHeader";
import { DeckStats } from "./_components/DeckStats";
import { DeckCards } from "./_components/DeckCards";
import { DeckAnalysisCard } from "./_components/DeckAnalysis";
import { DeckInfo } from "./_components/DeckInfo";
import { ShareDialog } from "./_components/ShareDialog";
import { ExportDialog, ExportFormat } from "./_components/ExportDialog";
import { DeckExportTemplate } from "./_components/DeckExportTemplate";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useRef } from "react";

export default function DeckDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const deckId = id as string;

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeImagesInExport, setIncludeImagesInExport] = useState(true);
  const [shareCode, setShareCode] = useState<string>("");
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, [deckId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => decksService.getDeckById(deckId),
  });

  const shareMutation = useMutation({
    mutationFn: () => decksService.shareDeck(Number(deckId)),
    onSuccess: (data) => {
      setShareCode(data.code);
      setShareDialogOpen(true);
      toast.success("Code de partage généré");
    },
    onError: () => {
      toast.error("Impossible de générer le code de partage");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => decksService.analyzeDeck(Number(deckId)),
    onSuccess: (result) => {
      setAnalysis(result);
      setAnalysisError(null);
      toast.success("Analyse terminée");
    },
    onError: () => {
      setAnalysisError("Impossible d'analyser le deck pour le moment.");
      toast.error("Impossible d'analyser le deck");
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => decksService.exportDeckJson(Number(deckId)),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Deck exporté avec succès");
    },
    onError: () => {
      toast.error("Impossible d'exporter le deck");
    },
  });

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const handleExportExecute = async (
    format: ExportFormat,
    includeImages: boolean,
  ) => {
    if (format === "json") {
      exportMutation.mutate();
      setExportDialogOpen(false);
      return;
    }

    setIncludeImagesInExport(includeImages);
    setIsExporting(true);

    try {
      // Small timeout to allow the template to re-render if includeImages changed
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!exportRef.current) {
        throw new Error("Template non trouvé");
      }

      const canvas = await html2canvas(exportRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
        logging: false,
      });

      const fileName = `${deck.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}`;

      if (format === "png") {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `${fileName}.png`;
        link.click();
      } else if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName}.pdf`);
      }

      toast.success(`Deck exporté au format ${format.toUpperCase()}`);
      setExportDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'exportation");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnalyze = () => {
    setAnalysisError(null);
    analyzeMutation.mutate();
  };

  const deck = data as Deck;
  const isOwner = user && deck?.user?.id === user.id;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Erreur lors du chargement du deck.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/5 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <DeckHeader
            deck={deck}
            isOwner={isOwner || false}
            onShare={handleShare}
            onExport={handleExportClick}
            isSharePending={shareMutation.isPending}
            isExportPending={exportMutation.isPending || isExporting}
          />
          <DeckStats deck={deck} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DeckCards deck={deck} />
          </div>

          <div className="space-y-6">
            <DeckAnalysisCard
              analysis={analysis}
              isLoading={analyzeMutation.isPending}
              error={analysisError}
              onAnalyze={handleAnalyze}
            />

            <DeckInfo deck={deck} isOwner={isOwner || false} />
          </div>
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareCode={shareCode}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExportExecute}
        isExporting={isExporting}
        deckName={deck.name}
      />

      {/* Hidden export template */}
      <div
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          zIndex: -1,
        }}
      >
        <DeckExportTemplate
          ref={exportRef}
          deck={deck}
          includeImages={includeImagesInExport}
        />
      </div>
    </div>
  );
}
