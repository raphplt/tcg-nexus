import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface PaginationMeta {
  totalPages: number;
  currentPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface DecksPaginationProps {
  meta: PaginationMeta | null;
  page: number;
  setPage: (page: number) => void;
}

const DecksPagination = ({ meta, page, setPage }: DecksPaginationProps) => {
  if (!meta) return null;
  if (meta.totalPages < 2) return null;
  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(page - 1);
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
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
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
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
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
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

export default DecksPagination;
