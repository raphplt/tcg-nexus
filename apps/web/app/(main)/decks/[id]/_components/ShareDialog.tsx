import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareCode: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  shareCode,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager le deck</DialogTitle>
          <DialogDescription>
            Partagez ce code avec d'autres joueurs pour qu'ils puissent importer
            votre deck
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={shareCode} readOnly className="font-mono text-lg" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(shareCode)}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ou partagez ce lien direct :
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={`${origin}/decks/import?code=${shareCode}`}
                readOnly
                className="text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() =>
                  copyToClipboard(
                    `${origin}/decks/import?code=${shareCode}`,
                  )
                }
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
