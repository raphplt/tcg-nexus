"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Image as ImageIcon, FileJson, Loader2 } from "lucide-react";

export type ExportFormat = "pdf" | "png" | "json";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat, includeImages: boolean) => void;
  isExporting: boolean;
  deckName: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isExporting,
  deckName,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const handleExport = () => {
    onExport(format, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exporter le deck</DialogTitle>
          <DialogDescription>
            Choisissez le format d'exportation pour le deck "{deckName}".
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">Format d'exportation</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Sélectionnez un format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-red-500" />
                    <span>Document PDF (.pdf)</span>
                  </div>
                </SelectItem>
                <SelectItem value="png">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <span>Image PNG (.png)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-amber-500" />
                    <span>Données JSON (.json)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              "Exporter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
