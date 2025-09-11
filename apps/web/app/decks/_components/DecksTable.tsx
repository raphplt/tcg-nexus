import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Listing } from "@/types/listing";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { PaginatedResult } from "@/types/pagination";
import { useRouter } from "next/navigation";
import {Decks} from "@/types/Decks";

export interface DecksFilters {
  search: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface DecksTableProps {
  data: PaginatedResult<Decks> | undefined;
  isLoading: boolean;
  error: Error | null;
  tableHeaders: { label: string; key: keyof Decks | string }[];
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  setFilters: (filters: Partial<DecksFilters>) => void;
}

const DecksTable = ({
                            data,
                            isLoading,
                            error,
                            tableHeaders,
                            sortBy,
                            sortOrder,
                            setFilters,
                          }: DecksTableProps) => {
  const router = useRouter();

    type NestedKeys<T> = {
        [K in keyof T & string]: T[K] extends object
            ? `${K}` | `${K}.${NestedKeys<T[K]>}`
            : `${K}`;
    }[keyof T & string];

    type DeckKeys = NestedKeys<Decks>;

    function getValueByPath<T, K extends NestedKeys<T>>(obj: T, path: K): any {
        return path.split(".").reduce((acc, part) => acc?.[part], obj as any);
    }

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setFilters({ sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    } else {
      setFilters({ sortBy: key, sortOrder: "ASC" });
    }
  };

  return (
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
        {isLoading ? (
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
        ) : data?.data?.length ? (
          data.data.map((deck: Decks) => (
            <TableRow
              key={deck.id}
              className="transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer"
              onClick={() => router.push(`/deck/${deck.id}`)}
            >
              <TableCell className="font-semibold text-lg text-primary flex items-center gap-2">
                {deck?.name}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                >
                  {deck.format.type}
                </Badge>
              </TableCell>
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
  );
};

export default DecksTable;
