import React, { useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface MarketplacePaginationProps {
  meta: any;
  page: number;
  setPage: (page: number) => void;
}

const MarketplacePagination = ({
  meta,
  page,
  setPage,
}: MarketplacePaginationProps) => {
  const currentPage = meta?.currentPage || page;
  const totalPages = meta?.totalPages || 1;

  // Calcul du nombre de pages à afficher
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 7; // Nombre maximum de pages à afficher
    const sidePages = 2; // Nombre de pages de chaque côté de la page courante

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let startPage = Math.max(2, currentPage - sidePages);
      let endPage = Math.min(totalPages - 1, currentPage + sidePages);

      if (currentPage <= sidePages + 2) {
        endPage = Math.min(maxVisiblePages - 2, totalPages - 1);
      }

      if (currentPage >= totalPages - sidePages - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }

      if (startPage > 2) {
        pages.push("ellipsis");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (!meta || totalPages <= 1) return null;

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (meta.hasPreviousPage) {
                setPage(currentPage - 1);
              }
            }}
            aria-disabled={!meta.hasPreviousPage}
            tabIndex={!meta.hasPreviousPage ? -1 : 0}
            className={
              !meta.hasPreviousPage ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "ellipsis") {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                href="#"
                isActive={currentPage === pageNum}
                onClick={(e) => {
                  e.preventDefault();
                  setPage(pageNum);
                }}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (meta.hasNextPage) {
                setPage(currentPage + 1);
              }
            }}
            aria-disabled={!meta.hasNextPage}
            tabIndex={!meta.hasNextPage ? -1 : 0}
            className={
              !meta.hasNextPage ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default MarketplacePagination;
