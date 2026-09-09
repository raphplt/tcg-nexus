import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

describe("Table UI components", () => {
  it("renders a complete accessible table with header, body, footer, and caption", () => {
    render(
      <Table className="custom-table">
        <TableCaption>Test Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Header 1</TableHead>
            <TableHead>Header 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Cell 1</TableCell>
            <TableCell>Cell 2</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Footer Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByRole("table")).toHaveClass("custom-table");
    expect(screen.getByText("Test Caption")).toBeInTheDocument();
    expect(screen.getByText("Header 1")).toBeInTheDocument();
    expect(screen.getByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Footer Total")).toBeInTheDocument();
  });
});
