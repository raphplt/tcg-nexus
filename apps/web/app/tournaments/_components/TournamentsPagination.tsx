import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface TournamentsPaginationProps {
  meta: any;
  page: number;
  setPage: (page: number) => void;
}

export function TournamentsPagination({
  meta,
  page,
  setPage,
}: TournamentsPaginationProps) {
  if (!meta) return null;
  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page - 1);
            }}
            aria-disabled={!meta.hasPreviousPage}
            tabIndex={!meta.hasPreviousPage ? -1 : 0}
            className={
              !meta.hasPreviousPage ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
        {Array.from({ length: meta.totalPages }, (_, i) => (
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={meta.currentPage === i + 1}
              onClick={(e) => {
                e.preventDefault();
                setPage(i + 1);
              }}
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page + 1);
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
}
