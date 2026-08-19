import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";

describe("Pagination components", () => {
  describe("Primitive UI components", () => {
    it("renders full pagination structure with active link and ellipsis", () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#prev" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#1" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#next" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>,
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("More pages")).toBeInTheDocument();

      const activeLink = screen.getByText("1");
      expect(activeLink).toHaveAttribute("aria-current", "page");
    });
  });

  describe("PaginatedNav component", () => {
    it("renders nothing when totalPages <= 1", () => {
      const { container } = render(
        <PaginatedNav
          meta={{
            currentPage: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          }}
          page={1}
          onPageChange={vi.fn()}
        />,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("renders pages and handles click events", () => {
      const onPageChange = vi.fn();
      render(
        <PaginatedNav
          meta={{
            currentPage: 2,
            totalPages: 5,
            hasPreviousPage: true,
            hasNextPage: true,
          }}
          page={2}
          onPageChange={onPageChange}
          scrollToTop={false}
        />,
      );

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();

      // Click page 3
      fireEvent.click(screen.getByText("3"));
      expect(onPageChange).toHaveBeenCalledWith(3);

      // Click next page
      fireEvent.click(screen.getByLabelText("Go to next page"));
      expect(onPageChange).toHaveBeenCalledWith(3);

      // Click previous page
      fireEvent.click(screen.getByLabelText("Go to previous page"));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("renders ellipsis when total pages exceed visible window", () => {
      render(
        <PaginatedNav
          meta={{
            currentPage: 5,
            totalPages: 10,
            hasPreviousPage: true,
            hasNextPage: true,
          }}
          page={5}
          onPageChange={vi.fn()}
        />,
      );

      const ellipses = screen.getAllByText("More pages");
      expect(ellipses.length).toBeGreaterThan(0);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });
});
