import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Trash2, Pencil } from "lucide-react";
import type { PaginatedResult } from "@/types/pagination";
import { useRouter } from "next/navigation";
import { Deck } from "@/types/Decks";
import { Button } from "@components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { decksService } from "@/services/decks.service";
import { toast } from "react-hot-toast";
export interface DecksFilters {
  search: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface DecksTableProps {
  data: PaginatedResult<Deck> | undefined;
  dataLoading: boolean;
  error: Error | null;
  tableHeaders: { label: string; key: keyof Deck | string }[];
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  setFilters: (filters: Partial<DecksFilters>) => void;
}

const DecksTable = ({
  data,
  dataLoading,
  error,
  tableHeaders,
  sortBy,
  sortOrder,
  setFilters,
}: DecksTableProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<null | number>(null);
  const [deckList, setDeckList] = useState<Deck[]>(data?.data || []);
  const { user, isLoading } = useAuth();

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setFilters({ sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    } else {
      setFilters({ sortBy: key, sortOrder: "ASC" });
    }
  };

  const deleteDeck = async (id: number | null) => {
    if (!id) return;

    try {
      const response = await decksService.removeDeck(id);
      if (response) {
        toast.success(response?.message || "Deck supprimé avec succès.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création du deck");
    } finally {
      setDeckList((prev) => prev.filter((deck) => deck.id !== id));
      setOpen(false);
    }
  };
  useEffect(() => {
    setDeckList(data?.data || []);
  }, [data]);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableHead
                key={header.key}
                onClick={() => handleSort(header.key)}
                className="cursor-pointer select-none group"
              >
                <span className="inline-flex items-center gap-1">
                  {header.label}
                  {sortBy === header.key &&
                    (sortOrder === "ASC" ? (
                      <ArrowUp className="w-3 h-3 text-primary group-hover:text-primary/80" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-primary group-hover:text-primary/80" />
                    ))}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading || dataLoading ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-lg animate-pulse"
              >
                Chargement des decks...
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-destructive py-8"
              >
                Erreur lors du chargement des decks.
              </TableCell>
            </TableRow>
          ) : deckList.length ? (
            deckList.map((deck: Deck) => (
              <TableRow
                key={deck.id}
                className="transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer group"
                onClick={() => router.push(`/decks/${deck.id}`)}
              >
                <TableCell className="font-semibold text-lg text-primary flex items-center gap-2">
                  {deck?.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{deck.format.type}</Badge>
                </TableCell>
                {user && deck.user && user.id === deck.user.id && (
                  <TableCell className="align-content-end">
                    <div className="opacity-0 group-hover:opacity-100 transition flex justify-end pr-2">
                      <Button
                        className="mr-2"
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/decks/${deck.id}/update`);
                        }}
                        type="button"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(true);
                          setSelectedDeckId(deck.id);
                        }}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                Aucun deck trouvée.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement le
              deck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDeck(selectedDeckId)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DecksTable;
