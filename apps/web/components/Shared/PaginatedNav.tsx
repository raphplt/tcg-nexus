"use client";

import { useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface PaginatedNavProps {
  meta: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  scrollToTop?: boolean;
  className?: string;
}

export function PaginatedNav({
  meta,
  page,
  onPageChange,
  scrollToTop = true,
  className,
}: PaginatedNavProps) {
  const currentPage = meta?.currentPage || page;
  const totalPages = meta?.totalPages || 1;

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 7;
    const sidePages = 2;

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

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Pagination className={cn("mt-8", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (meta.hasPreviousPage) {
                handlePageChange(currentPage - 1);
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
                  handlePageChange(pageNum);
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
                handlePageChange(currentPage + 1);
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
}
